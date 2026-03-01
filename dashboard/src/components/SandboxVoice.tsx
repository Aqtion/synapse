"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const WS_PATH = "/ws/stt";
const TARGET_SAMPLE_RATE = 16000;

/** Minimum character length for a segment to be sent (avoids empty/filler). */
const MIN_SEGMENT_LENGTH = 2;
/** Patterns that are considered garbage and should not be sent. */
const GARBAGE_REGEX = /^(?:um+|uh+|hm+|ah+|oh+|like|yeah|nope|okay|ok\s*)$|^[\s.,?!\-–—;:'"]+$/i;

function normalizeSegment(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

/** Returns the segment to send, or null if it's empty/garbage and should not be sent downstream. */
function filterGarbageAndEmpty(raw: string): string | null {
  const s = normalizeSegment(raw);
  if (s.length < MIN_SEGMENT_LENGTH) return null;
  if (GARBAGE_REGEX.test(s)) return null;
  return s;
}

function getWsUrl(): string {
  if (typeof window === "undefined") return "";
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}${WS_PATH}`;
}

function downsampleTo16k(float32: Float32Array, sourceSampleRate: number): Int16Array {
  const ratio = sourceSampleRate / TARGET_SAMPLE_RATE;
  const outLength = Math.floor(float32.length / ratio);
  const out = new Int16Array(outLength);
  for (let i = 0; i < outLength; i++) {
    const srcIndex = i * ratio;
    const idx = Math.floor(srcIndex);
    const frac = srcIndex - idx;
    const next = idx + 1 < float32.length ? float32[idx + 1] : float32[idx];
    const sample = float32[idx] * (1 - frac) + next * frac;
    const s16 = Math.max(-32768, Math.min(32767, Math.round(sample * 32767)));
    out[i] = s16;
  }
  return out;
}

function int16ToBase64(int16: Int16Array): string {
  const u8 = new Uint8Array(int16.buffer, int16.byteOffset, int16.byteLength);
  let binary = "";
  for (let i = 0; i < u8.length; i++) binary += String.fromCharCode(u8[i]);
  return btoa(binary);
}

type SandboxVoiceProps = {
  sandboxId: string;
  workerBaseUrl: string;
};

export function SandboxVoice({ sandboxId, workerBaseUrl }: SandboxVoiceProps) {
  const [transcriptLines, setTranscriptLines] = useState<string[]>([]);
  const [isMicDown, setIsMicDown] = useState(false);
  const [sttError, setSttError] = useState<string | null>(null);
  const [ttsPlaying, setTtsPlaying] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const isMicDownRef = useRef(false);
  const currentPartialRef = useRef("");
  const segmentLinesRef = useRef<string[]>([]);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountRef = useRef(true);

  const getIframe = useCallback(() => {
    return document.getElementById("sandboxFrame") as HTMLIFrameElement | null;
  }, []);

  const appendTranscript = useCallback((text: string, isPartial: boolean) => {
    if (!text.trim()) return;
    if (isPartial) {
      currentPartialRef.current = text;
      setTranscriptLines((prev) => {
        const rest = prev.slice(0, -1);
        const last = prev[prev.length - 1];
        if (last !== undefined && last.startsWith("…")) return [...rest, "… " + text];
        return [...prev, "… " + text];
      });
      return;
    }
    currentPartialRef.current = "";
    setTranscriptLines((prev) => {
      const rest = prev.slice(0, -1).filter((l) => !l.startsWith("…"));
      return [...rest, text];
    });
    if (isMicDownRef.current) segmentLinesRef.current = [...segmentLinesRef.current, text];
  }, []);

  useEffect(() => {
    mountRef.current = true;
    return () => {
      mountRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const url = getWsUrl();
    if (!url) return;

    function connect() {
      if (!mountRef.current || wsRef.current?.readyState === WebSocket.OPEN) return;
      const ws = new WebSocket(url);
      wsRef.current = ws;
      setSttError(null);

      ws.onopen = () => {
        if (cancelled || !mountRef.current) return;
        setIsListening(true);
      };

      ws.onmessage = (event) => {
        if (cancelled) return;
        try {
          const msg = JSON.parse(event.data as string);
          if (msg.type === "partial_transcript" && msg.text != null) {
            appendTranscript(msg.text, true);
          } else if (msg.type === "committed_transcript" && msg.text != null) {
            appendTranscript(msg.text, false);
          } else if (msg.type === "error") {
            setSttError(msg.message || "STT error");
          } else if (msg.type === "upstream_closed") {
            const reason = String(msg.reason ?? "");
            const isNormalClose = /\(1000\)|normal/i.test(reason);
            if (!isNormalClose) setSttError(reason || "STT connection closed");
            else setSttError(null);
          }
        } catch (_) {
          // ignore
        }
      };

      ws.onclose = () => {
        if (!cancelled) setIsListening(false);
        wsRef.current = null;
        if (cancelled || !mountRef.current) return;
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectTimeoutRef.current = null;
          connect();
        }, 2000);
      };

      ws.onerror = () => {
        if (!cancelled) setSttError("WebSocket error");
      };
    }

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.close();
      wsRef.current = null;
    };
  }, [appendTranscript]);

  useEffect(() => {
    if (!isListening || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    let audioContext: AudioContext | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    let processor: ScriptProcessorNode | null = null;

    navigator.mediaDevices
      .getUserMedia({ audio: { channelCount: 1, sampleRate: 16000 } })
      .then((stream) => {
        streamRef.current = stream;
        const ctx = new AudioContext({ sampleRate: 48000 });
        audioContextRef.current = ctx;
        audioContext = ctx;
        const src = ctx.createMediaStreamSource(stream);
        source = src;
        const bufferSize = 4096;
        const proc = ctx.createScriptProcessor(bufferSize, 1, 1);
        processor = proc;
        proc.onaudioprocess = (e) => {
          const ws = wsRef.current;
          if (!ws || ws.readyState !== WebSocket.OPEN) return;
          const input = e.inputBuffer.getChannelData(0);
          const int16 = downsampleTo16k(input, ctx.sampleRate);
          const b64 = int16ToBase64(int16);
          try {
            ws.send(JSON.stringify({ type: "input_audio_chunk", audioBase64: b64, sampleRate: TARGET_SAMPLE_RATE }));
          } catch (_) {}
        };
        src.connect(proc);
        proc.connect(ctx.destination);
      })
      .catch((err) => {
        setSttError(err.message || "Microphone access denied");
      });

    return () => {
      if (processor && source) {
        try {
          source.disconnect();
          processor.disconnect();
        } catch (_) {}
      }
      if (audioContext) audioContext.close();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      audioContextRef.current = null;
    };
  }, [isListening]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const d = event.data;
      if (!d || d.type !== "SANDBOX_RESPONSE" || typeof d.text !== "string") return;
      const text = d.text.trim();
      if (!text) return;

      setTtsPlaying(true);
      fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      })
        .then((res) => {
          if (!res.ok) throw new Error("TTS failed");
          return res.arrayBuffer();
        })
        .then((buf) => {
          const blob = new Blob([buf], { type: "audio/mpeg" });
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          audio.onended = () => {
            URL.revokeObjectURL(url);
            setTtsPlaying(false);
          };
          audio.onerror = () => {
            URL.revokeObjectURL(url);
            setTtsPlaying(false);
          };
          audio.play();
        })
        .catch(() => setTtsPlaying(false));
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const handleMicDown = useCallback(() => {
    isMicDownRef.current = true;
    currentPartialRef.current = "";
    segmentLinesRef.current = [];
    setTranscriptLines([]);
    setIsMicDown(true);
  }, []);

  const handleMicUp = useCallback(() => {
    if (!isMicDown) return;
    isMicDownRef.current = false;
    setIsMicDown(false);
    const segmentText = [...segmentLinesRef.current];
    if (currentPartialRef.current.trim()) segmentText.push(currentPartialRef.current);
    const raw = segmentText.join(" ").trim();
    const text = filterGarbageAndEmpty(raw);
    segmentLinesRef.current = [];
    currentPartialRef.current = "";
    if (text == null || !text) return;

    const iframe = getIframe();
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage({ type: "VOICE_PROMPT", text }, "*");
    }
  }, [isMicDown, getIframe]);

  const displayLines = transcriptLines;
  const popupContent = displayLines.length === 0 && !currentPartialRef.current ? "" : displayLines.join(" ");

  return (
    <>
      <div
        className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2"
        style={{ pointerEvents: "none" }}
        aria-hidden
      >
        <div
          className="pointer-events-auto flex max-h-[140px] min-h-[44px] w-[280px] flex-col overflow-hidden rounded-xl border border-border bg-background/95 shadow-lg backdrop-blur"
          role="log"
          aria-live="polite"
        >
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-2 text-sm text-muted-foreground">
            {sttError ? (
              <p className="text-destructive">{sttError}</p>
            ) : (
              <p className="whitespace-pre-wrap break-words">{popupContent || "Listening…"}</p>
            )}
          </div>
        </div>
        <button
          type="button"
          onMouseDown={handleMicDown}
          onMouseUp={handleMicUp}
          onMouseLeave={handleMicUp}
          onTouchStart={(e) => {
            e.preventDefault();
            handleMicDown();
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            handleMicUp();
          }}
          onTouchCancel={handleMicUp}
          disabled={!isListening || ttsPlaying}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-border bg-background shadow-md transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          style={{ pointerEvents: "auto" }}
          aria-label={isMicDown ? "Release to send" : "Hold to speak and send"}
        >
          {ttsPlaying ? (
            <span className="text-xs text-muted-foreground">…</span>
          ) : (
            <svg
              className={`h-5 w-5 text-foreground ${isMicDown ? "text-primary" : ""}`}
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
            </svg>
          )}
        </button>
      </div>
    </>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Minus, Plus } from "lucide-react";
import { runPrompt } from "@/lib/workerClient";
import { cn } from "@/lib/utils";

const SAMPLE_RATE = 16000;

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

export function SandboxVoice({ sandboxId }: { sandboxId: string }) {
  const [sttReady, setSttReady] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [transcript, setTranscript] = useState({ committed: "", partial: "" });
  const [isHolding, setIsHolding] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcriptMinimized, setTranscriptMinimized] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const workletRef = useRef<AudioWorkletNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const committedRef = useRef("");
  const partialRef = useRef("");
  const captureStartRef = useRef(0);
  const mountedRef = useRef(true);
  const transcriptBoxRef = useRef<HTMLDivElement>(null);

  const connectSTT = useCallback(async () => {
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: SAMPLE_RATE },
      });
    } catch {
      setStatus("Microphone access denied.");
      return;
    }
    if (!mountedRef.current) {
      stream.getTracks().forEach((t) => t.stop());
      return;
    }
    streamRef.current = stream;

    const ctx = new AudioContext({ sampleRate: SAMPLE_RATE });
    audioCtxRef.current = ctx;

    try {
      await ctx.audioWorklet.addModule("/audio-processor.js");
    } catch {
      setStatus("Failed to load audio processor.");
      stream.getTracks().forEach((t) => t.stop());
      return;
    }

    const source = ctx.createMediaStreamSource(stream);
    const worklet = new AudioWorkletNode(ctx, "pcm-processor");
    sourceRef.current = source;
    workletRef.current = worklet;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/stt`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    committedRef.current = "";
    partialRef.current = "";

    ws.onopen = () => {
      setSttReady(true);
      setStatus(null);
    };

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data as string) as { type?: string; text?: string };
        if (msg.type === "partial_transcript") {
          partialRef.current = msg.text ?? "";
          setTranscript((prev) => ({ ...prev, partial: partialRef.current }));
        } else if (msg.type === "committed_transcript") {
          const text = msg.text ?? "";
          committedRef.current += (committedRef.current ? " " : "") + text;
          partialRef.current = "";
          setTranscript({ committed: committedRef.current, partial: "" });
        } else if (msg.type === "error") {
          setStatus(`Error: ${(msg as { message?: string }).message ?? "Unknown"}`);
        }
      } catch {}
    };

    ws.onclose = () => {
      setSttReady(false);
      if (mountedRef.current) {
        setTimeout(() => {
          if (mountedRef.current) connectSTT();
        }, 2000);
      }
    };

    ws.onerror = () => {
      ws.close();
    };

    worklet.port.onmessage = (e: MessageEvent<ArrayBuffer>) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: "input_audio_chunk",
            audioBase64: toBase64(e.data),
            sampleRate: ctx.sampleRate,
          }),
        );
      }
    };

    source.connect(worklet);
    worklet.connect(ctx.destination);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    connectSTT();
    return () => {
      mountedRef.current = false;
      workletRef.current?.disconnect();
      sourceRef.current?.disconnect();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      audioCtxRef.current?.close();
      wsRef.current?.close();
    };
  }, [connectSTT]);

  const onHoldStart = useCallback(() => {
    if (isProcessing) return;
    captureStartRef.current = committedRef.current.length;
    setIsHolding(true);
  }, [isProcessing]);

  const onHoldEnd = useCallback(async () => {
    if (!isHolding) return;
    setIsHolding(false);

    const newCommitted = committedRef.current.slice(captureStartRef.current);
    const captured = (newCommitted + (partialRef.current ? " " + partialRef.current : "")).trim();

    if (!captured) {
      setStatus("No speech captured.");
      setTimeout(() => setStatus(null), 2000);
      return;
    }

    setIsProcessing(true);
    setStatus("Asking sandbox…");

    try {
      const result = await runPrompt({ sandboxId, prompt: captured });

      let message: string;
      if ("success" in result && result.success) {
        const parts = [
          ...(result.written ?? []),
          ...(result.deleted ?? []).map((f) => `${f} (deleted)`),
        ];
        message = parts.length
          ? `Updated ${parts.length} file(s): ${parts.join(", ")}`
          : "No files changed.";
      } else {
        message = `Error: ${"error" in result ? result.error : "Unknown error"}`;
      }

      const iframe = document.getElementById("sandboxFrame") as HTMLIFrameElement | null;
      if (iframe) iframe.src = iframe.src;

      setStatus("Speaking…");
      const ttsRes = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: message }),
      });
      if (ttsRes.ok) {
        const blob = await ttsRes.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.onended = () => URL.revokeObjectURL(url);
        await audio.play();
      }
      setStatus(null);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setStatus(`Error: ${errMsg}`);
      try {
        const ttsRes = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: `Error: ${errMsg}` }),
        });
        if (ttsRes.ok) {
          const blob = await ttsRes.blob();
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          audio.onended = () => URL.revokeObjectURL(url);
          await audio.play();
        }
      } catch {}
    } finally {
      setIsProcessing(false);
    }
  }, [isHolding, sandboxId]);

  const displayTranscript = transcript.committed + (transcript.partial ? ` ${transcript.partial}` : "");

  useEffect(() => {
    const el = transcriptBoxRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [transcript]);

  return (
    <>
      {isProcessing && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(11,13,17,.85)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 14,
            zIndex: 40,
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              border: "3px solid #252a35",
              borderTopColor: "#8187de",
              borderRadius: "50%",
              animation: "voice-spin .8s linear infinite",
            }}
          />
          <p style={{ fontSize: 13, color: "#7a8194" }}>
            {status === "Speaking…" ? "Speaking…" : "AI is updating your app…"}
          </p>
          <style>{`@keyframes voice-spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
        {!isProcessing && sttReady && (
          <div
            className="rounded-lg border border-border bg-background/95 shadow-lg backdrop-blur overflow-hidden transition-all"
            style={{ width: 260 }}
          >
            <div
              className="flex items-center justify-between px-3 py-1.5 border-b border-border cursor-pointer select-none"
              onClick={() => setTranscriptMinimized((v) => !v)}
            >
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                Transcript
              </span>
              {transcriptMinimized ? (
                <Plus className="size-3 text-muted-foreground" />
              ) : (
                <Minus className="size-3 text-muted-foreground" />
              )}
            </div>
            {!transcriptMinimized && (
              <div
                ref={transcriptBoxRef}
                className="px-3 py-2 text-xs leading-relaxed text-muted-foreground overflow-y-auto"
                style={{ maxHeight: 140 }}
              >
                {displayTranscript ? (
                  <p>
                    {transcript.committed && <span>{transcript.committed}</span>}
                    {transcript.partial && (
                      <span className="italic text-muted-foreground/80"> {transcript.partial}</span>
                    )}
                    <span className="ml-0.5 inline-block h-3 w-0.5 animate-pulse bg-primary" />
                  </p>
                ) : (
                  <p className="italic">Listening…</p>
                )}
              </div>
            )}
          </div>
        )}
        {!isProcessing && status && (
          <div className="rounded-lg border border-border bg-background/95 px-3 py-2 text-sm shadow-lg backdrop-blur" style={{ width: 260 }}>
            <p className="text-muted-foreground text-xs">{status}</p>
          </div>
        )}
        <button
          type="button"
          onMouseDown={onHoldStart}
          onMouseUp={onHoldEnd}
          onMouseLeave={() => { if (isHolding) onHoldEnd(); }}
          onTouchStart={onHoldStart}
          onTouchEnd={onHoldEnd}
          disabled={isProcessing || !sttReady}
          title="Hold to capture voice for AI"
          className={cn(
            "flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 shadow-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50",
            isHolding
              ? "border-red-500 bg-red-500 text-white scale-110"
              : sttReady
                ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
                : "border-muted bg-muted text-muted-foreground",
          )}
        >
          <Mic className="size-6" strokeWidth={2} />
        </button>
      </div>
    </>
  );
}

"use client";

import { useCallback, useRef, useState } from "react";
import { Mic } from "lucide-react";
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
  const [isListening, setIsListening] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [transcript, setTranscript] = useState({ committed: "", partial: "" });
  const [isProcessing, setIsProcessing] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const workletRef = useRef<AudioWorkletNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const committedRef = useRef("");

  const stopListening = useCallback(() => {
    workletRef.current?.disconnect();
    sourceRef.current?.disconnect();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    audioCtxRef.current?.close();
    wsRef.current?.close();
    streamRef.current = null;
    sourceRef.current = null;
    workletRef.current = null;
    audioCtxRef.current = null;
    wsRef.current = null;
    setIsListening(false);
    setStatus(null);
    setTranscript({ committed: committedRef.current, partial: "" });
  }, []);

  const startListening = useCallback(async () => {
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: SAMPLE_RATE },
      });
    } catch {
      setStatus("Microphone access denied.");
      return;
    }
    streamRef.current = stream;

    const ctx = new AudioContext({ sampleRate: SAMPLE_RATE });
    audioCtxRef.current = ctx;

    try {
      await ctx.audioWorklet.addModule("/audio-processor.js");
    } catch (e) {
      setStatus("Failed to load audio processor.");
      stream.getTracks().forEach((t) => t.stop());
      return;
    }

    const source = ctx.createMediaStreamSource(stream);
    const worklet = new AudioWorkletNode(ctx, "pcm-processor");
    sourceRef.current = source;
    workletRef.current = worklet;

    const protocol = typeof window !== "undefined" && window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/stt`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    committedRef.current = "";

    ws.onopen = () => {
      setStatus("Listening…");
    };

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data as string) as { type?: string; text?: string };
        if (msg.type === "partial_transcript") {
          setTranscript((prev) => ({ ...prev, partial: msg.text ?? "" }));
        } else if (msg.type === "committed_transcript") {
          const text = msg.text ?? "";
          committedRef.current += (committedRef.current ? " " : "") + text;
          setTranscript((prev) => ({ committed: committedRef.current, partial: "" }));
        } else if (msg.type === "error") {
          setStatus(`Error: ${(msg as { message?: string }).message ?? "Unknown"}`);
          stopListening();
        }
      } catch (_) {}
    };

    ws.onclose = () => {
      if (streamRef.current) stopListening();
    };

    worklet.port.onmessage = (e: MessageEvent<ArrayBuffer>) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: "input_audio_chunk",
            audioBase64: toBase64(e.data),
            sampleRate: ctx.sampleRate,
          })
        );
      }
    };

    source.connect(worklet);
    worklet.connect(ctx.destination);
    setIsListening(true);
    setTranscript({ committed: "", partial: "" });
  }, [stopListening]);

  const handleMicClick = useCallback(async () => {
    if (isProcessing) return;

    if (isListening) {
      stopListening();
      const finalTranscript = committedRef.current.trim();
      if (!finalTranscript) {
        setStatus("No speech detected.");
        return;
      }

      setIsProcessing(true);
      setStatus("Asking sandbox…");

      try {
        const result = await runPrompt({
          sandboxId,
          prompt: finalTranscript,
        });

        let message: string;
        if (result.success) {
          const parts = [...(result.written ?? []), ...(result.deleted ?? []).map((f) => `${f} (deleted)`)];
          message = parts.length
            ? `Updated ${parts.length} file(s): ${parts.join(", ")}`
            : "No files changed.";
        } else {
          message = `Error: ${result.error ?? "Unknown error"}`;
        }

        setStatus("Speaking…");
        const ttsRes = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: message }),
        });
        if (!ttsRes.ok) {
          setStatus("TTS failed.");
          return;
        }
        const blob = await ttsRes.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.onended = () => URL.revokeObjectURL(url);
        await audio.play();
        setStatus(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setStatus(`Error: ${message}`);
        try {
          const ttsRes = await fetch("/api/tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: `Error: ${message}` }),
          });
          if (ttsRes.ok) {
            const blob = await ttsRes.blob();
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            audio.onended = () => URL.revokeObjectURL(url);
            await audio.play();
          }
        } catch (_) {}
      } finally {
        setIsProcessing(false);
      }
    } else {
      await startListening();
    }
  }, [isListening, isProcessing, sandboxId, startListening, stopListening]);

  const displayTranscript = transcript.committed + (transcript.partial ? ` ${transcript.partial}` : "");

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      {(status || displayTranscript) && (
        <div className="max-w-sm rounded-lg border border-border bg-background/95 px-3 py-2 text-sm shadow-lg backdrop-blur">
          {displayTranscript && (
            <p className="text-muted-foreground">
              {transcript.committed && <span>{transcript.committed}</span>}
              {transcript.partial && (
                <span className="italic text-muted-foreground/80"> {transcript.partial}</span>
              )}
              {isListening && <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-primary" />}
            </p>
          )}
          {status && <p className="text-muted-foreground">{status}</p>}
        </div>
      )}
      <button
        type="button"
        onClick={handleMicClick}
        disabled={isProcessing}
        title={isListening ? "Release to send" : "Hold to speak"}
        className={cn(
          "flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 shadow-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50",
          isListening
            ? "border-red-500 bg-red-500/20 text-red-600 dark:text-red-400"
            : "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
        )}
      >
        <Mic className="size-6" strokeWidth={2} />
      </button>
    </div>
  );
}

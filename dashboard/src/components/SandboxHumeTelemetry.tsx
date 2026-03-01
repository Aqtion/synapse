"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useHumeStream } from "@/ux_telemetry";
import type { HumeEmotionMap, HumeStreamMessage } from "@/ux_telemetry";

type SandboxHumeTelemetryProps = {
  sandboxId: string;
  /** Called when emotion data is received (e.g. for future Convex write). */
  onEmotionSample?: (emotions: HumeEmotionMap, raw: HumeStreamMessage) => void;
};

/** Min margin between pos/neg for green or red; otherwise yellow (neutral). */
const EMOTION_MARGIN = 0.22;

/** Maps Hume emotion scores to a single dot color: green (positive), yellow (neutral), red (negative). */
function emotionToDotColor(emotions: HumeEmotionMap): "green" | "yellow" | "red" {
  const entries = Object.entries(emotions);
  if (entries.length === 0) return "yellow";

  const positive = ["Joy", "Excitement", "Amusement", "Contentment", "Interest", "Admiration", "Love", "Relief"];
  const negative = ["Anger", "Frustration", "Confusion", "Disgust", "Fear", "Distress", "Sadness", "Surprise"];

  let posScore = 0;
  let negScore = 0;
  for (const [name, score] of entries) {
    if (positive.some((p) => name.toLowerCase().includes(p.toLowerCase()))) posScore += score;
    if (negative.some((n) => name.toLowerCase().includes(n.toLowerCase()))) negScore += score;
  }

  const diff = posScore - negScore;
  if (diff >= EMOTION_MARGIN) return "green";
  if (diff <= -EMOTION_MARGIN) return "red";
  return "yellow";
}

/**
 * Runs Hume AI emotion capture for the sandbox session. Shows a small Zoom-like
 * video feed in the top-right with a green/yellow/red dot overlay based on emotion.
 */
export function SandboxHumeTelemetry({
  sandboxId,
  onEmotionSample,
}: SandboxHumeTelemetryProps) {
  const onEmotionSampleRef = useRef(onEmotionSample);
  onEmotionSampleRef.current = onEmotionSample;

  const [dotColor, setDotColor] = useState<"green" | "yellow" | "red">("yellow");

  const onMessage = useCallback((emotions: HumeEmotionMap, raw: HumeStreamMessage) => {
    onEmotionSampleRef.current?.(emotions, raw);
    setDotColor(emotionToDotColor(emotions));
  }, []);

  const { start, stop, videoRef, status, error } = useHumeStream({
    maxFps: 2,
    onMessage,
    onError: (e) => {
      // if (process.env.NODE_ENV === "development") {
      //   console.warn("[SandboxHumeTelemetry]", e.message);
      // }
      void e;
    },
    enabled: true,
    debug: process.env.NODE_ENV === "development",
  });

  const [mounted, setMounted] = useState(false);
  const startRef = useRef(start);
  const stopRef = useRef(stop);
  startRef.current = start;
  stopRef.current = stop;

  // Single effect with empty deps: run once on mount, cleanup once on unmount.
  // Refs avoid effect re-running when start/stop identity changes (which would close the WebSocket).
  // Defer start so Strict Mode's first cleanup only clears the timeout and doesn't close a live WS.
  useEffect(() => {
    setMounted(true);
    const START_DELAY_MS = 300;
    const timeoutId = window.setTimeout(() => {
      startRef.current();
    }, START_DELAY_MS);
    return () => {
      window.clearTimeout(timeoutId);
      stopRef.current();
    };
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const handleUnload = () => {
      stopRef.current();
    };
    window.addEventListener("beforeunload", handleUnload);
    window.addEventListener("pagehide", handleUnload);
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      window.removeEventListener("pagehide", handleUnload);
    };
  }, [mounted]);

  const showVideo =
    mounted &&
    (status === "streaming" ||
      status === "connecting" ||
      status === "requesting_media" ||
      status === "closed");

  // Until mounted, render a static placeholder (avoids hydration mismatch; video is client-only).
  if (!mounted) {
    return (
      <div
        className="fixed top-4 right-4 z-50 flex flex-col items-end gap-1"
        aria-label="Emotion capture"
      >
        <div className="relative rounded-lg overflow-hidden border border-white/20 bg-black/80 shadow-lg ring-1 ring-black/20 w-32 min-h-24 flex items-center justify-center">
          <span className="text-white/50 text-xs">…</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed top-4 right-4 z-50 flex flex-col items-end gap-1"
      aria-live="polite"
      aria-label="Emotion capture"
    >
      <div className="relative rounded-lg overflow-hidden border border-white/20 bg-black/80 shadow-lg ring-1 ring-black/20 w-32 min-h-24">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="block w-32 h-24 object-cover scale-x-[-1]"
          style={{ display: showVideo ? "block" : "none", minWidth: 128, minHeight: 96 }}
          aria-hidden
        />
        {status === "requesting_media" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white/80 text-xs">
            Camera…
          </div>
        )}
        {status === "connecting" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white/80 text-xs">
            Connecting…
          </div>
        )}
        {status === "error" && error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-red-300 text-xs px-2 text-center">
            {error.message}
          </div>
        )}
        {/* When closed we keep the video visible; no "Reconnecting…" overlay to avoid it flashing continuously */}
        {status === "idle" && (
          <div className="w-32 h-24 flex items-center justify-center bg-black/60 text-white/50 text-xs">
            Starting…
          </div>
        )}
        <span
          className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full border-2 border-white/90 shadow-md"
          style={{
            backgroundColor:
              dotColor === "green"
                ? "rgb(34, 197, 94)"
                : dotColor === "red"
                  ? "rgb(239, 68, 68)"
                  : "rgb(234, 179, 8)",
          }}
          title={`Emotion: ${dotColor}`}
        />
      </div>
    </div>
  );
}

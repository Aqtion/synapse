"use client";

import { useHumeStream } from "@/ux_telemetry";
import type { HumeEmotionMap, HumeStreamMessage } from "@/ux_telemetry";
import { useCallback, useState } from "react";

function EmotionReadout({ emotions }: { emotions: HumeEmotionMap }) {
  const entries = Object.entries(emotions).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return <span className="text-muted-foreground text-sm">No face data yet</span>;
  return (
    <div className="text-left text-sm space-y-1">
      {entries.slice(0, 6).map(([name, score]) => (
        <div key={name} className="flex justify-between gap-4">
          <span className="font-medium text-foreground">{name}</span>
          <span className="text-muted-foreground">{(score * 100).toFixed(1)}%</span>
        </div>
      ))}
    </div>
  );
}

export default function HumeStreamTestPage() {
  const [lastEmotions, setLastEmotions] = useState<HumeEmotionMap>({});
  const [messageCount, setMessageCount] = useState(0);
  const [lastRaw, setLastRaw] = useState<HumeStreamMessage | null>(null);

  const onMessage = useCallback((emotions: HumeEmotionMap) => {
    setLastEmotions(emotions);
    setMessageCount((c) => c + 1);
  }, []);

  const { status, error, start, stop, videoRef } = useHumeStream({
    maxFps: 2,
    onMessage,
    onError: (e) => console.error("[Hume]", e),
    onRawMessage: setLastRaw,
    enabled: true,
  });

  return (
    <div className="min-h-screen bg-background p-8 font-sans">
      <main className="mx-auto max-w-lg space-y-6">
        <h1 className="text-2xl font-semibold text-foreground">
          Hume stream test
        </h1>
        <p className="text-muted-foreground text-sm">
          Allow webcam, click Start, and look at the camera. You should see
          emotion scores update every ~500ms.
        </p>

        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="hidden"
          style={{ display: "none" }}
        />

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => start()}
            disabled={status === "streaming" || status === "requesting_media" || status === "connecting"}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            Start
          </button>
          <button
            type="button"
            onClick={() => stop()}
            disabled={status === "idle" || status === "closed"}
            className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground disabled:opacity-50"
          >
            Stop
          </button>
        </div>

        <div className="rounded-md border border-border bg-card p-4 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">Status</span>
            <span className="text-muted-foreground text-sm">{status}</span>
          </div>
          {error && (
            <p className="text-destructive text-sm">{error.message}</p>
          )}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">Messages received</span>
            <span className="text-muted-foreground text-sm">{messageCount}</span>
          </div>
          <div>
            <span className="text-sm font-medium text-foreground block mb-2">Last emotions</span>
            <EmotionReadout emotions={lastEmotions} />
          </div>
          {lastRaw != null && (
            <details className="text-left">
              <summary className="text-sm font-medium text-foreground cursor-pointer">
                Last raw message (debug)
              </summary>
              <pre className="mt-2 p-2 rounded bg-muted text-xs overflow-auto max-h-48">
                {JSON.stringify(lastRaw, null, 2)}
              </pre>
            </details>
          )}
        </div>
      </main>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";

type DebugResult = {
  projectId?: string;
  projectName?: string;
  hint?: string;
  property_definitions?:
    | { count: number; sample_names: string[]; hasSandboxId?: boolean }
    | { error: number; body: string };
  event_definitions?:
    | { count: number; sample_names: string[]; hasRageclick?: boolean }
    | { error: number; body: string };
  session_recordings?: {
    count?: number;
    results?: Array<{ id: string; start_url: string; start_time: string; recording_duration: number }>;
    has_next?: boolean;
  };
  error?: string;
};

export default function DebugPostHogPage() {
  const [result, setResult] = useState<DebugResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/debug-posthog")
      .then((r) => r.json())
      .then((data) => {
        setResult(data);
        setLoading(false);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Failed to fetch");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        <p>Loading PostHog debug…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-6 bg-background text-muted-foreground">
        <p className="text-destructive">Error: {error}</p>
      </div>
    );
  }

  const props = result?.property_definitions as { hasSandboxId?: boolean; count?: number } | undefined;
  const events = result?.event_definitions as { hasRageclick?: boolean; count?: number } | undefined;
  const recordings = result?.session_recordings;
  const recordingCount = recordings?.results?.length ?? 0;

  return (
    <div className="min-h-screen p-6 bg-background text-foreground max-w-4xl mx-auto">
      <h1 className="text-xl font-semibold mb-4">PostHog API debug</h1>
      <p className="text-sm text-muted-foreground mb-4">
        Fetched from <code className="bg-muted px-1 rounded">/api/debug-posthog</code> (uses{" "}
        <code className="bg-muted px-1 rounded">POSTHOG_PERSONAL_API_KEY</code> in dashboard/.env).
      </p>

      <div className="grid gap-4 mb-6">
        <div className="rounded-lg border bg-card p-4">
          <h2 className="font-medium mb-2">Summary</h2>
          <ul className="text-sm space-y-1">
            <li>Project: {result?.projectName ?? "—"} ({result?.projectId ?? "—"})</li>
            <li>sandboxId in property definitions: {props?.hasSandboxId ? "Yes" : "No"}</li>
            <li>$rageclick in event definitions: {events?.hasRageclick ? "Yes" : "No"}</li>
            <li>Session recordings (sample): {recordingCount}</li>
          </ul>
        </div>
        {result?.hint && (
          <p className="text-sm text-muted-foreground">{result.hint}</p>
        )}
      </div>

      <details className="rounded-lg border bg-card">
        <summary className="p-4 cursor-pointer font-medium">Raw JSON</summary>
        <pre className="p-4 text-xs overflow-auto max-h-[60vh] border-t bg-muted/30">
          {JSON.stringify(result, null, 2)}
        </pre>
      </details>
    </div>
  );
}

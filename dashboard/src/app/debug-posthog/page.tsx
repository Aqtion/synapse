"use client";

import { useEffect, useState } from "react";

type DebugResult = {
  projectId?: string;
  projectName?: string;
  hint?: string;
  deploy_hint?: string;
  property_definitions?: { count: number; sample_names: string[]; hasSandboxId?: boolean } | { error: number; body: string };
  event_definitions?: { count: number; sample_names: string[]; hasRageclick?: boolean } | { error: number; body: string };
  session_recordings?: {
    results?: Array<{ id: string; start_url: string; start_time: string; end_time?: string; recording_duration: number; ongoing?: boolean }>;
  };
  verification?: {
    newest_recording: {
      id?: string;
      start_url?: string;
      start_time?: string;
      end_time?: string;
      recording_duration_sec?: number;
      duration_min?: number;
      ongoing?: boolean;
      is_preview_frame?: boolean;
    };
    checks: { preview_only_session?: boolean; session_has_end_time?: boolean; copy_this_for_debug?: string };
  } | null;
  error?: string;
};

export default function DebugPostHogPage() {
  const [result, setResult] = useState<DebugResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = () => {
    setError(null);
    setLoading(true);
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
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading && !result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        <p>Loading PostHog debug…</p>
      </div>
    );
  }

  if (error && !result) {
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
  const verification = result?.verification;
  const newest = verification?.newest_recording;
  const checks = verification?.checks;

  return (
    <div className="min-h-screen p-6 bg-background text-foreground max-w-4xl mx-auto">
      <h1 className="text-xl font-semibold mb-4">PostHog API debug</h1>
      <p className="text-sm text-muted-foreground mb-4">
        Fetched from <code className="bg-muted px-1 rounded">/api/debug-posthog</code> (uses{" "}
        <code className="bg-muted px-1 rounded">POSTHOG_PERSONAL_API_KEY</code> in dashboard/.env).
      </p>

      <div className="rounded-lg border border-amber-500/50 bg-amber-500/5 p-4 mb-6">
        <h2 className="font-medium mb-2">How to confirm it works</h2>
        <ol className="text-sm list-decimal list-inside space-y-2 mb-3">
          <li>Open a sandbox (e.g. /s/your-sandbox-id), use it 1–2 min in the <strong>preview</strong>, then leave (navigate away or close tab).</li>
          <li>Wait 1–2 min, open this page, click <strong>Refresh</strong>.</li>
          <li>Copy <strong>Summary</strong> + <strong>Verification (newest recording)</strong> and paste here.</li>
          <li>In PostHog: Session Replay → newest recording → copy <strong>Start, Duration, Entry URL</strong> (and any errors) and paste here.</li>
        </ol>
        <p className="text-xs text-muted-foreground mb-3">
          Expect: <strong>is_preview_frame: Yes</strong> (preview only), <strong>session_has_end_time: Yes</strong>, duration ≈ time you spent (not 83 min). Session should stop on tab close / navigate / tab hidden.
        </p>
        <p className="text-xs font-medium text-foreground mb-1">What to paste for debugging (if it still fails):</p>
        <ol className="text-xs list-decimal list-inside space-y-1 text-muted-foreground">
          <li>In the sandbox tab console, run <code className="bg-muted px-1 rounded">window.__POSTHOG_DEBUG__ = true</code> (or open from dashboard so dev mode logs).</li>
          <li>Reproduce: open sandbox → use preview ~1 min → close tab or switch away.</li>
          <li>Paste (1) any console lines containing <code className="bg-muted px-1 rounded">[PostHog]</code>, (2) this page’s <strong>Summary</strong> + <strong>Verification</strong> block, (3) from PostHog Session Replay: newest recording’s Start time, Duration, Entry URL, and whether it shows &quot;ongoing&quot;.</li>
        </ol>
        {result?.deploy_hint && (
          <p className="text-sm text-amber-600 dark:text-amber-400 mt-3 font-medium">
            {result.deploy_hint}
          </p>
        )}
      </div>

      <div className="grid gap-4 mb-6">
        <div className="rounded-lg border bg-card p-4">
          <h2 className="font-medium mb-2">Summary</h2>
          <ul className="text-sm space-y-1">
            <li>Project: {result?.projectName ?? "—"} ({result?.projectId ?? "—"})</li>
            <li>sandboxId in property definitions: {props?.hasSandboxId ? "Yes" : "No"}</li>
            <li>$rageclick in event definitions: {events?.hasRageclick ? "Yes" : "No"}</li>
            <li>Session recordings (sample): {recordingCount}</li>
          </ul>
          <p className="text-xs text-muted-foreground mt-2">↑ Copy this + Verification for debugging.</p>
        </div>

        {verification && (
          <div className="rounded-lg border bg-card p-4">
            <h2 className="font-medium mb-2">Verification (newest recording)</h2>
            <ul className="text-sm space-y-1">
              <li>Recording ID: {newest?.id ?? "—"}</li>
              <li>Start URL: <span className="break-all">{newest?.start_url ?? "—"}</span></li>
              <li>Start time: {newest?.start_time ?? "—"}</li>
              <li>End time: {newest?.end_time ?? "—"}</li>
              <li>Duration: {newest?.recording_duration_sec ?? "—"}s ({newest?.duration_min ?? "—"} min)</li>
              <li>Ongoing: {newest?.ongoing === true ? "Yes" : "No"}</li>
              <li><strong>is_preview_frame:</strong> {newest?.is_preview_frame === true ? "Yes ✓" : "No"}</li>
              <li><strong>preview_only_session:</strong> {checks?.preview_only_session === true ? "Yes ✓" : "No"}</li>
              <li><strong>session_has_end_time:</strong> {checks?.session_has_end_time === true ? "Yes ✓" : "No"}</li>
            </ul>
            <p className="text-xs text-muted-foreground mt-2">↑ Copy this for debugging.</p>
          </div>
        )}

        {result?.hint && <p className="text-sm text-muted-foreground">{result.hint}</p>}
      </div>

      <div className="flex gap-2 mb-4">
        <button
          type="button"
          className="rounded-md border bg-background px-3 py-1.5 text-sm hover:bg-muted"
          onClick={fetchData}
        >
          Refresh
        </button>
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

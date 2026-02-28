"use client";

import { useCallback } from "react";

const SANDBOX_FRAME_ID = "sandboxFrame";
const POSTHOG_SCRIPT_MARKER = "SANDBOX_POSTHOG_SCRIPT_LOADED";

function sendPostHogInitToFrame(sandboxId: string): boolean {
  if (typeof window === "undefined" || !sandboxId) return false;
  const apiKey = (process.env.NEXT_PUBLIC_POSTHOG_KEY ?? "").trim();
  const apiHost = (process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com").trim();
  if (!apiKey) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[PostHog] Not sending: NEXT_PUBLIC_POSTHOG_KEY is missing");
    }
    return false;
  }
  const frame = document.getElementById(SANDBOX_FRAME_ID) as HTMLIFrameElement | null;
  if (!frame?.contentWindow) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[PostHog] Not sending: sandbox iframe or contentWindow not found");
    }
    return false;
  }
  frame.contentWindow.postMessage(
    { type: "POSTHOG_INIT", apiKey, apiHost, sandboxId },
    "*"
  );
  if (process.env.NODE_ENV === "development") {
    console.info("[PostHog] POSTHOG_INIT sent to sandbox iframe", { sandboxId });
  }
  return true;
}

/**
 * Fetches the studio URL (same as iframe src) and checks if the HTML contains the PostHog script.
 * Logs result to console. Call when you have iframeSrc (worker base + /s/:id/).
 */
export async function debugPostHogWorkerHtml(iframeSrc: string): Promise<void> {
  try {
    const res = await fetch(iframeSrc, { method: "GET", credentials: "omit" });
    const html = await res.text();
    const hasScript = html.includes(POSTHOG_SCRIPT_MARKER);
    const hasBody = html.includes("<body>");
    if (process.env.NODE_ENV === "development") {
      console.info("[PostHog] Debug: fetched worker studio HTML", {
        url: iframeSrc,
        status: res.status,
        htmlLength: html.length,
        hasPostHogScript: hasScript,
        hasBodyTag: hasBody,
        hint: hasScript
          ? "Worker HTML has script; iframe should reply. If not, check if iframe loads a different URL (redirect?)."
          : "Worker HTML has NO PostHog script. Restart/redeploy the worker so it injects the script (worker/src/index.ts).",
      });
    }
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[PostHog] Debug: failed to fetch worker HTML (CORS or network)", {
        url: iframeSrc,
        error: err instanceof Error ? err.message : String(err),
        hint: "Ensure worker returns CORS headers for the studio page (Access-Control-Allow-Origin).",
      });
    }
  }
}

/**
 * Returns an onLoad handler for the sandbox iframe. When the iframe loads, sends
 * PostHog config (POSTHOG_INIT) via postMessage so the key never appears in the URL.
 * Sends once; the injected script runs in <head> so it is ready when onLoad fires.
 */
export function useSandboxPostHogOnLoad(sandboxId: string): () => void {
  return useCallback(() => {
    sendPostHogInitToFrame(sandboxId);
  }, [sandboxId]);
}

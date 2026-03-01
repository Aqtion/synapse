"use client";

import { useCallback } from "react";

const SANDBOX_FRAME_ID = "sandboxFrame";

export function sendPostHogInitToFrame(sandboxId: string): boolean {
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
  const win = frame.contentWindow;
  win.postMessage({ type: "POSTHOG_STOP" }, "*");
  win.postMessage(
    { type: "POSTHOG_INIT", apiKey, apiHost, sandboxId },
    "*"
  );
  if (process.env.NODE_ENV === "development") {
    console.info("[PostHog] POSTHOG_INIT sent to sandbox iframe", { sandboxId });
  }
  return true;
}

/**
 * Returns an onLoad handler for the sandbox iframe. When the iframe loads, sends
 * PostHog config (POSTHOG_INIT) via postMessage so the key never appears in the URL.
 */
export function useSandboxPostHogOnLoad(sandboxId: string): () => void {
  return useCallback(() => {
    sendPostHogInitToFrame(sandboxId);
  }, [sandboxId]);
}

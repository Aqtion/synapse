"use client";

import { useCallback } from "react";
import { initPostHogSession } from "@/lib/sandboxPostHogSession";

export { endPostHogSession } from "@/lib/sandboxPostHogSession";

/**
 * Returns an onLoad handler for the sandbox iframe. When the iframe loads, sends
 * PostHog config (POSTHOG_INIT) via postMessage so the key never appears in the URL.
 */
export function useSandboxPostHogOnLoad(sandboxId: string): () => void {
  return useCallback(() => {
    initPostHogSession(sandboxId);
  }, [sandboxId]);
}

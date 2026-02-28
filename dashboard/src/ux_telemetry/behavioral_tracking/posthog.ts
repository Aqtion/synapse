"use client";

import type { BehavioralMetric, PostHogConfig } from "./types";

type PostHogInstance = {
  get_session_replay_url?: () => string;
  capture: (event: string, properties?: Record<string, unknown>) => void;
};

let posthog: PostHogInstance | null = null;
let configCallbacks: Pick<PostHogConfig, "onRageClick" | "onBehavioralMetric"> = {};

/**
 * Initialize PostHog for the beta-tester session: product analytics + session replay.
 * Safe to call multiple times; re-inits only if not yet inited.
 * Requires posthog-js. Set NEXT_PUBLIC_POSTHOG_KEY (or config.apiKey).
 */
export async function initPostHog(config: PostHogConfig): Promise<boolean> {
  const key =
    config.apiKey?.trim() ||
    (typeof process !== "undefined" ? process.env.NEXT_PUBLIC_POSTHOG_KEY : "") ||
    "";
  if (!key) return false;

  configCallbacks = {
    onRageClick: config.onRageClick ?? null,
    onBehavioralMetric: config.onBehavioralMetric ?? null,
  };

  try {
    const mod = await import("posthog-js");
    const ph = mod.default;
    if (posthog != null) return true;

    ph.init(key, {
      api_host:
        config.apiHost ||
        (typeof process !== "undefined" ? process.env.NEXT_PUBLIC_POSTHOG_HOST : undefined) ||
        "https://us.i.posthog.com",
      person_profiles: "identified_only",
      session_recording: {
        recordCrossOriginIframes: false,
      },
      capture_pageview: true,
      _onCapture: (eventName: string) => {
        if (eventName === "$rageclick") {
          configCallbacks.onRageClick?.();
          configCallbacks.onBehavioralMetric?.({
            type: "rage_click",
            timestamp: Date.now(),
          });
        }
      },
    });
    posthog = ph as unknown as PostHogInstance;
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the current session replay URL when available (e.g. for FrictionPayload).
 * May return "" until PostHog has the replay URL ready.
 */
export function getSessionReplayUrl(): string {
  if (!posthog || typeof posthog.get_session_replay_url !== "function") {
    return "";
  }
  try {
    const url = posthog.get_session_replay_url();
    return typeof url === "string" ? url : "";
  } catch {
    return "";
  }
}

/** Capture a custom event for product analytics (beta-tester session). */
export function capture(eventName: string, properties?: Record<string, unknown>): void {
  if (!posthog) return;
  try {
    posthog.capture(eventName, properties);
  } catch {
    /* ignore */
  }
}

export function isPostHogReady(): boolean {
  return posthog != null;
}

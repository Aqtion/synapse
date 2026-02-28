"use client";

import type { PostHogCapturedEvent, PostHogConfig, PostHogEventName } from "./types";

type CaptureResult = {
  event?: string;
  properties?: Record<string, unknown>;
  uuid?: string;
  timestamp?: string;
};

type PostHogInstance = {
  init: (key: string, config: Record<string, unknown>) => void;
  capture: (name: string, props?: Record<string, unknown>) => void;
  get_session_replay_url: () => string;
  get_distinct_id?: () => string;
};

let ph: PostHogInstance | null = null;
let lastInitKey: string | null = null;
let lastInitHost: string | null = null;

let onRageClick: PostHogConfig["onRageClick"] = undefined;
let onEventCaptured: PostHogConfig["onEventCaptured"] = undefined;

function toCapturedEvent(eventName: string, eventData: CaptureResult): PostHogCapturedEvent {
  return {
    name: eventName as PostHogEventName,
    properties: eventData?.properties,
    uuid: eventData?.uuid,
    timestamp: eventData?.timestamp,
  };
}

/**
 * Initialize PostHog for beta-tester sessions:
 * - Product analytics (events)
 * - Session replay (recording) + get_session_replay_url()
 *
 * Safe to call multiple times; subsequent calls update callbacks.
 */
export async function initPostHog(config: PostHogConfig = {}): Promise<boolean> {
  const apiKey = (config.apiKey ?? process.env.NEXT_PUBLIC_POSTHOG_KEY ?? "").trim();
  if (!apiKey) return false;

  const apiHost = (config.apiHost ?? process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com").trim();
  onRageClick = config.onRageClick;
  onEventCaptured = config.onEventCaptured;

  if (ph && lastInitKey === apiKey && lastInitHost === apiHost) {
    return true;
  }

  try {
    const mod = await import("posthog-js");
    const posthog = mod.default as unknown as PostHogInstance;

    posthog.init(apiKey, {
      api_host: apiHost,
      person_profiles: "identified_only",
      // Autocapture is on by default; it emits $rageclick and $dead_click.
      session_recording:
        config.enableSessionReplay === false
          ? false
          : {
              recordCrossOriginIframes: config.recordCrossOriginIframes ?? false,
              maskAllInputs: true,
            },
      _onCapture: (eventName: string, eventData: CaptureResult) => {
        const evt = toCapturedEvent(eventName, eventData);
        onEventCaptured?.(evt);
        if (eventName === "$rageclick") onRageClick?.(evt);
      },
    });

    ph = posthog;
    lastInitKey = apiKey;
    lastInitHost = apiHost;
    return true;
  } catch {
    return false;
  }
}

export function isPostHogReady(): boolean {
  return ph != null;
}

export function captureEvent(name: string, properties?: Record<string, unknown>): void {
  if (!ph) return;
  try {
    ph.capture(name, properties);
  } catch {
    // ignore
  }
}

export function getSessionReplayUrl(): string {
  if (!ph) return "";
  try {
    const url = ph.get_session_replay_url();
    return typeof url === "string" ? url : "";
  } catch {
    return "";
  }
}

export function getDistinctId(): string {
  if (!ph?.get_distinct_id) return "";
  try {
    const id = ph.get_distinct_id();
    return typeof id === "string" ? id : "";
  } catch {
    return "";
  }
}

/** For friction: true if event indicates strong frustration. */
export function isFrictionEvent(eventName: string): eventName is "$rageclick" | "$dead_click" {
  return eventName === "$rageclick" || eventName === "$dead_click";
}

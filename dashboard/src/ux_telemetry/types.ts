"use client";

/**
 * Payload emitted when friction is detected (rage click or sustained
 * Confusion/Concentration). Consumed by Voice AI / Modal. Used by the
 * TelemetryProvider in the beta-tester sandbox.
 */
export interface FrictionPayload {
  trigger_source: "hume_biometric" | "posthog_behavioral";
  dominant_emotion: string;
  /** outerHTML of the element under the cursor (or nearest interactive). */
  target_element_html: string;
  session_replay_url: string;
  timestamp: number;
}

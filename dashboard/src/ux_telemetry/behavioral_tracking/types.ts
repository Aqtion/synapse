"use client";

/**
 * Config for initializing PostHog in the beta-tester session.
 * Product analytics + session replay run in the tester's browser.
 */
export interface PostHogConfig {
  /** PostHog project API key (or set NEXT_PUBLIC_POSTHOG_KEY). */
  apiKey?: string;
  /** PostHog host (default https://us.i.posthog.com). */
  apiHost?: string;
  /** Called when PostHog emits a rage-click event. Use for friction trigger. */
  onRageClick?: () => void;
  /**
   * Called when a behavioral metric is detected (rage click now; more later).
   * Use for real-time friction scoring beyond a single trigger.
   */
  onBehavioralMetric?: (metric: BehavioralMetric) => void;
}

/**
 * Real-time behavioral metric from PostHog or our own tracking.
 * Extend this union as you add more signals (e.g. quick_back, hesitation).
 */
export type BehavioralMetric =
  | { type: "rage_click"; timestamp: number; elementSummary?: string }
  | { type: string; timestamp: number; [key: string]: unknown };

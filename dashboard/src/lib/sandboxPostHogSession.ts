/**
 * Sandbox PostHog session: start/end screen recording in the sandbox iframe (studio + preview).
 * Keep all PostHog init/stop logic here so it can be triggered from:
 * - iframe load (init)
 * - tab hidden, page close, unmount (end)
 *
 * Future: PostHog payloads (session id, sandbox id, timestamps) will be written to Convex
 * and joined with other streams via sessionId, sandboxId, timestampMs (see schema telemetrySamples).
 */

const SANDBOX_FRAME_ID = "sandboxFrame";

/** Set to true or window.__POSTHOG_DEBUG__ = true in console to log every init/stop and trigger. */
export const POSTHOG_DEBUG =
  (typeof window !== "undefined" && (window as unknown as { __POSTHOG_DEBUG__?: boolean }).__POSTHOG_DEBUG__) ||
  (typeof process !== "undefined" && process.env.NODE_ENV === "development");

function getFrame(): HTMLIFrameElement | null {
  if (typeof window === "undefined") return null;
  return document.getElementById(SANDBOX_FRAME_ID) as HTMLIFrameElement | null;
}

/**
 * Sends POSTHOG_STOP to the sandbox iframe so the preview can call stopSessionRecording().
 * Call this on: tab hidden, pagehide, unmount, or when voice/camera session ends.
 */
export function endPostHogSession(trigger: string): void {
  try {
    const frame = getFrame();
    if (!frame?.contentWindow) {
      if (POSTHOG_DEBUG) console.debug("[PostHog] endPostHogSession: no frame", { trigger });
      return;
    }
    frame.contentWindow.postMessage({ type: "POSTHOG_STOP" }, "*");
    if (POSTHOG_DEBUG) {
      console.debug("[PostHog] POSTHOG_STOP sent to sandbox iframe", { trigger });
    }
  } catch (e) {
    if (POSTHOG_DEBUG) console.debug("[PostHog] endPostHogSession error", trigger, e);
  }
}

/**
 * Sends POSTHOG_STOP then POSTHOG_INIT to the sandbox iframe (e.g. on iframe load).
 * Studio will set config and forward to preview; preview will init PostHog with session recording.
 */
export function initPostHogSession(sandboxId: string): boolean {
  if (typeof window === "undefined" || !sandboxId) return false;
  const apiKey = (process.env.NEXT_PUBLIC_POSTHOG_KEY ?? "").trim();
  const apiHost = (process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com").trim();
  if (!apiKey) {
    if (POSTHOG_DEBUG) console.warn("[PostHog] initPostHogSession: NEXT_PUBLIC_POSTHOG_KEY missing");
    return false;
  }
  const frame = getFrame();
  if (!frame?.contentWindow) {
    if (POSTHOG_DEBUG) console.warn("[PostHog] initPostHogSession: sandbox iframe not found");
    return false;
  }
  const win = frame.contentWindow;
  win.postMessage({ type: "POSTHOG_STOP" }, "*");
  if (POSTHOG_DEBUG) console.debug("[PostHog] POSTHOG_STOP sent (before init)", { trigger: "init" });
  win.postMessage(
    { type: "POSTHOG_INIT", apiKey, apiHost, sandboxId },
    "*"
  );
  if (POSTHOG_DEBUG) console.debug("[PostHog] POSTHOG_INIT sent to sandbox iframe", { sandboxId });
  return true;
}

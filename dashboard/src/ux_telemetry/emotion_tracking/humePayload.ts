import type { HumeStreamMessage } from "./types";

/** Face payload can be at top level or under models_success (Hume API). */
function getFacePayload(msg: HumeStreamMessage): HumeStreamMessage["face"] {
  return (
    msg.face ??
    (msg as { models_success?: { face?: HumeStreamMessage["face"] } }).models_success?.face
  );
}

/**
 * Returns timestamp in milliseconds from a Hume raw message for storage/alignment.
 * Prefer payload time when present; otherwise fall back to client time.
 */
export function getTimestampMsFromHumePayload(
  raw: HumeStreamMessage,
  fallbackMs: number = Date.now(),
): number {
  const face = getFacePayload(raw);
  const first = face?.predictions?.[0] as { time?: number } | undefined;
  const timeSeconds = first?.time;
  if (typeof timeSeconds === "number" && Number.isFinite(timeSeconds)) {
    return Math.round(timeSeconds * 1000);
  }
  return fallbackMs;
}

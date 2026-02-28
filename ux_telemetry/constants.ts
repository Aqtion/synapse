"use client";

/** Base WebSocket URL for Hume Expression Measurement streaming (no query params). */
export const HUME_WS_BASE = "wss://api.hume.ai/v0/stream/models";

/** Max FPS for frame extraction to Hume (strict concurrency constraint). */
export const HUME_MAX_FPS = 2;

/** Interval in ms for 2 FPS: 1000 / 2 = 500ms. */
export const HUME_FRAME_INTERVAL_MS = 1000 / HUME_MAX_FPS;

/** Default video constraints: low res to reduce payload and CPU. */
export const HUME_VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  width: { ideal: 320 },
  height: { ideal: 240 },
  frameRate: { max: HUME_MAX_FPS },
};

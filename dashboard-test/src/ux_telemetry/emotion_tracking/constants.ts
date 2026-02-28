"use client";

export const HUME_WS_BASE = "wss://api.hume.ai/v0/stream/models";
export const HUME_MAX_FPS = 2;
export const HUME_FRAME_INTERVAL_MS = 1000 / HUME_MAX_FPS;

export const HUME_VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  width: { ideal: 480 },
  height: { ideal: 360 },
  frameRate: { max: HUME_MAX_FPS },
};

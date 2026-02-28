"use client";

/**
 * UX Telemetry — modular client-only hooks for the beta-tester sandbox
 * (and dashboard test pages). No server or dashboard-specific code.
 *
 * - emotion_tracking: Hume AI webcam stream (useHumeStream)
 * - mouse_tracking: throttled cursor + element under cursor / nearest interactive (useMouseTracker)
 */

export { useHumeStream } from "./emotion_tracking";
export {
  HUME_FRAME_INTERVAL_MS,
  HUME_MAX_FPS,
  HUME_VIDEO_CONSTRAINTS,
  HUME_WS_BASE,
} from "./emotion_tracking";
export type {
  HumeEmotionMap,
  HumeEmotionScore,
  HumeFacePrediction,
  HumeFaceResponse,
  HumeStreamMessage,
  UseHumeStreamOptions,
  UseHumeStreamReturn,
} from "./emotion_tracking";

export { useMouseTracker } from "./mouse_tracking";
export type {
  MouseTargetSnapshot,
  MouseTrackingSnapshot,
  UseMouseTrackerOptions,
  UseMouseTrackerReturn,
} from "./mouse_tracking";

export type { FrictionPayload } from "./types";

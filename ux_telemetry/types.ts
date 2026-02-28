"use client";

import type { RefObject } from "react";

/**
 * Payload emitted when friction is detected (rage click or sustained
 * Confusion/Concentration from Hume). Consumed by Voice AI / Modal.
 */
export interface FrictionPayload {
  trigger_source: "hume_biometric" | "posthog_behavioral";
  dominant_emotion: string;
  target_element_html: string;
  session_replay_url: string;
  timestamp: number;
}

/** Emotion score from Hume Expression Measurement API (face model). */
export interface HumeEmotionScore {
  name: string;
  score: number;
}

/** Face prediction in a single frame (one face per frame assumed for UX telemetry). */
export interface HumeFacePrediction {
  emotions: HumeEmotionScore[];
  /** Detection probability [0,1] */
  prob?: number;
  /** Bounding box if returned */
  box?: { x: number; y: number; w: number; h: number };
}

/**
 * WebSocket message from Hume stream. Structure aligned with Expression
 * Measurement streaming API (face model). Top-level may include model-specific
 * wrappers; we normalize to face predictions for emotion reading.
 */
export interface HumeStreamMessage {
  /** Face predictions for the last sent frame */
  face?: HumeFacePrediction | HumeFacePrediction[];
  /** Alternative: some responses use a payload wrapper */
  message?: { face?: HumeFacePrediction | HumeFacePrediction[] };
  [key: string]: unknown;
}

/** Normalized emotion map for a single frame (dominant emotions only). */
export type HumeEmotionMap = Record<string, number>;

/** Options for useHumeStream. */
export interface UseHumeStreamOptions {
  /** Hume API key. If omitted, NEXT_PUBLIC_HUME_API_KEY is used. */
  apiKey?: string;
  /** Max frames per second sent to Hume (default 2). Must be ≤ 2 per spec. */
  maxFps?: number;
  /** Called when a parsed message is received (emotions for current frame). */
  onMessage?: (emotions: HumeEmotionMap, raw: HumeStreamMessage) => void;
  /** Called on WebSocket or media error. */
  onError?: (error: Error) => void;
  /** If false, stream never starts (e.g. wait for user consent). */
  enabled?: boolean;
}

/** Return type of useHumeStream. */
export interface UseHumeStreamReturn {
  /** Connection state. */
  status: "idle" | "requesting_media" | "connecting" | "streaming" | "error" | "closed";
  /** Last error if status === "error". */
  error: Error | null;
  /** Start capture and WebSocket (idempotent). */
  start: () => Promise<void>;
  /** Stop capture and close WebSocket. */
  stop: () => void;
  /** Ref to attach to a hidden <video> (optional; hook can create one internally). */
  videoRef: RefObject<HTMLVideoElement | null>;
}

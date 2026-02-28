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

/** Single face prediction (one entry in the predictions array). */
export interface HumeFacePrediction {
  emotions: HumeEmotionScore[];
  /** Detection probability [0,1] */
  prob?: number;
  /** Bounding box if returned */
  bbox?: { x: number; y: number; w: number; h: number };
}

/** Face model response: object with predictions array (Hume API shape). */
export interface HumeFaceResponse {
  predictions: HumeFacePrediction[];
}

/**
 * WebSocket message from Hume stream (models_success). See Expression
 * Measurement streaming API: face has .predictions array.
 */
export interface HumeStreamMessage {
  /** Face model response: { predictions: [{ emotions: [{ name, score }] }] } */
  face?: HumeFaceResponse;
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
  /** Called for every WebSocket message (for debugging); receives parsed JSON. */
  onRawMessage?: (raw: HumeStreamMessage) => void;
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

"use client";

import { useCallback, useRef, useState } from "react";
import {
  HUME_FRAME_INTERVAL_MS,
  HUME_VIDEO_CONSTRAINTS,
  HUME_WS_BASE,
} from "./constants";
import type {
  HumeEmotionMap,
  HumeStreamMessage,
  UseHumeStreamOptions,
  UseHumeStreamReturn,
} from "./types";

const DEFAULT_MAX_FPS = 2;

/** Normalize Hume face prediction(s) to a single emotion map (max scores across faces). */
function emotionsFromMessage(msg: HumeStreamMessage): HumeEmotionMap {
  const face = msg.face ?? msg.message?.face;
  if (face == null) return {};

  const list = Array.isArray(face) ? face : [face];
  const out: HumeEmotionMap = {};

  for (const f of list) {
    if (!f?.emotions) continue;
    for (const e of f.emotions) {
      if (e.name != null && typeof e.score === "number") {
        out[e.name] = Math.max(out[e.name] ?? 0, e.score);
      }
    }
  }
  return out;
}

/**
 * useHumeStream — Hume AI Expression Measurement WebSocket + webcam integration.
 *
 * - Requests getUserMedia, feeds a hidden <video> (consumer must render and pass ref).
 * - Extracts frames at ≤ maxFps (default 2 FPS) via canvas → base64 JPEG.
 * - Opens WebSocket to Hume, sends config then frame payloads; parses emotion responses.
 *
 * API key: pass `apiKey` in options, or set NEXT_PUBLIC_HUME_API_KEY.
 * (Client-side key is required for direct browser→Hume WebSocket; for no client exposure use a proxy.)
 */
export function useHumeStream(
  options: UseHumeStreamOptions = {}
): UseHumeStreamReturn {
  const {
    maxFps = DEFAULT_MAX_FPS,
    onMessage,
    onError,
    enabled = true,
  } = options;

  const [status, setStatus] = useState<UseHumeStreamReturn["status"]>("idle");
  const [error, setError] = useState<Error | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (intervalRef.current != null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (wsRef.current != null) {
      try {
        wsRef.current.close();
      } catch {
        /* ignore */
      }
      wsRef.current = null;
    }
    if (streamRef.current != null) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    const video = videoRef.current;
    if (video?.srcObject) {
      video.srcObject = null;
    }
    if (canvasRef.current != null) {
      canvasRef.current = null;
    }
    setStatus("closed");
    setError(null);
  }, []);

  const start = useCallback(async () => {
    if (!enabled) return;
    if (typeof window === "undefined") return;

    const apiKey =
      options.apiKey ?? process.env.NEXT_PUBLIC_HUME_API_KEY;

    if (!apiKey?.trim()) {
      const err = new Error(
        "Hume API key missing: set NEXT_PUBLIC_HUME_API_KEY or pass apiKey in options."
      );
      setError(err);
      setStatus("error");
      onError?.(err);
      return;
    }

    stop();

    setStatus("requesting_media");
    setError(null);

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: HUME_VIDEO_CONSTRAINTS,
        audio: false,
      });
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      setError(err);
      setStatus("error");
      onError?.(err);
      return;
    }

    streamRef.current = stream;

    const video = videoRef.current;
    if (!video) {
      stream.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      const err = new Error(
        "useHumeStream: attach videoRef to a <video> element before calling start()."
      );
      setError(err);
      setStatus("error");
      onError?.(err);
      return;
    }

    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;

    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("Video failed to load metadata"));
      if (video.readyState >= 1) resolve();
    });

    setStatus("connecting");

    const fps = Math.min(Math.max(maxFps > 0 ? maxFps : DEFAULT_MAX_FPS, 0.5), DEFAULT_MAX_FPS);
    const frameIntervalMs = Math.ceil(1000 / fps);

    const wsUrl = `${HUME_WS_BASE}?api_key=${encodeURIComponent(apiKey)}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.binaryType = "arraybuffer";

    ws.onopen = () => {
      setStatus("streaming");
      // Minimal config for face model (align with Hume streaming API).
      try {
        ws.send(
          JSON.stringify({
            config: {
              face: { identify_faces: false },
            },
          })
        );
      } catch (e) {
        onError?.(e instanceof Error ? e : new Error(String(e)));
      }

      const canvas = document.createElement("canvas");
      canvasRef.current = canvas;

      intervalRef.current = setInterval(() => {
        if (ws.readyState !== WebSocket.OPEN) return;
        const v = videoRef.current;
        if (!v || v.readyState < 2) return;

        const w = v.videoWidth;
        const h = v.videoHeight;
        if (w === 0 || h === 0) return;

        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
        }

        const ctx = canvas.getContext("2d", {
          alpha: false,
          desynchronized: true,
        });
        if (!ctx) return;

        ctx.drawImage(v, 0, 0);
        try {
          const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
          const base64 = dataUrl.split(",")[1];
          if (base64) {
            ws.send(JSON.stringify({ data: base64 }));
          }
        } catch {
          /* skip frame on encode error */
        }
      }, frameIntervalMs);
    };

    ws.onmessage = (event: MessageEvent) => {
      try {
        const raw: HumeStreamMessage = JSON.parse(
          typeof event.data === "string" ? event.data : ""
        );
        const emotions = emotionsFromMessage(raw);
        if (Object.keys(emotions).length > 0) {
          onMessage?.(emotions, raw);
        }
      } catch {
        /* ignore parse errors */
      }
    };

    ws.onerror = () => {
      setError(new Error("Hume WebSocket error"));
      setStatus("error");
      onError?.(new Error("Hume WebSocket error"));
    };

    ws.onclose = () => {
      setStatus("closed");
    };
  }, [enabled, maxFps, onMessage, onError, stop, options.apiKey]);

  return {
    status,
    error,
    start,
    stop,
    videoRef,
  };
}

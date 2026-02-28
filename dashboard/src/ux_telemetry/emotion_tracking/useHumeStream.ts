"use client";

import { useCallback, useRef, useState } from "react";
import { HUME_VIDEO_CONSTRAINTS, HUME_WS_BASE } from "./constants";
import type {
  HumeEmotionMap,
  HumeStreamMessage,
  UseHumeStreamOptions,
  UseHumeStreamReturn,
} from "./types";

const DEFAULT_MAX_FPS = 2;

function emotionsFromMessage(msg: HumeStreamMessage): HumeEmotionMap {
  const predictions = msg.face?.predictions;
  if (!Array.isArray(predictions)) return {};
  const out: HumeEmotionMap = {};
  for (const p of predictions) {
    if (!p?.emotions) continue;
    for (const e of p.emotions) {
      if (e.name != null && typeof e.score === "number") {
        out[e.name] = Math.max(out[e.name] ?? 0, e.score);
      }
    }
  }
  return out;
}

/**
 * Hume Expression Measurement WebSocket + webcam. For use in beta-tester
 * sandbox or dashboard; runs in the browser (getUserMedia + WebSocket).
 */
export function useHumeStream(
  options: UseHumeStreamOptions = {}
): UseHumeStreamReturn {
  const {
    maxFps = DEFAULT_MAX_FPS,
    onMessage,
    onError,
    onRawMessage,
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

    const fps = Math.min(
      Math.max(maxFps > 0 ? maxFps : DEFAULT_MAX_FPS, 0.5),
      DEFAULT_MAX_FPS
    );
    const frameIntervalMs = Math.ceil(1000 / fps);

    const wsUrl = `${HUME_WS_BASE}?api_key=${encodeURIComponent(apiKey)}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.binaryType = "arraybuffer";

    const faceConfig = {
      identify_faces: false,
      fps_pred: Math.min(maxFps, DEFAULT_MAX_FPS),
      prob_threshold: 0.5,
      min_face_size: 40,
    };

    ws.onopen = () => {
      setStatus("streaming");

      const canvas = document.createElement("canvas");
      canvasRef.current = canvas;

      const startSending = () => {
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
              ws.send(
                JSON.stringify({
                  models: { face: faceConfig },
                  data: base64,
                })
              );
            }
          } catch {
            /* skip frame */
          }
        }, frameIntervalMs);
      };
      setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) startSending();
      }, 500);
    };

    ws.onmessage = (event: MessageEvent) => {
      try {
        const raw: HumeStreamMessage = JSON.parse(
          typeof event.data === "string" ? event.data : ""
        );
        onRawMessage?.(raw);
        if (
          "error" in raw &&
          typeof (raw as { error?: string }).error === "string"
        ) {
          const err = new Error(
            `Hume: ${(raw as { error?: string; code?: string }).error}`
          );
          setError(err);
          onError?.(err);
          return;
        }
        const emotions = emotionsFromMessage(raw);
        if (Object.keys(emotions).length > 0) {
          onMessage?.(emotions, raw);
        }
      } catch {
        /* ignore */
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
  }, [enabled, maxFps, onMessage, onError, onRawMessage, stop, options.apiKey]);

  return {
    status,
    error,
    start,
    stop,
    videoRef,
  };
}

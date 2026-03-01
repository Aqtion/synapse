"use client";

import { useEffect, useRef } from "react";
import { Play, Pause, RotateCcw, RotateCw } from "lucide-react";

const PLAYBACK_RATES = [0.5, 1, 1.5, 2] as const;

type ReplayControlsOverlayProps = {
  isPlaying: boolean;
  playbackRate: number;
  onPlayPauseToggle: () => void;
  onSeekBack10: () => void;
  onSeekForward10: () => void;
  onPlaybackRateCycle: () => void;
};

function ReplayControlsOverlay({
  isPlaying,
  playbackRate,
  onPlayPauseToggle,
  onSeekBack10,
  onSeekForward10,
  onPlaybackRateCycle,
}: ReplayControlsOverlayProps) {
  return (
    <>
      <div
        className="absolute inset-0 flex items-end justify-center pb-4 transition-opacity duration-200 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto"
      >
        <div className="flex items-center gap-2 rounded-lg bg-black/70 px-3 py-2 pointer-events-auto">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSeekBack10();
            }}
            className="flex size-9 items-center justify-center rounded-md text-white hover:bg-white/20 transition-colors"
            aria-label="Back 10 seconds"
          >
            <RotateCcw className="size-5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPlayPauseToggle();
            }}
            className="flex size-9 items-center justify-center rounded-md text-white hover:bg-white/20 transition-colors"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause className="size-5" />
            ) : (
              <Play className="size-5 ml-0.5" />
            )}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSeekForward10();
            }}
            className="flex size-9 items-center justify-center rounded-md text-white hover:bg-white/20 transition-colors"
            aria-label="Forward 10 seconds"
          >
            <RotateCw className="size-5" />
          </button>
        </div>
      </div>
      <div
        className="absolute bottom-4 right-4 transition-opacity duration-200 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto"
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPlaybackRateCycle();
          }}
          className="rounded-md bg-black/70 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-black/80 transition-colors"
          aria-label="Playback speed"
        >
          {playbackRate}x
        </button>
      </div>
    </>
  );
}

type SessionReplayPlayerProps = {
  sessionReplayVideoUrl?: string | null;
  currentTimeMs: number;
  sessionStartMs: number;
  sessionEndMs: number;
  isPlaying: boolean;
  playbackRate: number;
  onPlaybackRateChange: (rate: number) => void;
  onPlayPauseToggle: () => void;
  onSeekBack10: () => void;
  onSeekForward10: () => void;
};

export function SessionReplayPlayer({
  sessionReplayVideoUrl,
  currentTimeMs,
  sessionStartMs,
  sessionEndMs,
  isPlaying,
  playbackRate,
  onPlaybackRateChange,
  onPlayPauseToggle,
  onSeekBack10,
  onSeekForward10,
}: SessionReplayPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const cyclePlaybackRate = () => {
    const idx = PLAYBACK_RATES.indexOf(playbackRate as (typeof PLAYBACK_RATES)[number]);
    const next = PLAYBACK_RATES[(idx + 1) % PLAYBACK_RATES.length];
    onPlaybackRateChange(next);
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !sessionReplayVideoUrl) return;
    const timeSeconds = (currentTimeMs - sessionStartMs) / 1000;
    if (Math.abs(video.currentTime - timeSeconds) > 0.5) {
      video.currentTime = Math.max(0, timeSeconds);
    }
  }, [currentTimeMs, sessionStartMs, sessionReplayVideoUrl]);

  const overlay = (
    <ReplayControlsOverlay
      isPlaying={isPlaying}
      playbackRate={playbackRate}
      onPlayPauseToggle={onPlayPauseToggle}
      onSeekBack10={onSeekBack10}
      onSeekForward10={onSeekForward10}
      onPlaybackRateCycle={cyclePlaybackRate}
    />
  );

  if (!sessionReplayVideoUrl) {
    return (
      <div className="group relative w-full h-full flex items-center justify-center bg-muted text-muted-foreground text-sm">
        Session replay not available
        {overlay}
      </div>
    );
  }

  return (
    <div className="group relative w-full h-full bg-black">
      <video
        ref={videoRef}
        src={sessionReplayVideoUrl}
        className="w-full h-full object-contain"
        muted
        playsInline
        preload="metadata"
      />
      {overlay}
    </div>
  );
}

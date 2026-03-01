"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SessionReplayPlayer } from "@/components/analytics/SessionReplayPlayer";
import { EmotionTimelineChart } from "@/components/analytics/EmotionTimelineChart";
import { AnalyticsTranscript } from "@/components/analytics/AnalyticsTranscript";
import { EmotionPieCard } from "@/components/analytics/EmotionPieCard";
import { SupermemorySummaryCard } from "@/components/analytics/SupermemorySummaryCard";
import { AiPromptsAndLinesCard } from "@/components/analytics/AiPromptsAndLinesCard";
import { PrStatusCard } from "@/components/analytics/PrStatusCard";

export default function SandboxAnalyticsPage() {
  const params = useParams();
  const router = useRouter();
  const user_id = params?.user_id as string | undefined;
  const project_id = params?.project_id as string | undefined;
  const sandbox_id = params?.sandbox_id as string | undefined;

  const sandbox = useQuery(
    api.sandboxes.getSandboxForCurrentUser,
    sandbox_id ? { sandboxId: sandbox_id } : "skip",
  );
  const session = useQuery(
    api.analytics.getSessionForSandbox,
    sandbox_id ? { sandboxId: sandbox_id } : "skip",
  );
  const emotionSamples = useQuery(
    api.analytics.getEmotionSamples,
    sandbox_id && session ? { sandboxId: sandbox_id, sessionId: session._id } : "skip",
  );
  const transcript = useQuery(
    api.analytics.getTranscript,
    sandbox_id && session ? { sandboxId: sandbox_id, sessionId: session._id } : "skip",
  );
  const stats = useQuery(
    api.analytics.getStatsForSandbox,
    sandbox_id ? { sandboxId: sandbox_id } : "skip",
  );

  const seedAnalytics = useMutation(api.analytics.seedAnalytics);

  const [playheadTimeMs, setPlayheadTimeMs] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);

  const sessionStartMs = session?.startedAt ?? 0;
  const sessionEndMs = session?.endedAt ?? 0;
  const durationMs = Math.max(0, sessionEndMs - sessionStartMs);

  useEffect(() => {
    if (session && playheadTimeMs === 0) {
      setPlayheadTimeMs(sessionStartMs);
    }
  }, [session, sessionStartMs, playheadTimeMs]);

  useEffect(() => {
    if (!sandbox_id || !user_id || !project_id) return;
    if (sandbox === null) {
      router.replace(`/${user_id}/${project_id}`);
    }
  }, [sandbox_id, user_id, project_id, sandbox, router]);

  const playStartTimeRef = useRef<number>(0);
  const playStartPlayheadRef = useRef<number>(0);
  const playheadTimeMsRef = useRef<number>(playheadTimeMs);

  useEffect(() => {
    playheadTimeMsRef.current = playheadTimeMs;
  }, [playheadTimeMs]);

  useEffect(() => {
    if (!session || !isPlaying || durationMs <= 0) return;
    playStartTimeRef.current = performance.now();
    playStartPlayheadRef.current = playheadTimeMs;
    let rafId: number;
    const tick = () => {
      const elapsed = performance.now() - playStartTimeRef.current;
      const current = playStartPlayheadRef.current + elapsed * playbackRate;
      if (current >= sessionEndMs) {
        setIsPlaying(false);
        setPlayheadTimeMs(sessionEndMs);
        return;
      }
      playheadTimeMsRef.current = current;
      setPlayheadTimeMs(current);
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [session, isPlaying, sessionStartMs, sessionEndMs, durationMs, playbackRate]);

  const playheadClamped = useMemo(() => {
    if (sessionStartMs === 0 && sessionEndMs === 0) return 0;
    return Math.max(sessionStartMs, Math.min(sessionEndMs, playheadTimeMs || sessionStartMs));
  }, [playheadTimeMs, sessionStartMs, sessionEndMs]);

  const handleSeekBack10 = useCallback(() => {
    const current = playheadTimeMsRef.current;
    const next = Math.max(sessionStartMs, Math.min(sessionEndMs, current - 10000));
    setPlayheadTimeMs(next);
    if (isPlaying) {
      playStartTimeRef.current = performance.now();
      playStartPlayheadRef.current = next;
    }
  }, [sessionStartMs, sessionEndMs, isPlaying]);

  const handleSeekForward10 = useCallback(() => {
    const current = playheadTimeMsRef.current;
    const next = Math.max(sessionStartMs, Math.min(sessionEndMs, current + 10000));
    setPlayheadTimeMs(next);
    if (isPlaying) {
      playStartTimeRef.current = performance.now();
      playStartPlayheadRef.current = next;
    }
  }, [sessionStartMs, sessionEndMs, isPlaying]);

  if (!sandbox_id || !user_id || !project_id) return null;

  if (sandbox === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-muted-foreground" aria-label="Loading" />
      </div>
    );
  }

  if (sandbox === null) return null;

  const hasSession = session != null && (emotionSamples?.length ?? 0) > 0;

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
        {!hasSession && (
          <div className="mb-4 flex items-center justify-between">
            <Button
              variant="secondary"
              onClick={() => seedAnalytics({ sandboxId: sandbox_id })}
            >
              Load demo data
            </Button>
          </div>
        )}

      {!hasSession ? (
        <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 p-12 text-center text-muted-foreground">
          <p className="mb-4">No analytics data for this sandbox yet.</p>
          <Button onClick={() => seedAnalytics({ sandboxId: sandbox_id })}>
            Seed demo analytics
          </Button>
        </div>
      ) : (
        <>
          {/* Above the fold: grid 2/3 left (video + chart), 1/3 right (transcript); single row so transcript matches video+chart height */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8 lg:grid-rows-[minmax(0,calc(64vh+1rem))]">
            <div className="lg:col-span-2 grid grid-rows-[minmax(0,32vh)_minmax(0,32vh)] lg:grid-rows-[1fr_1fr] gap-4 min-h-0 h-full">
              <div className="min-h-0 rounded-lg border bg-muted/30 overflow-hidden">
                <SessionReplayPlayer
                  sessionReplayVideoUrl={session?.sessionReplayVideoUrl}
                  currentTimeMs={playheadClamped}
                  sessionStartMs={sessionStartMs}
                  sessionEndMs={sessionEndMs}
                  isPlaying={isPlaying}
                  playbackRate={playbackRate}
                  onPlaybackRateChange={setPlaybackRate}
                  onPlayPauseToggle={() => setIsPlaying((p) => !p)}
                  onSeekBack10={handleSeekBack10}
                  onSeekForward10={handleSeekForward10}
                />
              </div>
              <div className="min-h-0 rounded-lg border bg-muted/30 overflow-hidden">
                <EmotionTimelineChart
                  emotionSamples={emotionSamples ?? []}
                  sessionStartMs={sessionStartMs}
                  sessionEndMs={sessionEndMs}
                  playheadTimeMs={playheadClamped}
                  onPlayheadChange={setPlayheadTimeMs}
                />
              </div>
            </div>
            <div className="min-h-0 h-full rounded-lg border bg-muted/30 overflow-hidden flex flex-col">
              <AnalyticsTranscript
                entries={transcript ?? []}
                currentTimeMs={playheadClamped}
                sessionStartMs={sessionStartMs}
                onSeek={setPlayheadTimeMs}
              />
            </div>
          </div>

          {/* Below the fold: cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <EmotionPieCard emotionSamples={emotionSamples ?? []} />
            <SupermemorySummaryCard summary={session?.supermemorySummary} />
            <AiPromptsAndLinesCard stats={stats} />
            <PrStatusCard sandbox={sandbox} />
          </div>
        </>
      )}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmotionTimelineChart } from "@/components/analytics/EmotionTimelineChart";
import { AnalyticsTranscript } from "@/components/analytics/AnalyticsTranscript";
import { EmotionPieCard } from "@/components/analytics/EmotionPieCard";
import { SupermemorySummaryCard } from "@/components/analytics/SupermemorySummaryCard";
import { AiPromptsAndLinesCard } from "@/components/analytics/AiPromptsAndLinesCard";
import { PrStatusCard } from "@/components/analytics/PrStatusCard";
import { ClickDataCard } from "@/components/analytics/ClickDataCard";
import { EmotionQuadrantPathCard } from "@/components/analytics/EmotionQuadrantPathCard";

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
  const hasTelemetry = useQuery(
    api.analytics.getHasTelemetryForSandbox,
    sandbox_id ? { sandboxId: sandbox_id } : "skip",
  );
  const emotionSamples = useQuery(
    api.analytics.getEmotionSamplesFromTelemetry,
    sandbox_id && session ? { sandboxId: sandbox_id, sessionId: session._id } : "skip",
  );
  const emotionScores = useQuery(
    api.analytics.getEmotionScoresFromTelemetry,
    sandbox_id && session ? { sandboxId: sandbox_id, sessionId: session._id } : "skip",
  );
  const clickDataStats = useQuery(
    api.analytics.getClickDataStats,
    sandbox_id && session ? { sandboxId: sandbox_id, sessionId: session._id } : "skip",
  );
  const missedClicks = useQuery(
    api.analytics.getMissedClicks,
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
  const rafRef = useRef<number | null>(null);
  const lastMsRef = useRef<number>(0);

  const sessionStartMs = session?.startedAt ?? 0;
  const sessionEndMs = session?.endedAt ?? 0;
  const durationMs = Math.max(0, sessionEndMs - sessionStartMs);

  useEffect(() => {
    if (session && playheadTimeMs === 0) {
      setPlayheadTimeMs(sessionStartMs);
    }
  }, [session, sessionStartMs, playheadTimeMs]);

  useEffect(() => {
    if (!isPlaying || durationMs <= 0) return;
    const tick = (now: number) => {
      const elapsed = (now - lastMsRef.current) / 1000;
      lastMsRef.current = now;
      setPlayheadTimeMs((prev) => {
        const next = prev + elapsed * playbackRate * 1000;
        if (next >= sessionEndMs) {
          setIsPlaying(false);
          return sessionEndMs;
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    lastMsRef.current = performance.now();
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, playbackRate, sessionEndMs, durationMs]);

  const onSeekBack10 = useCallback(() => {
    setPlayheadTimeMs((prev) => Math.max(sessionStartMs, prev - 10000));
  }, [sessionStartMs]);
  const onSeekForward10 = useCallback(() => {
    setPlayheadTimeMs((prev) => Math.min(sessionEndMs, prev + 10000));
  }, [sessionEndMs]);
  const PLAYBACK_RATES = [0.5, 1, 1.5, 2] as const;
  const onPlaybackRateCycle = useCallback(() => {
    setPlaybackRate((r) => {
      const idx = PLAYBACK_RATES.indexOf(r as (typeof PLAYBACK_RATES)[number]);
      return PLAYBACK_RATES[(idx + 1) % PLAYBACK_RATES.length];
    });
  }, []);

  useEffect(() => {
    if (!sandbox_id || !user_id || !project_id) return;
    if (sandbox === null) {
      router.replace(`/${user_id}/${project_id}`);
    }
  }, [sandbox_id, user_id, project_id, sandbox, router]);

  const playheadClamped = useMemo(() => {
    if (sessionStartMs === 0 && sessionEndMs === 0) return 0;
    return Math.max(sessionStartMs, Math.min(sessionEndMs, playheadTimeMs || sessionStartMs));
  }, [playheadTimeMs, sessionStartMs, sessionEndMs]);

  /** Map API quadrant shape to legacy EmotionSample shape for timeline chart and pie. */
  const emotionSamplesLegacy = useMemo(() => {
    const raw = emotionSamples ?? [];
    return raw.map((s) => ({
      timestampMs: s.timestampMs,
      lowEnergyUnpleasant: s.unpleasantLowEnergy,
      lowEnergyPleasant: s.pleasantLowEnergy,
      highEnergyPleasant: s.pleasantHighEnergy,
      highEnergyUnpleasant: s.unpleasantHighEnergy,
    }));
  }, [emotionSamples]);

  if (!sandbox_id || !user_id || !project_id) return null;

  if (sandbox === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-muted-foreground" aria-label="Loading" />
      </div>
    );
  }

  if (sandbox === null) return null;

  // Show analytics layout (and never show seed) if there's any session or any telemetry (mouse, emotion, etc.) for this sandbox.
  // Only show seed prompt when we've confirmed both are missing (hasTelemetry === false and no session).
  const hasData = session != null || hasTelemetry !== false;

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 overflow-visible">
        {!hasData && (
          <div className="mb-4 flex items-center justify-between">
            <Button
              variant="secondary"
              onClick={() => seedAnalytics({ sandboxId: sandbox_id })}
            >
              Load demo data
            </Button>
          </div>
        )}

      {!hasData ? (
        <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 p-12 text-center text-muted-foreground">
          <p className="mb-4">No analytics data for this sandbox yet.</p>
          <Button onClick={() => seedAnalytics({ sandboxId: sandbox_id })}>
            Seed demo analytics
          </Button>
        </div>
      ) : (
        <>
          {/* Above the fold: 2/3 left = emotion chart (2 rows × 2 cols size), 1/3 right = transcript */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-8 lg:grid-rows-[minmax(0,calc(64vh+1rem))]">
            <div className="lg:col-span-3 min-h-0 rounded-lg border bg-muted/30 overflow-visible">
              <EmotionTimelineChart
                emotionSamples={emotionSamplesLegacy}
                sessionStartMs={sessionStartMs}
                sessionEndMs={sessionEndMs}
                playheadTimeMs={playheadClamped}
                onPlayheadChange={setPlayheadTimeMs}
                isPlaying={isPlaying}
                playbackRate={playbackRate}
                onPlayPauseToggle={() => setIsPlaying((p) => !p)}
                onSeekBack10={onSeekBack10}
                onSeekForward10={onSeekForward10}
                onPlaybackRateCycle={onPlaybackRateCycle}
                emotionScores={emotionScores ?? undefined}
              />
            </div>
            <div className="min-h-0 h-full rounded-lg border bg-muted/30 overflow-visible flex flex-col">
              <AnalyticsTranscript
                entries={transcript ?? []}
                currentTimeMs={playheadClamped}
                sessionStartMs={sessionStartMs}
                onSeek={setPlayheadTimeMs}
              />
            </div>
          </div>

          {/* Below the fold: cards - overflow-visible so tooltips can float above grid. Click data spans 3 cols. */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 overflow-visible [&>*]:overflow-visible">
            <EmotionQuadrantPathCard
              emotionSamples={emotionSamples ?? []}
              sessionStartMs={sessionStartMs}
              sessionEndMs={sessionEndMs}
              playheadTimeMs={playheadClamped}
            />
            <SupermemorySummaryCard summary={session?.supermemorySummary} />
            <AiPromptsAndLinesCard stats={stats} />
            <PrStatusCard sandbox={sandbox} />
            <ClickDataCard
              stats={clickDataStats ?? undefined}
              missedClicks={missedClicks ?? undefined}
              sessionStartMs={sessionStartMs}
            />
            <EmotionPieCard
              emotionSamples={emotionSamplesLegacy}
              emotionScores={emotionScores ?? undefined}
            />
          </div>
        </>
      )}
    </div>
  );
}

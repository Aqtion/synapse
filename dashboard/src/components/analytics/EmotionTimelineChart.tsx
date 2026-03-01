"use client";

import { memo, useCallback, useMemo, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { EMOTION_CATEGORY_COLORS, EMOTION_CATEGORY_LABELS } from "@/lib/emotion-categories";

export type EmotionSample = {
  timestampMs: number;
  lowEnergyUnpleasant: number;
  lowEnergyPleasant: number;
  highEnergyPleasant: number;
  highEnergyUnpleasant: number;
};

const chartConfig: ChartConfig = {
  lowEnergyUnpleasant: { label: EMOTION_CATEGORY_LABELS.lowEnergyUnpleasant, color: EMOTION_CATEGORY_COLORS.lowEnergyUnpleasant },
  lowEnergyPleasant: { label: EMOTION_CATEGORY_LABELS.lowEnergyPleasant, color: EMOTION_CATEGORY_COLORS.lowEnergyPleasant },
  highEnergyPleasant: { label: EMOTION_CATEGORY_LABELS.highEnergyPleasant, color: EMOTION_CATEGORY_COLORS.highEnergyPleasant },
  highEnergyUnpleasant: { label: EMOTION_CATEGORY_LABELS.highEnergyUnpleasant, color: EMOTION_CATEGORY_COLORS.highEnergyUnpleasant },
  time: { label: "Time" },
};

type EmotionTimelineChartProps = {
  emotionSamples: EmotionSample[];
  sessionStartMs: number;
  sessionEndMs: number;
  playheadTimeMs: number;
  onPlayheadChange: (ms: number) => void;
};

type ChartCoreProps = {
  data: Array<EmotionSample & { timeSeconds: number }>;
  durationMs: number;
  yMax: number;
  playheadTimeSeconds: number;
};

const EmotionChartCore = memo(function EmotionChartCore({
  data,
  durationMs,
  yMax,
  playheadTimeSeconds,
}: ChartCoreProps) {
  return (
    <ChartContainer config={chartConfig} className="h-full w-full [&_.recharts-reference-line]:pointer-events-none">
      <AreaChart
        accessibilityLayer
        data={data}
        margin={{ left: 12, right: 12, top: 8, bottom: 8 }}
      >
        <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="timeSeconds"
          type="number"
          domain={[0, durationMs / 1000]}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={(v) => `${Math.floor(v / 60)}:${String(Math.floor(v % 60)).padStart(2, "0")}`}
          className="text-xs"
        />
        <YAxis hide domain={[0, yMax]} />
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        <ReferenceLine
          x={playheadTimeSeconds}
          stroke="var(--foreground)"
          strokeWidth={2}
          strokeOpacity={1}
          className="z-10"
        />
        <defs>
              <linearGradient id="fillLowEnergyUnpleasant" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-lowEnergyUnpleasant)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-lowEnergyUnpleasant)" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="fillLowEnergyPleasant" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-lowEnergyPleasant)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-lowEnergyPleasant)" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="fillHighEnergyPleasant" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-highEnergyPleasant)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-highEnergyPleasant)" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="fillHighEnergyUnpleasant" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-highEnergyUnpleasant)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-highEnergyUnpleasant)" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <Area
              type="natural"
              dataKey="lowEnergyUnpleasant"
              fill="url(#fillLowEnergyUnpleasant)"
              fillOpacity={0.4}
              stroke="var(--color-lowEnergyUnpleasant)"
              strokeWidth={1.5}
            />
            <Area
              type="natural"
              dataKey="lowEnergyPleasant"
              fill="url(#fillLowEnergyPleasant)"
              fillOpacity={0.4}
              stroke="var(--color-lowEnergyPleasant)"
              strokeWidth={1.5}
            />
            <Area
              type="natural"
              dataKey="highEnergyPleasant"
              fill="url(#fillHighEnergyPleasant)"
              fillOpacity={0.4}
              stroke="var(--color-highEnergyPleasant)"
              strokeWidth={1.5}
            />
            <Area
              type="natural"
              dataKey="highEnergyUnpleasant"
              fill="url(#fillHighEnergyUnpleasant)"
              fillOpacity={0.4}
              stroke="var(--color-highEnergyUnpleasant)"
              strokeWidth={1.5}
            />
          </AreaChart>
    </ChartContainer>
  );
});

function EmotionTimelineChartInner({
  emotionSamples,
  sessionStartMs,
  sessionEndMs,
  playheadTimeMs,
  onPlayheadChange,
}: EmotionTimelineChartProps) {
  const durationMs = Math.max(0, sessionEndMs - sessionStartMs);

  const SAMPLE_EVERY_N = 5;

  const fullData = useMemo(
    () =>
      emotionSamples.map((s) => ({
        ...s,
        timeSeconds: (s.timestampMs - sessionStartMs) / 1000,
      })),
    [emotionSamples, sessionStartMs],
  );

  const data = useMemo(() => {
    if (fullData.length <= SAMPLE_EVERY_N) return fullData;
    const sampled: typeof fullData = [];
    for (let i = 0; i < fullData.length; i++) {
      if (i % SAMPLE_EVERY_N === 0 || i === fullData.length - 1) {
        sampled.push(fullData[i]!);
      }
    }
    return sampled;
  }, [fullData]);

  const yMax = useMemo(() => {
    if (fullData.length === 0) return 1;
    let max = 0;
    for (const d of fullData) {
      max = Math.max(
        max,
        d.lowEnergyUnpleasant,
        d.lowEnergyPleasant,
        d.highEnergyPleasant,
        d.highEnergyUnpleasant,
      );
    }
    return Math.max(max, 0.01) + 0.15;
  }, [fullData]);

  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverTimeSeconds, setHoverTimeSeconds] = useState<number | null>(null);
  const hoverTargetRef = useRef<number | null>(null);
  const hoverRafRef = useRef<number | null>(null);

  const handleChartMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const el = containerRef.current;
      if (!el || durationMs <= 0) return;
      const rect = el.getBoundingClientRect();
      const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const target = fraction * (durationMs / 1000);
      hoverTargetRef.current = target;
      if (hoverRafRef.current === null) {
        hoverRafRef.current = requestAnimationFrame(() => {
          hoverRafRef.current = null;
          if (hoverTargetRef.current !== null) {
            setHoverTimeSeconds(hoverTargetRef.current);
          }
        });
      }
    },
    [durationMs],
  );

  const handleChartMouseLeave = useCallback(() => {
    hoverTargetRef.current = null;
    if (hoverRafRef.current !== null) {
      cancelAnimationFrame(hoverRafRef.current);
      hoverRafRef.current = null;
    }
    setHoverTimeSeconds(null);
  }, []);

  const handleChartClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const el = containerRef.current;
      if (!el || durationMs <= 0) return;
      const rect = el.getBoundingClientRect();
      const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const ms = sessionStartMs + fraction * durationMs;
      onPlayheadChange(ms);
    },
    [durationMs, sessionStartMs, onPlayheadChange],
  );

  const playheadTimeSeconds = durationMs > 0 ? (playheadTimeMs - sessionStartMs) / 1000 : 0;

  if (data.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
        No emotion data
      </div>
    );
  }

  const durationSeconds = durationMs / 1000;
  const hoverPercent = hoverTimeSeconds != null && durationSeconds > 0
    ? (hoverTimeSeconds / durationSeconds) * 100
    : null;

  return (
    <div className="w-full h-full flex flex-col">
      <div
        ref={containerRef}
        onClick={handleChartClick}
        onMouseMove={handleChartMouseMove}
        onMouseLeave={handleChartMouseLeave}
        className="flex-1 min-h-0 w-full relative cursor-crosshair"
      >
        <EmotionChartCore
          data={data}
          durationMs={durationMs}
          yMax={yMax}
          playheadTimeSeconds={playheadTimeSeconds}
        />
        {hoverPercent != null && (
          <div
            className="absolute inset-0 pointer-events-none z-10"
            style={{ left: 0, top: 0, right: 0, bottom: 0 }}
          >
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-foreground/35"
              style={{ left: `${hoverPercent}%`, transform: "translateX(-50%)" }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export const EmotionTimelineChart = memo(EmotionTimelineChartInner);

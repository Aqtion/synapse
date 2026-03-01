"use client";

import { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { EMOTION_CATEGORY_COLORS, EMOTION_CATEGORY_LABELS } from "@/lib/emotion-categories";

type EmotionSample = {
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
};

type EmotionPieCardProps = {
  emotionSamples: EmotionSample[];
};

export function EmotionPieCard({ emotionSamples }: EmotionPieCardProps) {
  const pieData = useMemo(() => {
    if (emotionSamples.length === 0)
      return [
        { name: "lowEnergyUnpleasant", value: 1, fill: EMOTION_CATEGORY_COLORS.lowEnergyUnpleasant },
        { name: "lowEnergyPleasant", value: 1, fill: EMOTION_CATEGORY_COLORS.lowEnergyPleasant },
        { name: "highEnergyPleasant", value: 1, fill: EMOTION_CATEGORY_COLORS.highEnergyPleasant },
        { name: "highEnergyUnpleasant", value: 1, fill: EMOTION_CATEGORY_COLORS.highEnergyUnpleasant },
      ];
    const sums = emotionSamples.reduce(
      (acc, s) => ({
        lowEnergyUnpleasant: acc.lowEnergyUnpleasant + s.lowEnergyUnpleasant,
        lowEnergyPleasant: acc.lowEnergyPleasant + s.lowEnergyPleasant,
        highEnergyPleasant: acc.highEnergyPleasant + s.highEnergyPleasant,
        highEnergyUnpleasant: acc.highEnergyUnpleasant + s.highEnergyUnpleasant,
      }),
      { lowEnergyUnpleasant: 0, lowEnergyPleasant: 0, highEnergyPleasant: 0, highEnergyUnpleasant: 0 },
    );
    const total =
      sums.lowEnergyUnpleasant +
      sums.lowEnergyPleasant +
      sums.highEnergyPleasant +
      sums.highEnergyUnpleasant;
    if (total === 0) {
      return [
        { name: "lowEnergyUnpleasant", value: 1, fill: EMOTION_CATEGORY_COLORS.lowEnergyUnpleasant },
        { name: "lowEnergyPleasant", value: 1, fill: EMOTION_CATEGORY_COLORS.lowEnergyPleasant },
        { name: "highEnergyPleasant", value: 1, fill: EMOTION_CATEGORY_COLORS.highEnergyPleasant },
        { name: "highEnergyUnpleasant", value: 1, fill: EMOTION_CATEGORY_COLORS.highEnergyUnpleasant },
      ];
    }
    return [
      { name: "lowEnergyUnpleasant", value: sums.lowEnergyUnpleasant, fill: EMOTION_CATEGORY_COLORS.lowEnergyUnpleasant },
      { name: "lowEnergyPleasant", value: sums.lowEnergyPleasant, fill: EMOTION_CATEGORY_COLORS.lowEnergyPleasant },
      { name: "highEnergyPleasant", value: sums.highEnergyPleasant, fill: EMOTION_CATEGORY_COLORS.highEnergyPleasant },
      { name: "highEnergyUnpleasant", value: sums.highEnergyUnpleasant, fill: EMOTION_CATEGORY_COLORS.highEnergyUnpleasant },
    ];
  }, [emotionSamples]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Emotion split</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[180px] w-full">
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={70}
              paddingAngle={2}
              label={({ name }) => chartConfig[name]?.label ?? name}
            >
              {pieData.map((entry, i) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

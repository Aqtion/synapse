/**
 * Maps the 50 Hume-style emotions to four quadrants for the analytics area chart:
 * - Blue: low energy, unpleasant
 * - Green: low energy, pleasant
 * - Yellow: high energy, pleasant
 * - Red: high energy, unpleasant
 */
export type EmotionCategory = "lowEnergyUnpleasant" | "lowEnergyPleasant" | "highEnergyPleasant" | "highEnergyUnpleasant";

export const EMOTION_CATEGORY_COLORS: Record<EmotionCategory, string> = {
  lowEnergyUnpleasant: "#3b82f6",
  lowEnergyPleasant: "#22c55e",
  highEnergyPleasant: "#eab308",
  highEnergyUnpleasant: "#ef4444",
};

export const EMOTION_CATEGORY_LABELS: Record<EmotionCategory, string> = {
  lowEnergyUnpleasant: "Sad",
  lowEnergyPleasant: "Content",
  highEnergyPleasant: "Happy",
  highEnergyUnpleasant: "Angry",
};

const LOW_ENERGY_UNPLEASANT = [
  "Sadness",
  "Boredom",
  "Tiredness",
  "Disappointment",
  "Distress",
  "Shame",
  "Guilt",
  "Pain",
  "Empathic Pain",
  "Confusion",
  "Doubt",
  "Awkwardness",
  "Embarrassment",
  "Contempt",
  "Disgust",
  "Horror",
  "Surprise (negative)",
] as const;

const LOW_ENERGY_PLEASANT = [
  "Calmness",
  "Contentment",
  "Satisfaction",
  "Relief",
  "Aesthetic Appreciation",
  "Contemplation",
  "Concentration",
  "Love",
  "Nostalgia",
  "Romance",
  "Sympathy",
  "Admiration",
  "Adoration",
  "Realization",
  "Entrancement",
  "Awe",
] as const;

const HIGH_ENERGY_PLEASANT = [
  "Excitement",
  "Joy",
  "Amusement",
  "Triumph",
  "Pride",
  "Desire",
  "Interest",
  "Surprise (positive)",
  "Ecstasy",
] as const;

const HIGH_ENERGY_UNPLEASANT = [
  "Anger",
  "Anxiety",
  "Fear",
  "Envy",
  "Craving",
  "Determination",
] as const;

const MAP: Record<string, EmotionCategory> = {};
LOW_ENERGY_UNPLEASANT.forEach((e) => (MAP[e] = "lowEnergyUnpleasant"));
LOW_ENERGY_PLEASANT.forEach((e) => (MAP[e] = "lowEnergyPleasant"));
HIGH_ENERGY_PLEASANT.forEach((e) => (MAP[e] = "highEnergyPleasant"));
HIGH_ENERGY_UNPLEASANT.forEach((e) => (MAP[e] = "highEnergyUnpleasant"));

export function getEmotionCategory(emotionLabel: string): EmotionCategory {
  return MAP[emotionLabel] ?? "lowEnergyPleasant";
}

export const ALL_EMOTIONS = [
  ...LOW_ENERGY_UNPLEASANT,
  ...LOW_ENERGY_PLEASANT,
  ...HIGH_ENERGY_PLEASANT,
  ...HIGH_ENERGY_UNPLEASANT,
] as const;

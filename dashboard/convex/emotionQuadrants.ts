/**
 * Maps Hume emotion names to the four quadrants used by sandboxEmotionSamples
 * and the analytics area chart. Mirrors dashboard/src/lib/emotion-categories.ts.
 */
export type EmotionQuadrant =
  | "lowEnergyUnpleasant"
  | "lowEnergyPleasant"
  | "highEnergyPleasant"
  | "highEnergyUnpleasant";

const LOW_ENERGY_UNPLEASANT = new Set([
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
]);

const LOW_ENERGY_PLEASANT = new Set([
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
]);

const HIGH_ENERGY_PLEASANT = new Set([
  "Excitement",
  "Joy",
  "Amusement",
  "Triumph",
  "Pride",
  "Desire",
  "Interest",
  "Surprise (positive)",
  "Ecstasy",
]);

const HIGH_ENERGY_UNPLEASANT = new Set([
  "Anger",
  "Anxiety",
  "Fear",
  "Envy",
  "Craving",
  "Determination",
]);

function getQuadrant(name: string): EmotionQuadrant {
  if (LOW_ENERGY_UNPLEASANT.has(name)) return "lowEnergyUnpleasant";
  if (LOW_ENERGY_PLEASANT.has(name)) return "lowEnergyPleasant";
  if (HIGH_ENERGY_PLEASANT.has(name)) return "highEnergyPleasant";
  if (HIGH_ENERGY_UNPLEASANT.has(name)) return "highEnergyUnpleasant";
  return "lowEnergyPleasant";
}

export type QuadrantScores = {
  lowEnergyUnpleasant: number;
  lowEnergyPleasant: number;
  highEnergyPleasant: number;
  highEnergyUnpleasant: number;
};

/**
 * Parse Hume raw payload (face.predictions[].emotions[]) into four quadrant scores.
 * Returns values normalized so they sum to 1 (suitable for area chart).
 */
export function humePayloadToQuadrantScores(rawPayload: unknown): QuadrantScores {
  const out: QuadrantScores = {
    lowEnergyUnpleasant: 0,
    lowEnergyPleasant: 0,
    highEnergyPleasant: 0,
    highEnergyUnpleasant: 0,
  };
  const raw = rawPayload as Record<string, unknown>;
  const face =
    raw?.face ?? (raw?.models_success as Record<string, unknown> | undefined)?.face;
  const predictions = (face as Record<string, unknown> | undefined)?.predictions;
  if (!Array.isArray(predictions)) return out;
  for (const p of predictions) {
    const emotions = (p as Record<string, unknown>)?.emotions;
    if (!Array.isArray(emotions)) continue;
    for (const e of emotions) {
      const name = (e as Record<string, unknown>)?.name;
      const score = (e as Record<string, unknown>)?.score;
      if (typeof name !== "string" || typeof score !== "number") continue;
      const q = getQuadrant(name);
      out[q] += score;
    }
  }
  const sum =
    out.lowEnergyUnpleasant +
    out.lowEnergyPleasant +
    out.highEnergyPleasant +
    out.highEnergyUnpleasant;
  if (sum <= 0) {
    out.lowEnergyPleasant = 1;
    return out;
  }
  out.lowEnergyUnpleasant /= sum;
  out.lowEnergyPleasant /= sum;
  out.highEnergyPleasant /= sum;
  out.highEnergyUnpleasant /= sum;
  return out;
}

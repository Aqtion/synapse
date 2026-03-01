import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { humePayloadToQuadrantScores } from "./emotionQuadrants";

export const insertHumeSample = mutation({
  args: {
    sandboxId: v.string(),
    sessionId: v.string(),
    timestampMs: v.number(),
    rawPayload: v.any(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("telemetrySamples", {
      sandboxId: args.sandboxId,
      sessionId: args.sessionId,
      timestampMs: args.timestampMs,
      source: "hume",
      payload: args.rawPayload,
    });
    const quadrants = humePayloadToQuadrantScores(args.rawPayload);
    await ctx.db.insert("sandboxEmotionSamples", {
      sandboxId: args.sandboxId,
      sessionId: args.sessionId,
      timestampMs: args.timestampMs,
      lowEnergyUnpleasant: quadrants.lowEnergyUnpleasant,
      lowEnergyPleasant: quadrants.lowEnergyPleasant,
      highEnergyPleasant: quadrants.highEnergyPleasant,
      highEnergyUnpleasant: quadrants.highEnergyUnpleasant,
    });
  },
});

export const insertMouseSample = mutation({
  args: {
    sandboxId: v.string(),
    sessionId: v.string(),
    timestampMs: v.number(),
    payload: v.any(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("telemetrySamples", {
      sandboxId: args.sandboxId,
      sessionId: args.sessionId,
      timestampMs: args.timestampMs,
      source: "mouse",
      payload: args.payload,
    });
  },
});

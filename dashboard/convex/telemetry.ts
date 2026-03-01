import { mutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { v } from "convex/values";

const SOURCE_HUME_EMOTION = "hume_emotion";

/**
 * Returns true if the current identity can write telemetry for this sandbox
 * (same rules as sandbox access: owner, project member, or legacy sandbox).
 */
async function canWriteTelemetry(ctx: MutationCtx, sandboxId: string): Promise<boolean> {
  const row = await ctx.db
    .query("sandboxes")
    .filter((q) => q.eq(q.field("id"), sandboxId))
    .first();
  if (!row) return false;
  if (!row.projectId) return true;
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return false;
  const userId = (identity as { subject?: string }).subject;
  if (!userId) return false;
  const project = await ctx.db
    .query("projects")
    .filter((q) => q.eq(q.field("id"), row.projectId))
    .first();
  if (!project) return false;
  if (project.userId === userId) return true;
  const member = await ctx.db
    .query("projectMembers")
    .withIndex("by_projectId_userId", (q) =>
      q.eq("projectId", row.projectId!).eq("userId", userId),
    )
    .first();
  return !!member;
}

/**
 * Inserts a raw Hume emotion payload for a sandbox session.
 * Use sessionId + sandboxId + timestampMs to align with other streams later.
 */
export const insertHumeSample = mutation({
  args: {
    sandboxId: v.string(),
    sessionId: v.string(),
    timestampMs: v.number(),
    rawPayload: v.any(),
  },
  handler: async (ctx, args) => {
    const allowed = await canWriteTelemetry(ctx, args.sandboxId);
    if (!allowed) {
      throw new Error("You do not have access to this sandbox");
    }
    await ctx.db.insert("telemetrySamples", {
      sandboxId: args.sandboxId,
      sessionId: args.sessionId,
      timestampMs: args.timestampMs,
      source: SOURCE_HUME_EMOTION,
      payload: args.rawPayload,
    });
  },
});

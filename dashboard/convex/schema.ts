import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  runs: defineTable({
    sandboxId: v.optional(v.string()),
    prompt: v.string(),
    output: v.string(),
    success: v.boolean(),
    errorMessage: v.optional(v.string()),
  }),
  sandboxes: defineTable({
    id: v.string(),
    name: v.string(),
    createdAt: v.number(),
    lastOpenedAt: v.number(),
    testerEmail: v.optional(v.string()),
    testerUserId: v.optional(v.string()),
    testerName: v.optional(v.string()),
    githubRepo: v.optional(v.string()),
    prUrl: v.optional(v.string()),
    prNumber: v.optional(v.number()),
  }).index("by_lastOpenedAt", ["lastOpenedAt"]).index("by_sandbox_id", ["id"]),
});


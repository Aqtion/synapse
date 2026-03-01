import type { MutationCtx, QueryCtx } from "./_generated/server";
import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";

async function userCanAccessSandbox(ctx: QueryCtx, sandboxId: string): Promise<boolean> {
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

export const getSessionForSandbox = query({
  args: { sandboxId: v.string(), sessionId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const canAccess = await userCanAccessSandbox(ctx, args.sandboxId);
    if (!canAccess) return null;
    const sessions = await ctx.db
      .query("sandboxAnalyticsSessions")
      .withIndex("by_sandboxId", (q) => q.eq("sandboxId", args.sandboxId))
      .collect();
    if (sessions.length === 0) return null;
    const session = args.sessionId
      ? sessions.find((s) => s._id === args.sessionId) ?? sessions[0]
      : sessions.sort((a, b) => b.endedAt - a.endedAt)[0];
    return session;
  },
});

export const getEmotionSamples = query({
  args: { sandboxId: v.string(), sessionId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const canAccess = await userCanAccessSandbox(ctx, args.sandboxId);
    if (!canAccess) return [];
    const samples = await ctx.db
      .query("sandboxEmotionSamples")
      .withIndex("by_sandboxId", (q) => q.eq("sandboxId", args.sandboxId))
      .collect();
    const filtered = args.sessionId
      ? samples.filter((s) => s.sessionId === args.sessionId)
      : samples;
    return filtered.sort((a, b) => a.timestampMs - b.timestampMs);
  },
});

export const getTranscript = query({
  args: { sandboxId: v.string(), sessionId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const canAccess = await userCanAccessSandbox(ctx, args.sandboxId);
    if (!canAccess) return [];
    const entries = await ctx.db
      .query("sandboxTranscriptEntries")
      .withIndex("by_sandboxId", (q) => q.eq("sandboxId", args.sandboxId))
      .collect();
    const filtered = args.sessionId
      ? entries.filter((e) => e.sessionId === args.sessionId)
      : entries;
    return filtered.sort((a, b) => a.timestampMs - b.timestampMs);
  },
});

export const getStatsForSandbox = query({
  args: { sandboxId: v.string() },
  handler: async (ctx, args) => {
    const canAccess = await userCanAccessSandbox(ctx, args.sandboxId);
    if (!canAccess) return null;
    return await ctx.db
      .query("sandboxAnalyticsStats")
      .withIndex("by_sandboxId", (q) => q.eq("sandboxId", args.sandboxId))
      .first();
  },
});

/**
 * Insert a single transcript entry (e.g. from ElevenLabs STT). Requires sandbox access.
 */
export const insertTranscriptEntry = mutation({
  args: {
    sandboxId: v.string(),
    timestampMs: v.number(),
    text: v.string(),
    sessionId: v.optional(v.string()),
    isAiPrompt: v.optional(v.boolean()),
    fromMic: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const canAccess = await userCanAccessSandboxMutation(ctx, args.sandboxId);
    if (!canAccess) throw new Error("You do not have access to this sandbox");
    await ctx.db.insert("sandboxTranscriptEntries", {
      sandboxId: args.sandboxId,
      sessionId: args.sessionId,
      timestampMs: args.timestampMs,
      text: args.text,
      isAiPrompt: args.isAiPrompt ?? false,
      fromMic: args.fromMic ?? false,
    });
  },
});

/**
 * Start a voice/transcript session for a sandbox. Call when the user first produces
 * a committed transcript in a visit. Returns the session id to pass to insertTranscriptEntry.
 */
export const startVoiceSession = mutation({
  args: { sandboxId: v.string() },
  handler: async (ctx, args) => {
    const canAccess = await userCanAccessSandboxMutation(ctx, args.sandboxId);
    if (!canAccess) throw new Error("You do not have access to this sandbox");
    const now = Date.now();
    const sessionId = await ctx.db.insert("sandboxAnalyticsSessions", {
      sandboxId: args.sandboxId,
      startedAt: now,
      endedAt: now,
    });
    return sessionId;
  },
});

/**
 * End a voice session (set endedAt to now). Call when the user leaves the sandbox
 * or stops the voice session so the analytics timeline has a correct duration.
 */
export const endVoiceSession = mutation({
  args: { sessionId: v.id("sandboxAnalyticsSessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return;
    const canAccess = await userCanAccessSandboxMutation(ctx, session.sandboxId);
    if (!canAccess) throw new Error("You do not have access to this session");
    await ctx.db.patch(args.sessionId, { endedAt: Date.now() });
  },
});

/**
 * Seeds analytics data for a sandbox (1fps emotion samples, transcript, session, stats).
 * Call from dashboard or Convex dashboard for a given sandboxId.
 */
export const seedAnalyticsForSandbox = internalMutation({
  args: {
    sandboxId: v.string(),
    sessionDurationSeconds: v.optional(v.number()),
    sessionReplayVideoUrl: v.optional(v.string()),
    supermemorySummary: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const durationSec = args.sessionDurationSeconds ?? 120;
    const startedAt = Date.now() - durationSec * 1000;
    const endedAt = Date.now();

    const sessionId = await ctx.db.insert("sandboxAnalyticsSessions", {
      sandboxId: args.sandboxId,
      startedAt,
      endedAt,
      sessionReplayVideoUrl: args.sessionReplayVideoUrl,
      supermemorySummary:
        args.supermemorySummary ??
        "User explored the sandbox, made several UI changes, and used AI to refine the layout. Key moments included adding a sidebar and adjusting colors.",
    });

    const startMs = startedAt;
    const stepMs = 1000;
    const n = Math.floor((durationSec * 1000) / stepMs);

    const emotionKeys = [
      "lowEnergyUnpleasant",
      "lowEnergyPleasant",
      "highEnergyPleasant",
      "highEnergyUnpleasant",
    ] as const;
    const segmentLength = Math.max(5, Math.floor(n / 16));
    const sessionIdStr = sessionId as unknown as string;
    for (let i = 0; i <= n; i++) {
      const t = startMs + i * stepMs;
      const segmentIndex = Math.floor(i / segmentLength) % emotionKeys.length;
      const dominant = emotionKeys[segmentIndex]!;
      const useHalf = (i % segmentLength) >= segmentLength - 2;
      const value = useHalf ? 0.5 : 0.85 + Math.random() * 0.15;
      const sample: Record<string, number> = {
        lowEnergyUnpleasant: 0,
        lowEnergyPleasant: 0,
        highEnergyPleasant: 0,
        highEnergyUnpleasant: 0,
      };
      sample[dominant] = value;
      await ctx.db.insert("sandboxEmotionSamples", {
        sandboxId: args.sandboxId,
        sessionId: sessionIdStr,
        timestampMs: t,
        lowEnergyUnpleasant: sample.lowEnergyUnpleasant,
        lowEnergyPleasant: sample.lowEnergyPleasant,
        highEnergyPleasant: sample.highEnergyPleasant,
        highEnergyUnpleasant: sample.highEnergyUnpleasant,
      });
    }

    const transcriptTexts: { text: string; isAiPrompt: boolean }[] = [
      { text: "Let me try opening this panel.", isAiPrompt: false },
      { text: "Make the header blue and add a logo.", isAiPrompt: true },
      { text: "That looks good. Can we try a different font?", isAiPrompt: false },
      { text: "Use Inter for the body and keep the heading bold.", isAiPrompt: true },
      { text: "I want to add a sidebar on the left.", isAiPrompt: true },
      { text: "Perfect. Now show the user name at the top right.", isAiPrompt: true },
      { text: "The layout is a bit cramped on mobile.", isAiPrompt: false },
      { text: "Make the sidebar collapse on small screens.", isAiPrompt: true },
      { text: "I think we need more padding around the cards.", isAiPrompt: false },
      { text: "Add 16px padding to the card container and round the corners.", isAiPrompt: true },
      { text: "What about dark mode? Does this support it?", isAiPrompt: false },
      { text: "Add a dark theme using CSS variables for background and text.", isAiPrompt: true },
      { text: "The button feels a bit small on touch devices.", isAiPrompt: false },
      { text: "Increase minimum touch target size to 44px for primary buttons.", isAiPrompt: true },
      { text: "Can we add a loading state when submitting?", isAiPrompt: false },
      { text: "Show a spinner on the submit button and disable it while loading.", isAiPrompt: true },
      { text: "The form validation message is easy to miss.", isAiPrompt: false },
      { text: "Display validation errors in red below each field with an icon.", isAiPrompt: true },
      { text: "I'd like to see a confirmation before deleting.", isAiPrompt: false },
      { text: "Add a confirmation dialog when the user clicks delete.", isAiPrompt: true },
      { text: "The table could use sortable column headers.", isAiPrompt: false },
      { text: "Make the table headers clickable to sort ascending and descending.", isAiPrompt: true },
      { text: "We need to handle empty state when there's no data.", isAiPrompt: false },
      { text: "Show an empty state illustration and message when the list is empty.", isAiPrompt: true },
      { text: "The search could highlight matching text in results.", isAiPrompt: false },
      { text: "Highlight the search query in the result snippets.", isAiPrompt: true },
      { text: "Can we add keyboard shortcuts for power users?", isAiPrompt: false },
      { text: "Add Ctrl+K for search and Escape to close modals.", isAiPrompt: true },
      { text: "The tooltip is cut off on the right edge of the screen.", isAiPrompt: false },
      { text: "Flip tooltip placement when near the viewport edge.", isAiPrompt: true },
      { text: "I want to export this data as CSV.", isAiPrompt: false },
      { text: "Add an Export button that downloads the current view as CSV.", isAiPrompt: true },
      { text: "The chart legend is overlapping the graph on small screens.", isAiPrompt: false },
      { text: "Move the legend below the chart on viewports under 640px.", isAiPrompt: true },
      { text: "We should show a success toast after saving.", isAiPrompt: false },
      { text: "Display a toast notification when the form is saved successfully.", isAiPrompt: true },
      { text: "The nav could indicate the current page more clearly.", isAiPrompt: false },
      { text: "Add an active state and subtle background to the current nav item.", isAiPrompt: true },
      { text: "That should be enough to test the auto-scroll and highlighting.", isAiPrompt: false },
    ];

    const segmentDurationMs = (endedAt - startMs) / transcriptTexts.length;
    transcriptTexts.forEach((item, i) => {
      ctx.db.insert("sandboxTranscriptEntries", {
        sandboxId: args.sandboxId,
        sessionId: sessionIdStr,
        timestampMs: Math.floor(startMs + i * segmentDurationMs),
        text: item.text,
        isAiPrompt: item.isAiPrompt,
        fromMic: false,
      });
    });

    const existingStats = await ctx.db
      .query("sandboxAnalyticsStats")
      .withIndex("by_sandboxId", (q) => q.eq("sandboxId", args.sandboxId))
      .first();

    const aiPromptCount = transcriptTexts.filter((t) => t.isAiPrompt).length;
    const lastUpdated = Date.now();
    if (existingStats) {
      await ctx.db.patch(existingStats._id, {
        aiPromptCount,
        linesChanged: 42,
        lastUpdated,
      });
    } else {
      await ctx.db.insert("sandboxAnalyticsStats", {
        sandboxId: args.sandboxId,
        aiPromptCount,
        linesChanged: 42,
        lastUpdated,
      });
    }

    return { sessionId, samplesCount: n + 1, transcriptCount: transcriptTexts.length };
  },
});

async function userCanAccessSandboxMutation(ctx: MutationCtx, sandboxId: string): Promise<boolean> {
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

/** Public mutation to seed analytics for a sandbox (for "Load demo data" in UI). */
export const seedAnalytics = mutation({
  args: {
    sandboxId: v.string(),
    sessionDurationSeconds: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const canAccess = await userCanAccessSandboxMutation(ctx, args.sandboxId);
    if (!canAccess) throw new Error("You do not have access to this sandbox");
    const durationSec = args.sessionDurationSeconds ?? 120;
    const startedAt = Date.now() - durationSec * 1000;
    const endedAt = Date.now();

    const sessionId = await ctx.db.insert("sandboxAnalyticsSessions", {
      sandboxId: args.sandboxId,
      startedAt,
      endedAt,
      supermemorySummary:
        "User explored the sandbox, made several UI changes, and used AI to refine the layout. Key moments included adding a sidebar and adjusting colors.",
    });

    const startMs = startedAt;
    const stepMs = 1000;
    const n = Math.floor((durationSec * 1000) / stepMs);

    const emotionKeys = [
      "lowEnergyUnpleasant",
      "lowEnergyPleasant",
      "highEnergyPleasant",
      "highEnergyUnpleasant",
    ] as const;
    const segmentLength = Math.max(5, Math.floor(n / 16));
    for (let i = 0; i <= n; i++) {
      const t = startMs + i * stepMs;
      const segmentIndex = Math.floor(i / segmentLength) % emotionKeys.length;
      const dominant = emotionKeys[segmentIndex]!;
      const useHalf = (i % segmentLength) >= segmentLength - 2;
      const value = useHalf ? 0.5 : 0.85 + Math.random() * 0.15;
      const sample: Record<string, number> = {
        lowEnergyUnpleasant: 0,
        lowEnergyPleasant: 0,
        highEnergyPleasant: 0,
        highEnergyUnpleasant: 0,
      };
      sample[dominant] = value;
      await ctx.db.insert("sandboxEmotionSamples", {
        sandboxId: args.sandboxId,
        sessionId: sessionId as unknown as string,
        timestampMs: t,
        lowEnergyUnpleasant: sample.lowEnergyUnpleasant,
        lowEnergyPleasant: sample.lowEnergyPleasant,
        highEnergyPleasant: sample.highEnergyPleasant,
        highEnergyUnpleasant: sample.highEnergyUnpleasant,
      });
    }

    const transcriptTexts: { text: string; isAiPrompt: boolean }[] = [
      { text: "Let me try opening this panel.", isAiPrompt: false },
      { text: "Make the header blue and add a logo.", isAiPrompt: true },
      { text: "That looks good. Can we try a different font?", isAiPrompt: false },
      { text: "Use Inter for the body and keep the heading bold.", isAiPrompt: true },
      { text: "I want to add a sidebar on the left.", isAiPrompt: true },
      { text: "Perfect. Now show the user name at the top right.", isAiPrompt: true },
      { text: "The layout is a bit cramped on mobile.", isAiPrompt: false },
      { text: "Make the sidebar collapse on small screens.", isAiPrompt: true },
      { text: "I think we need more padding around the cards.", isAiPrompt: false },
      { text: "Add 16px padding to the card container and round the corners.", isAiPrompt: true },
      { text: "What about dark mode? Does this support it?", isAiPrompt: false },
      { text: "Add a dark theme using CSS variables for background and text.", isAiPrompt: true },
      { text: "The button feels a bit small on touch devices.", isAiPrompt: false },
      { text: "Increase minimum touch target size to 44px for primary buttons.", isAiPrompt: true },
      { text: "Can we add a loading state when submitting?", isAiPrompt: false },
      { text: "Show a spinner on the submit button and disable it while loading.", isAiPrompt: true },
      { text: "The form validation message is easy to miss.", isAiPrompt: false },
      { text: "Display validation errors in red below each field with an icon.", isAiPrompt: true },
      { text: "I'd like to see a confirmation before deleting.", isAiPrompt: false },
      { text: "Add a confirmation dialog when the user clicks delete.", isAiPrompt: true },
      { text: "The table could use sortable column headers.", isAiPrompt: false },
      { text: "Make the table headers clickable to sort ascending and descending.", isAiPrompt: true },
      { text: "We need to handle empty state when there's no data.", isAiPrompt: false },
      { text: "Show an empty state illustration and message when the list is empty.", isAiPrompt: true },
      { text: "The search could highlight matching text in results.", isAiPrompt: false },
      { text: "Highlight the search query in the result snippets.", isAiPrompt: true },
      { text: "Can we add keyboard shortcuts for power users?", isAiPrompt: false },
      { text: "Add Ctrl+K for search and Escape to close modals.", isAiPrompt: true },
      { text: "The tooltip is cut off on the right edge of the screen.", isAiPrompt: false },
      { text: "Flip tooltip placement when near the viewport edge.", isAiPrompt: true },
      { text: "I want to export this data as CSV.", isAiPrompt: false },
      { text: "Add an Export button that downloads the current view as CSV.", isAiPrompt: true },
      { text: "The chart legend is overlapping the graph on small screens.", isAiPrompt: false },
      { text: "Move the legend below the chart on viewports under 640px.", isAiPrompt: true },
      { text: "We should show a success toast after saving.", isAiPrompt: false },
      { text: "Display a toast notification when the form is saved successfully.", isAiPrompt: true },
      { text: "The nav could indicate the current page more clearly.", isAiPrompt: false },
      { text: "Add an active state and subtle background to the current nav item.", isAiPrompt: true },
      { text: "That should be enough to test the auto-scroll and highlighting.", isAiPrompt: false },
    ];

    const segmentDurationMs = (endedAt - startMs) / transcriptTexts.length;
    for (let i = 0; i < transcriptTexts.length; i++) {
      const item = transcriptTexts[i]!;
      await ctx.db.insert("sandboxTranscriptEntries", {
        sandboxId: args.sandboxId,
        sessionId: sessionId as unknown as string,
        timestampMs: Math.floor(startMs + i * segmentDurationMs),
        text: item.text,
        isAiPrompt: item.isAiPrompt,
        fromMic: false,
      });
    }

    const aiPromptCount = transcriptTexts.filter((t) => t.isAiPrompt).length;
    const lastUpdated = Date.now();
    const existingStats = await ctx.db
      .query("sandboxAnalyticsStats")
      .withIndex("by_sandboxId", (q) => q.eq("sandboxId", args.sandboxId))
      .first();

    if (existingStats) {
      await ctx.db.patch(existingStats._id, {
        aiPromptCount,
        linesChanged: 42,
        lastUpdated,
      });
    } else {
      await ctx.db.insert("sandboxAnalyticsStats", {
        sandboxId: args.sandboxId,
        aiPromptCount,
        linesChanged: 42,
        lastUpdated,
      });
    }

    return { sessionId, samplesCount: n + 1, transcriptCount: transcriptTexts.length };
  },
});

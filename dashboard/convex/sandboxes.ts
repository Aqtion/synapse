import { action, mutation, query } from "./_generated/server";
import { v } from "convex/values";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30) || "sandbox";
}

function makeId(name: string): string {
  const base = slugify(name);
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base}-${suffix}`;
}

export const createSandbox = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const name = args.name.trim() || "Untitled";
    const id = makeId(name);
    const now = Date.now();
    await ctx.db.insert("sandboxes", {
      id,
      name,
      createdAt: now,
      lastOpenedAt: now,
    });
    return id;
  },
});

export const listSandboxes = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("sandboxes")
      .withIndex("by_lastOpenedAt")
      .order("desc")
      .collect();
  },
});

export const updateLastOpened = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("sandboxes")
      .filter((q) => q.eq(q.field("id"), args.id))
      .first();
    if (row) {
      await ctx.db.patch(row._id, { lastOpenedAt: Date.now() });
    }
    return null;
  },
});

export const removeSandbox = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("sandboxes")
      .filter((q) => q.eq(q.field("id"), args.id))
      .first();
    if (row) {
      await ctx.db.delete(row._id);
    }
    return null;
  },
});

/**
 * Calls the Cloudflare worker to initialize the sandbox (create files, start server).
 * Set WORKER_BASE_URL in Convex dashboard environment for this to work.
 */
export const ensureSandboxOnWorker = action({
  args: { sandboxId: v.string() },
  handler: async (_ctx, args) => {
    const base = process.env.WORKER_BASE_URL;
    if (!base) {
      throw new Error("WORKER_BASE_URL is not set in Convex environment");
    }
    const url = `${base.replace(/\/$/, "")}/s/${args.sandboxId}/api/init`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Worker init failed (${res.status}): ${text}`);
    }
    return null;
  },
});

import { action, internalMutation, mutation, query } from "./_generated/server";
import { api, internal } from "./_generated/api";
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
  const suffix = Math.random().toString(36).slice(2, 12);
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

export const inviteTesters = mutation({
  args: {
    testers: v.array(
      v.object({
        name: v.string(),
        email: v.string(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const results: {
      sandboxId: string;
      email: string;
      name: string;
    }[] = [];

    for (const tester of args.testers) {
      const rawName = tester.name.trim();
      const rawEmail = tester.email.trim().toLowerCase();

      if (!rawEmail) {
        continue;
      }

      const sandboxName = rawName || rawEmail;
      const id = makeId(sandboxName);

      await ctx.db.insert("sandboxes", {
        id,
        name: sandboxName,
        testerEmail: rawEmail,
        testerName: rawName || undefined,
        createdAt: now,
        lastOpenedAt: now,
      });

      // ! send beta invite email to rawEmail with sandbox link and password info
      // The email should include:
      // - Link: `${process.env.SITE_URL ?? "http://localhost:3000"}/s/${id}`
      // - For new users: a generated password and instructions to sign in with email + password
      // - For existing users: a note that their password has been previously set

      results.push({
        sandboxId: id,
        email: rawEmail,
        name: sandboxName,
      });
    }

    return results;
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

/**
 * Returns the sandbox for the given id only if the current user is the assigned tester.
 * Used to gate /s/[id] so only that tester can load the sandbox.
 */
export const getSandboxForCurrentUser = query({
  args: { sandboxId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const row = await ctx.db
      .query("sandboxes")
      .filter((q) => q.eq(q.field("id"), args.sandboxId))
      .first();
    if (!row) return null;
    const email = (identity as { email?: string }).email?.toLowerCase();
    const userId = (identity as { subject?: string }).subject ?? (identity as { userId?: string }).userId;
    const matchesEmail = row.testerEmail && email && row.testerEmail.toLowerCase() === email;
    const matchesUserId = row.testerUserId && userId && row.testerUserId === userId;
    if (!matchesEmail && !matchesUserId) return null;
    return row;
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
 * Only the assigned tester can start the sandbox; identity is verified before calling the worker.
 * Set WORKER_BASE_URL in Convex dashboard environment for this to work.
 */
export const ensureSandboxOnWorker = action({
  args: { sandboxId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("You must be signed in to open this sandbox");
    }
    const sandbox = await ctx.runQuery(api.sandboxes.getSandboxForCurrentUser, {
      sandboxId: args.sandboxId,
    });
    if (!sandbox) {
      throw new Error("You do not have access to this sandbox");
    }
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

const GITHUB_API = "https://api.github.com";
const SUPERMEMORY_API = "https://api.supermemory.ai/v3";

async function githubFetch(
  path: string,
  token: string,
  init?: RequestInit,
): Promise<Response> {
  const url = path.startsWith("http") ? path : `${GITHUB_API}${path}`;
  return fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      ...(init?.headers as Record<string, string> | undefined),
    },
  });
}

/**
 * Creates a GitHub PR with the current sandbox files.
 * Requires WORKER_BASE_URL, GITHUB_TOKEN, GITHUB_REPO, and optionally SUPERMEMORY_API_KEY
 * to be set in the Convex environment.
 */
export const createPullRequest = action({
  args: { sandboxId: v.string() },
  handler: async (ctx, args) => {
    const workerBase = process.env.WORKER_BASE_URL;
    const githubToken = process.env.GITHUB_TOKEN;
    const githubRepo = process.env.GITHUB_REPO;
    const smKey = process.env.SUPERMEMORY_API_KEY;

    if (!workerBase) throw new Error("WORKER_BASE_URL is not set");
    if (!githubToken) throw new Error("GITHUB_TOKEN is not set");
    if (!githubRepo) throw new Error("GITHUB_REPO is not set (format: owner/repo)");

    const exportUrl = `${workerBase.replace(/\/$/, "")}/s/${args.sandboxId}/api/export`;
    const exportRes = await fetch(exportUrl);
    if (!exportRes.ok) {
      throw new Error(`Failed to export sandbox files: ${exportRes.status}`);
    }
    const { files } = (await exportRes.json()) as {
      files: Record<string, string>;
    };
    if (!files || Object.keys(files).length === 0) {
      throw new Error("No files found in sandbox");
    }

    let changeHistory = "";
    if (smKey) {
      try {
        const searchRes = await fetch(`${SUPERMEMORY_API}/search`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${smKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            q: `all changes in sandbox ${args.sandboxId}`,
            containerTags: [`sandbox_${args.sandboxId}`],
            limit: 10,
          }),
        });
        if (searchRes.ok) {
          const data = (await searchRes.json()) as {
            results?: Array<{ memory?: string; content?: string }>;
          };
          changeHistory =
            data.results
              ?.map((r) => r.memory || r.content || "")
              .filter(Boolean)
              .join("\n") || "";
        }
      } catch {
        /* best-effort */
      }
    }

    const branchName = `sandbox/${args.sandboxId}`;

    const mainRef = await githubFetch(
      `/repos/${githubRepo}/git/ref/heads/main`,
      githubToken,
    );
    if (!mainRef.ok) {
      throw new Error(`Failed to get main branch: ${mainRef.status}`);
    }
    const mainData = (await mainRef.json()) as {
      object: { sha: string };
    };
    const baseSha = mainData.object.sha;

    const treeEntries = Object.entries(files).map(([path, content]) => ({
      path: `sandbox/${args.sandboxId}/${path}`,
      mode: "100644" as const,
      type: "blob" as const,
      content,
    }));

    const treeRes = await githubFetch(
      `/repos/${githubRepo}/git/trees`,
      githubToken,
      {
        method: "POST",
        body: JSON.stringify({ base_tree: baseSha, tree: treeEntries }),
      },
    );
    if (!treeRes.ok) {
      throw new Error(`Failed to create tree: ${treeRes.status}`);
    }
    const treeSha = ((await treeRes.json()) as { sha: string }).sha;

    const commitRes = await githubFetch(
      `/repos/${githubRepo}/git/commits`,
      githubToken,
      {
        method: "POST",
        body: JSON.stringify({
          message: `sandbox: ${args.sandboxId}`,
          tree: treeSha,
          parents: [baseSha],
        }),
      },
    );
    if (!commitRes.ok) {
      throw new Error(`Failed to create commit: ${commitRes.status}`);
    }
    const commitSha = ((await commitRes.json()) as { sha: string }).sha;

    const existingBranch = await githubFetch(
      `/repos/${githubRepo}/git/ref/heads/${branchName}`,
      githubToken,
    );
    if (existingBranch.ok) {
      await githubFetch(
        `/repos/${githubRepo}/git/refs/heads/${branchName}`,
        githubToken,
        {
          method: "PATCH",
          body: JSON.stringify({ sha: commitSha, force: true }),
        },
      );
    } else {
      const refRes = await githubFetch(
        `/repos/${githubRepo}/git/refs`,
        githubToken,
        {
          method: "POST",
          body: JSON.stringify({
            ref: `refs/heads/${branchName}`,
            sha: commitSha,
          }),
        },
      );
      if (!refRes.ok) {
        throw new Error(`Failed to create branch: ${refRes.status}`);
      }
    }

    const prBody = changeHistory
      ? `## Sandbox: ${args.sandboxId}\n\nAuto-generated from sandbox changes.\n\n### Change History\n\n${changeHistory}`
      : `## Sandbox: ${args.sandboxId}\n\nAuto-generated from sandbox changes.`;

    const prRes = await githubFetch(
      `/repos/${githubRepo}/pulls`,
      githubToken,
      {
        method: "POST",
        body: JSON.stringify({
          title: `Sandbox: ${args.sandboxId}`,
          head: branchName,
          base: "main",
          body: prBody,
        }),
      },
    );

    let prUrl: string;
    let prNumber: number;

    if (prRes.ok) {
      const prData = (await prRes.json()) as {
        html_url: string;
        number: number;
      };
      prUrl = prData.html_url;
      prNumber = prData.number;
    } else {
      const errBody = (await prRes.json()) as {
        errors?: Array<{ message?: string }>;
      };
      const alreadyExists = errBody.errors?.some((e) =>
        e.message?.includes("A pull request already exists"),
      );
      if (alreadyExists) {
        const listRes = await githubFetch(
          `/repos/${githubRepo}/pulls?head=${githubRepo.split("/")[0]}:${branchName}&state=open`,
          githubToken,
        );
        const prs = (await listRes.json()) as Array<{
          html_url: string;
          number: number;
        }>;
        if (prs.length > 0) {
          prUrl = prs[0].html_url;
          prNumber = prs[0].number;
        } else {
          throw new Error(`Failed to create PR: ${prRes.status}`);
        }
      } else {
        throw new Error(`Failed to create PR: ${prRes.status}`);
      }
    }

    await ctx.runMutation(internal.sandboxes.updatePrInfo, {
      id: args.sandboxId,
      prUrl,
      prNumber,
      githubRepo,
    });

    return { prUrl, prNumber };
  },
});

export const updatePrInfo = internalMutation({
  args: {
    id: v.string(),
    prUrl: v.string(),
    prNumber: v.number(),
    githubRepo: v.string(),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("sandboxes")
      .filter((q) => q.eq(q.field("id"), args.id))
      .first();
    if (row) {
      await ctx.db.patch(row._id, {
        prUrl: args.prUrl,
        prNumber: args.prNumber,
        githubRepo: args.githubRepo,
      });
    }
  },
});

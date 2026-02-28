## Synapse — Tech Stack & Architecture

### Cloudflare

The core of Synapse runs entirely on Cloudflare's infrastructure:

- **Cloudflare Workers** — The serverless runtime powering all sandbox API logic: routing, file management, AI prompt handling, and serving the Studio UI. Every sandbox request — init, prompt, preview, export — is handled by a single Worker.
- **Cloudflare Containers (Durable Objects + Containers API)** — Each sandbox is backed by a Cloudflare Container, a persistent, isolated execution environment tied to a Durable Object. This gives every sandbox its own filesystem, process lifecycle, and addressable URL, all managed at the edge. We use `@cloudflare/sandbox` and `@cloudflare/containers` to create, route to, and proxy requests into these containers.
- **Wrangler CLI** — Used for local development (`wrangler dev --local`) and deployment (`wrangler deploy`), as well as managing Worker secrets like API keys.

### Supermemory

- **Supermemory API** — Integrated directly into the Worker's `/api/prompt` endpoint as a long-term memory layer. Every time a user's prompt results in file changes, the diff (prompt + changed filenames) is stored in Supermemory tagged by sandbox ID using `ctx.waitUntil()` to ensure the write completes without blocking the response. Before each AI call, the Worker queries Supermemory with the current prompt to surface relevant past changes as additional context, enabling the AI to make more coherent, history-aware edits across sessions.

### Convex

- **Convex** — Serverless backend-as-a-service handling all persistent application state: sandbox metadata, ownership, GitHub PR tracking (`prUrl`, `prNumber`, `githubRepo`). Convex actions power the `createPullRequest` flow — they fetch the live sandbox file contents from the Worker's `/api/export` endpoint, query Supermemory for the sandbox's change history to auto-generate a PR description, then call the GitHub API to create branches, commits, and pull requests programmatically.

### Frontend

- **Next.js** — Dashboard for creating and managing sandboxes, with the Studio IDE embedded via iframe pointing at the Worker-served UI.

### Architecture Summary

```
Browser (Next.js Dashboard)
    │
    ├── Convex (DB + Actions)
    │       └── GitHub API (PR creation)
    │       └── Supermemory API (change history search)
    │
    └── Cloudflare Worker (edge)
            ├── Cloudflare Container / Durable Object (per-sandbox filesystem)
            ├── Supermemory API (store + retrieve memory per sandbox)
            └── Claude AI (code generation via prompt)
```

Every sandbox is a live, isolated container at the edge with a persistent memory trail — Supermemory gives it a brain across sessions, and Convex + GitHub turns that history into an automated pull request.
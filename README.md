## Synapse — Tech Stack & Architecture

### Cloudflare

The core of Synapse runs entirely on Cloudflare's infrastructure:

- **Cloudflare Workers** — The serverless runtime powering all sandbox API logic: routing, file management, AI prompt handling, and serving the Studio UI. Every sandbox request — init, prompt, preview, export — is handled by a single Worker.
- **Cloudflare Containers (Durable Objects + Containers API)** — Each sandbox is backed by a Cloudflare Container, a persistent, isolated execution environment tied to a Durable Object. This gives every sandbox its own filesystem, process lifecycle, and addressable URL, all managed at the edge. We use `@cloudflare/sandbox` and `@cloudflare/containers` to create, route to, and proxy requests into these containers.
- **Cloudflare AI** — Code generation runs directly on Cloudflare's AI gateway via the Worker, keeping inference at the edge alongside the sandbox it's editing.
- **Wrangler CLI** — Used for local development (`wrangler dev --local`) and deployment (`wrangler deploy`), as well as managing Worker secrets like API keys.

### Supermemory

- **Long-term memory per sandbox** — Every time a prompt results in file changes, the diff (prompt + changed filenames + file snippets) is stored in Supermemory tagged by sandbox ID using `ctx.waitUntil()`, ensuring the write completes without blocking the response. Before each AI call, the Worker queries Supermemory with the current prompt to surface relevant past changes as additional context — enabling the AI to make coherent, history-aware edits across sessions.
- **PR description generation** — When a pull request is created or updated, Convex searches Supermemory for the sandbox's change history and uses the AI-generated document titles as a chronological changelog in the PR description.

### Convex

- **Convex** — Serverless backend handling all persistent application state: sandbox metadata, ownership, tester assignments, and project–sandbox relationships. Convex actions orchestrate the `createPullRequest` flow — fetching live sandbox files from the Worker's `/api/export` endpoint, querying Supermemory for change history, and calling the GitHub API to create branches, commits, and pull requests. Updating an existing PR also patches its description with the latest history.

### Projects & GitHub Import

- **Projects** — Sandboxes are organized under Projects, each linked to a GitHub repository used as the target for PR creation and the source for repo imports.
- **GitHub Repo Import** — Admins can import a GitHub repository containing a React app directly into a sandbox. The Worker fetches the repo's file tree and contents via the GitHub API, inlines local imports, strips ES module syntax, and generates a self-contained `index.html` that runs the app in the browser using Babel standalone and React/ReactDOM UMD builds from unpkg — no build tools or containers required.
- **Admin Invite Flow** — When an admin creates a sandbox under a project, they can simultaneously invite a tester by email. If the project has a linked GitHub repo, it is automatically imported into the sandbox before the invite is sent, attaching the tester to that single sandbox entry.

### Architecture Summary

```
Browser (Next.js Dashboard)
    │
    ├── Convex (DB + Actions)
    │       ├── GitHub API (repo import + PR creation/update)
    │       └── Supermemory API (change history → PR description)
    │
    └── Cloudflare Worker (edge)
            ├── Cloudflare Container / Durable Object (per-sandbox filesystem)
            ├── Cloudflare AI (code generation)
            └── Supermemory API (store + retrieve memory per sandbox)
```

Every sandbox is a live, isolated container at the edge with a persistent memory trail — Supermemory gives it a brain across sessions, and Convex + GitHub turns that history into an automated pull request.

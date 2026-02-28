## Synapse — Tech Stack & Architecture

### Cloudflare

The core of Synapse runs entirely on Cloudflare's infrastructure:

- **Cloudflare Workers** — The serverless runtime powering all sandbox API logic: routing, file management, AI prompt handling, and serving the Studio UI. Every sandbox request — init, prompt, preview, export — is handled by a single Worker.
- **Cloudflare Containers (Durable Objects + Containers API)** — Each sandbox is backed by a Cloudflare Container, a persistent, isolated execution environment tied to a Durable Object. This gives every sandbox its own filesystem, process lifecycle, and addressable URL, all managed at the edge. We use `@cloudflare/sandbox` and `@cloudflare/containers` to create, route to, and proxy requests into these containers.
- **Wrangler CLI** — Used for local development (`wrangler dev --local`) and deployment (`wrangler deploy`), as well as managing Worker secrets like API keys.

### Supermemory

- **Supermemory API** — Integrated directly into the Worker's `/api/prompt` endpoint as a long-term memory layer. Every time a user's prompt results in file changes, the diff (prompt + changed filenames) is stored in Supermemory tagged by sandbox ID using `ctx.waitUntil()` to ensure the write completes without blocking the response. Before each AI call, the Worker queries Supermemory with the current prompt to surface relevant past changes as additional context, enabling the AI to make more coherent, history-aware edits across sessions.

### Convex

- **Convex** — Serverless backend-as-a-service handling all persistent application state: sandbox metadata, ownership, tester assignments, project–sandbox relationships, and GitHub PR tracking (`prUrl`, `prNumber`, `githubRepo`). Convex actions power the `createPullRequest` flow — they fetch the live sandbox file contents from the Worker's `/api/export` endpoint, query Supermemory for the sandbox's change history to auto-generate a PR description from AI-generated document titles, then call the GitHub API to create branches, commits, and pull requests programmatically. Updating an existing PR also patches its description with the latest change history.

### Authentication & Email

- **better-auth + Convex** — Email/password and social authentication, integrated via `@convex-dev/better-auth`. Supports email verification and password reset flows.
- **Resend** — Transactional email delivery for auth emails (verification, password reset) and sandbox invite emails sent to testers when an admin creates or assigns a sandbox.

### Projects & GitHub Import

- **Projects** — Sandboxes are organized under Projects. Each project can be linked to a GitHub repository, which is used as the target for PR creation and as the source for importing a React app into a sandbox.
- **GitHub Repo Import** — Admins can import a GitHub repository containing a React app directly into a sandbox. The Worker fetches the repo's file tree and contents via the GitHub API, inlines local imports, strips ES module syntax, and generates a self-contained `index.html` that runs the app in the browser using Babel standalone and React/ReactDOM UMD builds from unpkg. This compilation runs entirely on the server — no build tools or containers required.
- **Admin Invite Flow** — When an admin creates a sandbox under a project, they can simultaneously invite a tester by email. If the project has a linked GitHub repo, the repo is automatically imported into the sandbox before the invite email is sent. The tester is attached to that sandbox rather than creating a duplicate entry.

### Frontend

- **Next.js** — Dashboard for creating and managing sandboxes, with the Studio IDE embedded via iframe pointing at the Worker-served UI. The Studio's back button navigates to the dashboard URL (configurable via `DASHBOARD_URL` environment variable), not the Worker root.

### Architecture Summary

```
Browser (Next.js Dashboard)
    │
    ├── Convex (DB + Actions)
    │       ├── GitHub API (repo import + PR creation/update)
    │       ├── Supermemory API (change history search → PR description)
    │       └── Resend (auth emails + tester invite emails)
    │
    └── Cloudflare Worker (edge)
            ├── Cloudflare Container / Durable Object (per-sandbox filesystem)
            ├── Supermemory API (store + retrieve memory per sandbox)
            └── Cloudflare AI (code generation via prompt)
```

Every sandbox is a live, isolated container at the edge with a persistent memory trail — Supermemory gives it a brain across sessions, Convex + GitHub turns that history into an automated pull request, and the invite flow lets admins ship a tester-ready sandbox in a single action.

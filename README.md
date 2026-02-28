## Synapse — Tech Stack & Architecture

### Cloudflare

- **Cloudflare Workers** — Serverless runtime powering all sandbox API logic: routing, file management, AI prompt handling, and serving the Studio UI.
- **Cloudflare Containers** — Each sandbox runs in its own persistent, isolated container tied to a Durable Object, giving it a dedicated filesystem and process lifecycle at the edge.
- **Cloudflare AI** — Code generation runs directly on Cloudflare's AI gateway via the Worker, keeping inference at the edge alongside the sandbox it's editing.

### Supermemory

- **Per-sandbox long-term memory** — Every prompt sent to a sandbox is stored in Supermemory alongside the files it changed, tagged to that specific sandbox. This builds up a persistent knowledge base for each sandbox over time — surviving across sessions, container restarts, and deployments.
- **RAG-powered AI context** — Before every AI call, Supermemory is queried with the current prompt to retrieve the most relevant past changes for that sandbox. Those results are injected into the AI's context window, so the model understands what has already been changed and why — enabling coherent, non-repetitive edits that build on prior work rather than starting from scratch each time.
- **Automated PR changelog** — When a pull request is created or updated, Supermemory is queried for the full history of that sandbox. The AI-generated titles of each stored memory are surfaced as a chronological changelog and written directly into the PR description — turning the sandbox's edit history into a structured, human-readable summary with no manual input.

### Convex

- **Convex** — Serverless backend handling all persistent application state: sandbox metadata, ownership, tester assignments, and project–sandbox relationships. Convex actions orchestrate GitHub operations — importing repos, creating branches and commits, and opening or updating pull requests.

### Projects & GitHub Import

- **Projects** — Sandboxes are organized under Projects, each linked to a GitHub repository used as the target for PR creation and the source for repo imports.
- **GitHub Repo Import** — Admins can import a GitHub repository containing a React app directly into a sandbox. The app is compiled into a self-contained preview with no build tools required.
- **Admin Invite Flow** — When creating a sandbox, admins can simultaneously invite a tester. If the project has a linked repo, it is automatically imported and the tester is attached to that single sandbox.

### Architecture Summary

```
Browser (Next.js Dashboard)
    │
    ├── Convex (DB + Actions)
    │       ├── GitHub API (repo import + PR creation/update)
    │       └── Supermemory (change history → PR description)
    │
    └── Cloudflare Worker (edge)
            ├── Cloudflare Containers (per-sandbox filesystem)
            ├── Cloudflare AI (code generation)
            └── Supermemory (prompt memory + context retrieval)
```

Every sandbox is a live, isolated container at the edge with a persistent memory trail — Supermemory gives it a brain across sessions, and Convex + GitHub turns that history into an automated pull request.

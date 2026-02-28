# Telemetry + codebase layout for Aura11y

## How to run the Hume / UX telemetry test

The app that serves the telemetry test page is the **dashboard** (Next.js). The default `npm run dev` at repo root runs the **Cloudflare Worker**, not the dashboard.

**To run the Hume stream test:**

```bash
# From repo root
npm run dev:telemetry
```

or explicitly:

```bash
npm run dev:dashboard
```

Then open **http://localhost:3000/ux_telemetry** in the browser. In the dashboard sidebar, use **Telemetry (Hume test)**.

**Required:** `NEXT_PUBLIC_HUME_API_KEY` in `dashboard/.env.local` (see `dashboard/.env.example` if you have one).

---

## Repo layout (dashboard vs Cloudflare sandbox)

| Part | Who uses it | Where |
|-----|-------------|--------|
| **Dashboard** | Admin (developer / site owner) | `dashboard/` — Next.js app. Overview, Runs, Files, Telemetry test. |
| **Worker** | Sandbox runtime for beta users | `worker/` — Cloudflare Worker + Sandbox (Durable Object). Serves sandbox APIs. |
| **UX Telemetry** | Both (admin test + beta user session) | `dashboard/src/ux_telemetry/` — Hume, PostHog, mouse. Client-only. |

- **Dashboard** = single Next.js app for the admin. All admin UI and the **Hume test page** live here.
- **Cloudflare sandboxes** = what you send to beta testers (link → they hit the Worker/sandbox). Telemetry must run **in the browser** where the tester is interacting, not inside the Worker.

---

## Using telemetry in the Cloudflare sandbox (beta users)

Telemetry is client-side: webcam (Hume), PostHog, mouse tracking. It has to run in the page the **beta user** has open.

1. **Same app (recommended for now)**  
   Add a **beta-user route** in the dashboard, e.g. `/s/[sandboxId]` or `/test/[id]`, that:
   - Loads the sandbox preview (e.g. iframe or Sandpack).
   - Wraps it with `TelemetryProvider` from `@/ux_telemetry`.
   - So: one Next app, dashboard for admin and a route for the tester; telemetry lives in `dashboard/src/ux_telemetry`.

2. **Worker-served static page**  
   If the Worker serves an HTML page that runs in the user’s browser:
   - Build a **client bundle** that includes the telemetry (and any React runtime you need).
   - That bundle is just JS running in the browser; it can use the same `ux_telemetry` logic, built into that bundle.
   - Source of truth can stay in `dashboard/src/ux_telemetry` and be bundled for the Worker-served page (e.g. via a separate build step or package).

3. **Separate deploy for tester app**  
   If you later split “admin app” and “tester app”:
   - Keep one implementation of telemetry (e.g. in a shared package or copy of `dashboard/src/ux_telemetry`).
   - Use it in the tester app so beta sessions still get Hume + PostHog + mouse and `onFrictionDetected`.

**Summary:** Telemetry code lives in `dashboard/src/ux_telemetry`. Use it from the dashboard (admin + Hume test) and from whatever page or bundle runs in the beta user’s browser (same app route or Worker-served bundle).

# UX Telemetry (Aura11y)

Client-only telemetry for **Aura11y**: Hume biometrics, PostHog behavioral, and mouse-context. Feeds friction events into the ElevenLabs Voice Copilot. All code is `"use client"`.

- **Dashboard**: Used here for the **Hume test page** (`/ux_telemetry`) and will wrap the admin preview when needed.
- **Cloudflare sandbox (beta users)**: When you add the beta-tester flow (e.g. a route or page that loads the sandbox + Sandpack), use this same module there so telemetry runs in the browser where the tester interacts.

## Running the Hume test

From **repo root** (no Bun required):

```bash
npm run dev:telemetry
```

Or run the dashboard directly:

```bash
npm run dev:dashboard
```

Then open **http://localhost:3000/ux_telemetry** (or the port Next shows). Set `NEXT_PUBLIC_HUME_API_KEY` in `dashboard/.env.local`.

## Hume API key (Option A)

Set `NEXT_PUBLIC_HUME_API_KEY` in `dashboard/.env.local`. The hook reads it automatically.

## Using in a Cloudflare-served sandbox

The telemetry runs in the **browser**. For beta users:

1. **If the sandbox is an iframe** that loads a URL your app serves: serve that page from the dashboard (e.g. `/s/[sandboxId]` or `/test/[id]`) and wrap it with `TelemetryProvider` (when built). Same codebase, same `@/ux_telemetry`.

2. **If the Worker serves static HTML/JS** that runs in the user’s browser: bundle the telemetry (e.g. build a small client bundle from this folder) and load it in that page. The Worker doesn’t run React; the browser does, so the bundle must include the hooks and any React runtime you use.

3. **If the sandbox is a full Next.js or Vite app** deployed separately: copy or link `dashboard/src/ux_telemetry` into that app and use it there.

Keep a single source of truth (this folder) and reuse it in every place that needs to capture Hume/PostHog/mouse in the user’s browser.

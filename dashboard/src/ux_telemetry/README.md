# UX Telemetry (Aura11y)

Client-only telemetry for **Aura11y**. Runs in the **beta-tester’s browser** (e.g. Cloudflare sandbox or dashboard test pages). All code is `"use client"`; no server or dashboard-specific logic.

## Layout (modular)

```
ux_telemetry/
  types.ts              # Shared: FrictionPayload
  index.ts              # Barrel: re-exports from subfolders
  emotion_tracking/      # Hume AI webcam stream
    useHumeStream.ts
    types.ts, constants.ts, index.ts
  mouse_tracking/       # Cursor + element under cursor / nearest interactive
    useMouseTracker.ts
    types.ts, index.ts
```

- **emotion_tracking**: Hume Expression Measurement (getUserMedia + WebSocket, ≤2 FPS).
- **mouse_tracking**: Throttled (100ms) `document.elementFromPoint`; returns both the exact element under the cursor and the **nearest interactive ancestor** (button, link, input, etc.) for “intent” when building `FrictionPayload.target_element_html`.
- **Dashboard**: Use for the Hume test page (`/ux_telemetry`) and future TelemetryProvider.
- **Cloudflare sandbox (beta users)**: Use this same module in the page/iframe the tester loads so telemetry runs in their browser.

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

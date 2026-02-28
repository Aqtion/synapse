# UX Telemetry (Aura11y)

**Client-only** telemetry for the **beta-tester's session** (Cloudflare sandbox). It runs in the **tester's browser**, not in the dashboard or the Worker. The dashboard uses this module only for the **test page** (`/ux_telemetry`); the real consumer is the page or bundle that beta testers load.

- All code is `"use client"`; no server or dashboard-specific logic.
- Single source of truth: this folder. Reuse it in the sandbox route or in a client bundle served to testers.

---

## Layout (modular)

```
dashboard/src/ux_telemetry/
  types.ts                 # Shared: FrictionPayload
  index.ts                 # Barrel: re-exports from subfolders
  emotion_tracking/        # Hume AI webcam stream
    useHumeStream.ts, types.ts, constants.ts, index.ts
  mouse_tracking/          # Cursor + element under cursor / intent (radius)
    useMouseTracker.ts, types.ts, index.ts
  behavioral_tracking/    # PostHog: product analytics + session replay + rage click
    posthog.ts, types.ts, index.ts
```

| Subfolder | Purpose |
|-----------|---------|
| **emotion_tracking** | Hume Expression Measurement (getUserMedia + WebSocket, ≤2 FPS). |
| **mouse_tracking** | Throttled (100ms) cursor + `elementFromPoint`; intent via radius. |
| **behavioral_tracking** | PostHog: product analytics (`capture`), session replay, rage-click. `onBehavioralMetric` for real-time metrics (data suitable for later Convex storage). |

---

## Running the Hume test (dashboard only)

From repo root:

```bash
npm run dev:telemetry
```

Then open **http://localhost:3000/ux_telemetry**. Set `NEXT_PUBLIC_HUME_API_KEY` in `dashboard/.env.local`.

---

## Using in the beta-tester sandbox

Telemetry must run in the **page the tester has open** (browser), not in the Worker.

1. **Beta route in the same app**  
   Add a route (e.g. `/s/[sandboxId]` or `/test/[id]`) that renders the sandbox preview and wraps it with `TelemetryProvider` (when built). Import from `@/ux_telemetry`.

2. **Worker-served static page**  
   Build a client bundle that includes this `ux_telemetry` code (and React if needed) and load it in the HTML the Worker serves. The Worker does not run the telemetry; the browser does.

3. **Separate tester app**  
   Copy or link `dashboard/src/ux_telemetry` into that app and use it there so beta sessions still get Hume + PostHog + mouse and `onFrictionDetected`.

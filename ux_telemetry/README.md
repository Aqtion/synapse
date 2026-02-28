# UX Telemetry (isolated module)

Client-only telemetry for **Aura11y**: Hume biometrics, PostHog behavioral, and mouse-context. Feeds friction events into the ElevenLabs Voice Copilot. Built for App Router; all code is `"use client"`.

## Hume API key (Option A — in use)

We use **env var**: set `NEXT_PUBLIC_HUME_API_KEY` in `.env.local`. The hook reads it automatically; no need to pass `apiKey` into `useHumeStream`. Copy from `.env.example` if your repo has one.

## Usage (Hume only, for now)

```tsx
"use client";

import { useHumeStream } from "@/ux_telemetry";

function MyComponent() {
  const { status, error, start, stop, videoRef } = useHumeStream({
    maxFps: 2,
    onMessage: (emotions, raw) => {
      console.log("Confusion", emotions["Confusion"], "Concentration", emotions["Concentration"]);
    },
    onError: (e) => console.error(e),
    enabled: true,
  });

  return (
    <>
      <video ref={videoRef} autoPlay playsInline muted style={{ display: "none" }} />
      <button onClick={() => start()}>Start</button>
      <button onClick={() => stop()}>Stop</button>
      <span>{status}</span>
      {error && <span>{error.message}</span>}
    </>
  );
}
```

- **Frame rate**: Capped at 2 FPS (configurable via `maxFps`; spec enforces ≤2).
- **Ref**: You must render a `<video>` and pass `videoRef` so the hook can attach the media stream and sample frames.

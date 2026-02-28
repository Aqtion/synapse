# Eleven Labs TTS & STT test (no Cloudflare)

Static dashboard page for testing Eleven Labs text-to-speech and speech-to-text.  
Server logic is taken from `../dashboard` (server.js and `dashboard/src/app/api/tts/route.ts`). No Cloudflare container or worker.

## Run with npm

From repo root:

```bash
cd test
npm install
npm start
```

Then open **http://localhost:3999** in your browser.

- **TTS**: Type text and click "Speak" — uses `POST /api/tts`.
- **STT**: Click the mic, speak, click again to stop — uses WebSocket `/ws/stt` and `/audio-processor.js` (from `../dashboard/public/audio-processor.js`).

## Env

Uses `ELEVENLABS_API_KEY` from:

1. `../.env` (repo root — your existing `.env`),
2. or `test/.env` if you add one.

No Convex or Cloudflare config needed.

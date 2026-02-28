import { join } from "path";

const API_KEY = process.env.ELEVENLABS_API_KEY;
if (!API_KEY) throw new Error("ELEVENLABS_API_KEY is not set — check your .env file");

const TTS_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb";
const TTS_TEXT =
  "Hello! This is a hardcoded message from ElevenLabs text to speech. Pretty cool, right?";
const PUBLIC_DIR = join(import.meta.dir, "public");

// ElevenLabs realtime STT WebSocket URL
// audio_format=pcm_16000 matches the 16 kHz PCM16 the AudioWorklet sends
const EL_STT_URL =
  `wss://api.elevenlabs.io/v1/speech-to-text/realtime` +
  `?model_id=scribe_v2_realtime` +
  `&language_code=en` +
  `&audio_format=pcm_16000` +
  `&vad_silence_threshold_secs=0.6` +
  `&vad_threshold=0.4`;

type ClientData = { elWs: WebSocket | null };

const server = Bun.serve<ClientData>({
  port: 3000,

  async fetch(req, server) {
    const url = new URL(req.url);

    // ── Static files ─────────────────────────────────────────────────────────
    if (url.pathname === "/" || url.pathname === "/index.html") {
      return new Response(Bun.file(join(PUBLIC_DIR, "index.html")));
    }
    if (url.pathname === "/audio-processor.js") {
      return new Response(Bun.file(join(PUBLIC_DIR, "audio-processor.js")), {
        headers: { "Content-Type": "application/javascript" },
      });
    }

    // ── WebSocket upgrade for real-time STT ──────────────────────────────────
    if (url.pathname === "/ws/stt") {
      const ok = server.upgrade(req, { data: { elWs: null } });
      if (ok) return undefined;
      return new Response("WebSocket upgrade failed", { status: 400 });
    }

    // ── TTS endpoint ─────────────────────────────────────────────────────────
    if (url.pathname === "/api/tts" && req.method === "GET") {
      console.log("[TTS] request");
      const res = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${TTS_VOICE_ID}`,
        {
          method: "POST",
          headers: { "xi-api-key": API_KEY, "Content-Type": "application/json" },
          body: JSON.stringify({
            text: TTS_TEXT,
            model_id: "eleven_turbo_v2",
            voice_settings: { stability: 0.5, similarity_boost: 0.75 },
          }),
        }
      );
      if (!res.ok) {
        const err = await res.text();
        console.error("[TTS] error:", res.status, err);
        return new Response(JSON.stringify({ error: err }), {
          status: res.status,
          headers: { "Content-Type": "application/json" },
        });
      }
      console.log("[TTS] streaming audio");
      return new Response(res.body, {
        headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-cache" },
      });
    }

    return new Response("Not Found", { status: 404 });
  },

  // ── WebSocket handlers (raw proxy to ElevenLabs) ──────────────────────────
  websocket: {
    open(ws) {
      console.log("[STT] browser connected — opening ElevenLabs socket");

      // Bun's native WebSocket supports headers (unlike the SDK's ws package)
      // @ts-ignore — Bun extends the standard constructor with a headers option
      const elWs: WebSocket = new WebSocket(EL_STT_URL, {
        headers: { "xi-api-key": API_KEY },
      });

      ws.data.elWs = elWs;

      elWs.onopen = () => {
        console.log("[STT] ElevenLabs socket open");
        ws.send(JSON.stringify({ type: "status", status: "connected" }));
      };

      elWs.onmessage = (event) => {
        try {
          // ElevenLabs uses message_type; normalise to type for the browser
          const msg = JSON.parse(event.data as string) as Record<string, unknown>;
          const out = { ...msg, type: msg.message_type };
          delete out.message_type;

          if (out.type === "partial_transcript" || out.type === "committed_transcript") {
            console.log(`[STT] ${out.type}:`, out.text);
          } else if (out.type === "error" || out.type === "auth_error") {
            console.error("[STT] upstream error:", msg);
          }

          ws.send(JSON.stringify(out));
        } catch (err) {
          console.error("[STT] failed to parse ElevenLabs message:", err);
        }
      };

      elWs.onerror = (err) => {
        console.error("[STT] ElevenLabs socket error:", err);
        ws.send(JSON.stringify({ type: "error", message: "ElevenLabs upstream error" }));
      };

      elWs.onclose = (event) => {
        console.log("[STT] ElevenLabs socket closed:", event.code, event.reason);
        ws.close();
      };
    },

    message(ws, rawMsg) {
      const elWs = ws.data.elWs;
      if (!elWs || elWs.readyState !== WebSocket.OPEN) return;

      try {
        // Browser sends: { type: "input_audio_chunk", audioBase64: "...", sampleRate: 16000 }
        // ElevenLabs expects: { message_type: "input_audio_chunk", audio_base_64: "..." }
        const msg = JSON.parse(rawMsg as string) as {
          type: string;
          audioBase64: string;
        };

        if (msg.type === "input_audio_chunk") {
          elWs.send(
            JSON.stringify({
              message_type: "input_audio_chunk",
              audio_base_64: msg.audioBase64,
            })
          );
        }
      } catch (err) {
        console.error("[STT] failed to process browser message:", err);
      }
    },

    close(ws) {
      console.log("[STT] browser disconnected");
      ws.data.elWs?.close();
    },
  },
});

console.log(`Server running at http://localhost:${server.port}`);

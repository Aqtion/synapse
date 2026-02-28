/**
 * Custom server: Next.js + WebSocket proxy for ElevenLabs real-time STT.
 * Run with: node server.js (or npm run dev)
 * Requires ELEVENLABS_API_KEY in .env.local
 */

const http = require("http");
const next = require("next");
const { WebSocketServer } = require("ws");

// Load env from dashboard root (Next.js loads .env.local automatically for its routes;
// we need it for the WebSocket server too)
require("dotenv").config({ path: ".env.local" });
require("dotenv").config({ path: ".env" });

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const EL_STT_URL =
  "wss://api.elevenlabs.io/v1/speech-to-text/realtime" +
  "?model_id=scribe_v2_realtime" +
  "&language_code=en" +
  "&audio_format=pcm_16000" +
  "&vad_silence_threshold_secs=0.6" +
  "&vad_threshold=0.4";

app.prepare().then(() => {
  const server = http.createServer((req, res) => {
    return handle(req, res);
  });

  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url || "", `http://${request.headers.host}`);
    if (url.pathname === "/ws/stt") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    }
    // Non-STT upgrade requests (e.g. /_next/webpack-hmr) pass through to Next.js
  });

  wss.on("connection", (ws, request) => {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      ws.send(JSON.stringify({ type: "error", message: "ELEVENLABS_API_KEY not set" }));
      ws.close();
      return;
    }

    let clientClosed = false;

    const elWs = new (require("ws"))(EL_STT_URL, {
      headers: { "xi-api-key": apiKey },
    });

    elWs.on("open", () => {
      if (clientClosed) {
        elWs.close();
        return;
      }
      if (ws.readyState === 1) {
        ws.send(JSON.stringify({ type: "status", status: "connected" }));
      }
    });

    elWs.on("message", (data) => {
      if (clientClosed) return;
      try {
        const msg = JSON.parse(data.toString());
        const out = { ...msg, type: msg.message_type };
        delete out.message_type;
        if (ws.readyState === 1) ws.send(JSON.stringify(out));
      } catch (err) {
        console.error("[STT] parse error:", err);
      }
    });

    elWs.on("error", (err) => {
      const closedBeforeConnected =
        err && typeof err.message === "string" && err.message.includes("closed before the connection was established");
      if (!closedBeforeConnected) {
        console.error("[STT] ElevenLabs error:", err);
      }
      if (ws.readyState === 1) {
        try {
          if (!closedBeforeConnected) {
            ws.send(JSON.stringify({ type: "error", message: "ElevenLabs upstream error" }));
          }
          ws.close();
        } catch (_) {}
      }
    });

    elWs.on("close", () => {
      if (ws.readyState === 1) {
        try {
          ws.close();
        } catch (_) {}
      }
    });

    ws.on("message", (raw) => {
      if (elWs.readyState !== elWs.OPEN) return;
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === "input_audio_chunk") {
          elWs.send(
            JSON.stringify({
              message_type: "input_audio_chunk",
              audio_base_64: msg.audioBase64,
            })
          );
        }
      } catch (err) {
        console.error("[STT] browser message error:", err);
      }
    });

    ws.on("close", () => {
      clientClosed = true;
      // Only call elWs.close() if it's already open or closing; if still CONNECTING,
      // the ws library emits "closed before connection" when we close. We'll close
      // elWs in elWs.on("open") when clientClosed is set instead.
      if (elWs.readyState === 1 || elWs.readyState === 2) {
        elWs.close();
      }
    });
  });

  server
    .listen(port, hostname, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    })
    .on("error", (err) => {
      console.error(err);
      process.exit(1);
    });
});

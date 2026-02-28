/**
 * Custom server: Next.js + WebSocket proxy for ElevenLabs real-time STT.
 * Run with: node server.js (or npm run dev)
 * Requires ELEVENLABS_API_KEY in .env.local
 */

const http = require("http");
const next = require("next");
const { WebSocketServer } = require("ws");
const path = require("path");
const dotenv = require("dotenv");

// Load env for both Next routes and the WebSocket proxy.
// Also load the monorepo root .env so ELEVENLABS_API_KEY is available.
dotenv.config({ path: path.join(__dirname, "..", ".env") });
dotenv.config({ path: path.join(__dirname, "..", ".env.local"), override: true });
dotenv.config({ path: path.join(__dirname, ".env"), override: true });
dotenv.config({ path: path.join(__dirname, ".env.local"), override: true });

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

  // Next 16 exposes an upgrade handler we can delegate to for HMR, etc.
  const upgradeHandler =
    typeof app.getUpgradeHandler === "function" ? app.getUpgradeHandler() : null;

  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url || "", `http://${request.headers.host}`);
    if (url.pathname === "/ws/stt") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
      return;
    }

    // Let Next.js handle all other upgrade requests (webpack HMR, etc).
    if (upgradeHandler) {
      return upgradeHandler(request, socket, head);
    }

    socket.destroy();
  });

  wss.on("connection", (ws, request) => {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      ws.send(JSON.stringify({ type: "error", message: "ELEVENLABS_API_KEY not set" }));
      ws.close();
      return;
    }

    const elWs = new (require("ws"))(EL_STT_URL, {
      headers: { "xi-api-key": apiKey },
    });

    elWs.on("open", () => {
      ws.send(JSON.stringify({ type: "status", status: "connected" }));
    });

    elWs.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());
        const out = { ...msg, type: msg.message_type };
        delete out.message_type;
        ws.send(JSON.stringify(out));
      } catch (err) {
        console.error("[STT] parse error:", err);
      }
    });

    elWs.on("error", (err) => {
      console.error("[STT] ElevenLabs error:", err);
      try {
        ws.send(JSON.stringify({ type: "error", message: "ElevenLabs upstream error" }));
      } catch (_) {}
      ws.close();
    });

    elWs.on("close", () => {
      try {
        ws.close();
      } catch (_) {}
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
      elWs.close();
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

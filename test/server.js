/**
 * Static test server: TTS (POST /api/tts) + STT (WebSocket /ws/stt).
 * No Cloudflare. Uses logic from ../dashboard (server.js + src/app/api/tts/route.ts).
 * Requires ELEVENLABS_API_KEY in .env (loaded from ../.env or .env in test/).
 */

const path = require("path");
const fs = require("fs");
const http = require("http");
const express = require("express");
const { WebSocketServer } = require("ws");

// Load .env from repo root or test folder
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
require("dotenv").config({ path: path.join(__dirname, ".env") });

const PORT = parseInt(process.env.PORT || "3999", 10);
const TTS_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb";
const EL_STT_URL =
  "wss://api.elevenlabs.io/v1/speech-to-text/realtime" +
  "?model_id=scribe_v2_realtime" +
  "&language_code=en" +
  "&audio_format=pcm_16000" +
  "&vad_silence_threshold_secs=0.6" +
  "&vad_threshold=0.4";

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// TTS: same behavior as dashboard/src/app/api/tts/route.ts
app.post("/api/tts", async (req, res) => {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "ELEVENLABS_API_KEY is not configured" });
    return;
  }
  const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
  if (!text) {
    res.status(400).json({ error: "Missing or empty text" });
    return;
  }
  try {
    const elRes = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${TTS_VOICE_ID}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_turbo_v2",
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
      }
    );
    if (!elRes.ok) {
      const err = await elRes.text();
      console.error("[TTS] ElevenLabs error:", elRes.status, err);
      res.status(elRes.status).json({ error: err || "TTS failed" });
      return;
    }
    const blob = await elRes.blob();
    const buf = Buffer.from(await blob.arrayBuffer());
    res.set({ "Content-Type": "audio/mpeg", "Cache-Control": "no-cache" }).send(buf);
  } catch (e) {
    console.error("[TTS]", e);
    res.status(500).json({ error: String(e.message) });
  }
});

const server = http.createServer(app);

const wss = new WebSocketServer({ noServer: true });
server.on("upgrade", (request, socket, head) => {
  const url = new URL(request.url || "", `http://${request.headers.host}`);
  if (url.pathname === "/ws/stt") {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  } else {
    socket.destroy();
  }
});

wss.on("connection", (ws) => {
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
    try { ws.close(); } catch (_) {}
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
  ws.on("close", () => elWs.close());
});

server.listen(PORT, () => {
  console.log(`Test server: http://localhost:${PORT}`);
  console.log("TTS: POST /api/tts  |  STT: WebSocket /ws/stt");
  if (!process.env.ELEVENLABS_API_KEY) {
    console.warn("ELEVENLABS_API_KEY not set — TTS/STT will fail.");
  }
});

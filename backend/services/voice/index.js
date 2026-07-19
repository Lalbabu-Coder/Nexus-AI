import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
import dotenv from "dotenv";
import redis from "../../shared/redis/redis.js";
import axios from "axios";
import { transcribeAudio } from "./services/stt.service.js";
import { synthesizeSpeech } from "./services/tts.service.js";

dotenv.config();

const app = express();
app.use(express.json());

const port = process.env.PORT || 8005;

// Health check endpoint conforming to your project patterns
app.get("/", (req, res) => {
  res.status(200).json({
    service: "voice",
    status: "ok"
  });
});

const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

// Utility helper to parse session cookie from handshake headers
const getCookie = (cookieString, name) => {
  if (!cookieString) return null;
  const match = cookieString.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : null;
};

// WebSocket Upgrade Handling and Redis authentication integration
server.on("upgrade", async (request, socket, head) => {
  console.log("=== VOICE UPGRADE HANDSHAKE ===");
  try {
    const urlParams = new URL(request.url, `http://${request.headers.host || "localhost"}`);
    const sessionId = urlParams.searchParams.get("session") || getCookie(request.headers.cookie, "session");

    if (!sessionId) {
      console.error("401 Unauthorized: No session ID found in query params or cookies");
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    console.log("Retrieving session from Redis for Voice ID:", sessionId);
    const session = await redis.get(`session:${sessionId}`);

    if (!session) {
      console.error("401 Session Expired: Voice Session not found in Redis for ID:", sessionId);
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    request.user = JSON.parse(session);
    console.log("Successfully authenticated voice user ID:", request.user.userId || request.user._id);

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  } catch (error) {
    console.error("500 Voice Upgrade Handshake Error:", error);
    socket.write("HTTP/1.1 500 Internal Server Error\r\n\r\n");
    socket.destroy();
  }
});

// WebSocket message event loops
wss.on("connection", (ws, request) => {
  const user = request.user;
  console.log(`=== USER CONNECTED TO VOICE CHANNEL === [${user.email || user.userId}]`);

  let audioBuffers = [];
  let conversationId = null;
  let selectedAgent = "chat";

  let silenceTimer = null;
  let lastSpeechTime = Date.now();
  let hasSpeechStarted = false;

  const processVoiceInput = async () => {
    try {
      if (audioBuffers.length === 0) {
        return;
      }

      ws.send(JSON.stringify({ type: "processing" }));

      // 1. Process Speech-to-Text translation
      const audioBuffer = Buffer.concat(audioBuffers);
      audioBuffers = []; // Reset buffers to prepare for next sentence
      
      console.log(`[Voice] Processing ${audioBuffer.length} bytes of raw audio through STT...`);
      const transcription = await transcribeAudio(audioBuffer);
      console.log("[Voice] Transcription returned:", transcription);

      if (!transcription || transcription.trim() === "") {
        ws.send(JSON.stringify({ type: "error", message: "Empty speech transcript" }));
        return;
      }

      // Feed transcription visual updates to client UI
      ws.send(JSON.stringify({ type: "transcription", text: transcription }));

      // 2. Query the cognitive LangGraph agents (which handles chat logging & credit deductions)
      console.log(`[Voice] Dispatching query prompt to agent: ${selectedAgent}`);
      const agentRes = await axios.post(`${process.env.AGENT_SERVICE}/chat`, {
        prompt: transcription,
        conversationId,
        agent: selectedAgent
      }, {
        headers: {
          "x-user-id": user.userId,
          "x-user-email": user.email
        }
      });

      const agentAnswer = agentRes.data.answer;
      console.log("[Voice] Agent responded with:", agentAnswer);

      // 3. Synthesize LLM reply into voice stream chunks
      console.log("[Voice] Invoking Speech Synthesis (TTS)...");
      const synthesizedAudio = await synthesizeSpeech(agentAnswer);

      // 4. Send synthesized voice stream directly to the client
      console.log(`[Voice] Transmitting ${synthesizedAudio.length} audio bytes back to client`);
      ws.send(synthesizedAudio);

      // 5. Signal stream cycle completion to the application
      ws.send(JSON.stringify({
        type: "finished",
        text: agentAnswer
      }));
    } catch (err) {
      console.error("=== VOICE PIPELINE PROCESS ERROR ===");
      console.error(err);
      ws.send(JSON.stringify({ type: "error", message: err.message || "Internal server processing error" }));
    }
  };

  ws.on("message", async (message, isBinary) => {
    try {
      if (isBinary) {
        // Collect streaming binary raw PCM buffers from the client microphone
        audioBuffers.push(message);

        // Compute Root Mean Square (RMS) volume of 16-bit PCM samples
        let sum = 0;
        for (let i = 0; i < message.length; i += 2) {
          if (i + 1 >= message.length) break;
          const sample = message.readInt16LE(i);
          sum += sample * sample;
        }
        const rms = Math.sqrt(sum / (message.length / 2));

        // Volume threshold: 1000 (roughly catches active human voice input)
        const isSpeech = rms > 1000;
        console.log(`[VAD DEBUG] RMS: ${rms.toFixed(1)} | isSpeech: ${isSpeech} | hasSpeechStarted: ${hasSpeechStarted}`);

        if (isSpeech) {
          if (!hasSpeechStarted) {
            console.log("[VAD] Voice activity detected: speech start");
            hasSpeechStarted = true;
          }
          lastSpeechTime = Date.now();
          if (silenceTimer) {
            console.log("[VAD DEBUG] Active speech detected. Resetting/clearing silence timer.");
            clearTimeout(silenceTimer);
            silenceTimer = null;
          }
        } else {
          if (hasSpeechStarted && !silenceTimer) {
            console.log("[VAD DEBUG] Speech paused/ended. Starting 1.2s VAD silence countdown...");
            silenceTimer = setTimeout(async () => {
              console.log("[VAD] Silence threshold hit (1.2s). Triggering execution pipeline...");
              hasSpeechStarted = false;
              silenceTimer = null;
              await processVoiceInput();
            }, 1200);
          }
        }
      } else {
        // Parse incoming text-based control commands
        const data = JSON.parse(message.toString());
        console.log("=== VOICE CONTROL MESSAGE ===", data);

        if (data.type === "start") {
          conversationId = data.conversationId;
          selectedAgent = data.agent || "chat";
          audioBuffers = [];
          hasSpeechStarted = false;
          if (silenceTimer) clearTimeout(silenceTimer);
          ws.send(JSON.stringify({ type: "ready" }));
        } else if (data.type === "ping") {
          ws.send(JSON.stringify({ type: "pong" }));
        }
      }
    } catch (err) {
      console.error("=== VOICE PACKET PROCESSING ERROR ===");
      console.error(err);
      ws.send(JSON.stringify({ type: "error", message: err.message || "Internal server processing error" }));
    }
  });

  ws.on("close", () => {
    console.log(`=== USER DISCONNECTED FROM VOICE CHANNEL === [${user.email || user.userId}]`);
  });
});

// App error handling boundary
app.use((err, req, res, next) => {
  console.error("=== GLOBAL VOICE HTTP ERROR ===");
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Voice Server Error",
    stack: err.stack
  });
});

server.listen(port, () => {
  console.log(`Voice Service successfully launched on port ${port}`);
});

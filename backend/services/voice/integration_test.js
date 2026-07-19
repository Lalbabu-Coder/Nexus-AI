import WebSocket from "ws";
import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const redis = new Redis(REDIS_URL);

async function runTest() {
  console.log("=== STARTING INTEGRATION TEST ===");

  // 1. Insert a mock user session into Redis
  const mockSessionId = "test_integration_session_999";
  const mockUser = {
    userId: "6a5a67467bfe6f760b9773a5",
    email: "integration_tester@nexusai.com"
  };

  console.log(`Setting session in Redis key: session:${mockSessionId}...`);
  await redis.set(`session:${mockSessionId}`, JSON.stringify(mockUser), "EX", 120);

  // 2. Connect to the local Voice Service WebSocket
  const socketUrl = `ws://localhost:8000/api/voice?session=${mockSessionId}`;
  console.log(`Connecting to WebSocket: ${socketUrl}...`);
  
  const ws = new WebSocket(socketUrl);

  ws.on("open", () => {
    console.log("✅ WebSocket connection successfully established");

    // Send control message to start a stream session
    console.log("Sending start session control message...");
    ws.send(JSON.stringify({
      type: "start",
      conversationId: "60d5ec49f1b2b8214c8d4f1a",
      agent: "chat"
    }));
  });

  ws.on("message", (message, isBinary) => {
    if (isBinary) {
      console.log(`Received binary audio frame from server: ${message.length} bytes`);
    } else {
      const data = JSON.parse(message.toString());
      console.log("Received JSON control frame:", data);

      if (data.type === "ready") {
        console.log("Voice Service is ready. Streaming audio chunks...");
        // Send simulated speech chunk (volume > 1000) to trigger speech detection
        const speechChunk = Buffer.alloc(1024);
        for (let i = 0; i < speechChunk.length; i += 2) {
          speechChunk.writeInt16LE(1500, i);
        }
        ws.send(speechChunk);

        // Send a silent chunk to let the server VAD silence trigger
        const silenceChunk = Buffer.alloc(1024);
        ws.send(silenceChunk);
      } else if (data.type === "transcription") {
        console.log(`✅ Transcription received: "${data.text}"`);
      } else if (data.type === "finished") {
        console.log(`✅ Finished signal received. Assistant text response: "${data.text}"`);
        cleanupAndExit(0);
      } else if (data.type === "error") {
        console.error(`❌ Error message received from server: "${data.message}"`);
        // Expected if Agent service is offline, but check that handling works
        cleanupAndExit(data.message.includes("ECONNREFUSED") ? 0 : 1);
      }
    }
  });

  ws.on("error", (err) => {
    console.error("❌ WebSocket client error:", err.message);
    cleanupAndExit(1);
  });

  ws.on("close", (code, reason) => {
    console.log(`WebSocket channel closed. Code: ${code}, Reason: ${reason.toString()}`);
  });

  async function cleanupAndExit(code) {
    console.log("Cleaning up Redis test session...");
    await redis.del(`session:${mockSessionId}`);
    redis.disconnect();
    console.log("=== INTEGRATION TEST COMPLETE ===");
    process.exit(code);
  }
}

// Run with timeout boundary
setTimeout(() => {
  console.error("❌ Integration test timed out");
  process.exit(1);
}, 15000);

runTest().catch(err => {
  console.error("Fatal test error:", err);
  process.exit(1);
});

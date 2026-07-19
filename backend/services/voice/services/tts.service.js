import axios from "axios";

/**
 * Generate a tiny 1-second mock WAV beep sound as a fallback.
 * @returns {Buffer} Binary WAV audio buffer.
 */
const createMockWav = () => {
  const sampleRate = 8000;
  const numSamples = sampleRate * 1; // 1 second of audio
  const dataSize = numSamples * 2; // 16-bit PCM is 2 bytes per sample
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write("RIFF", 0);
  buffer.write("WAVE", 8);
  buffer.writeUInt32LE(36 + dataSize, 4);

  // fmt chunk
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // Mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);

  // data chunk
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Fill data with a simple beep (sine wave)
  const frequency = 440; // 440 Hz
  for (let i = 0; i < numSamples; i++) {
    const sampleValue = Math.sin((2 * Math.PI * frequency * i) / sampleRate);
    const val = Math.floor(sampleValue * 32767);
    buffer.writeInt16LE(val, 44 + i * 2);
  }

  return buffer;
};

/**
 * Synthesize text into binary audio data.
 * Falls back to a mock WAV structure if the ElevenLabs API key is not set.
 *
 * @param {string} text - Response text to synthesize.
 * @returns {Promise<Buffer>} Binary audio stream data.
 */
export const synthesizeSpeech = async (text) => {
  let apiKey = process.env.ELEVENLABS_API_KEY;
  if (apiKey) {
    apiKey = apiKey.trim().replace(/^['"]|['"]$/g, "");
  }

  // Fallback to local mock WAV if API key is not set or is default
  if (!apiKey || apiKey === "YOUR_ELEVENLABS_API_KEY_HERE") {
    console.warn("[TTS] ElevenLabs API Key is missing or default. Falling back to Local Mock WAV.");
    return createMockWav();
  }

  const defaultVoiceId = "21m00Tcm4TlvDq8ikWAM"; // Rachel voice
  const modelId = "eleven_multilingual_v2"; // Migrated from deprecated eleven_monolingual_v1
  const requestUrl = `https://api.elevenlabs.io/v1/text-to-speech/${defaultVoiceId}`;
  const payload = {
    text,
    model_id: modelId,
    voice_settings: {
      stability: 0.5,
      similarity_boost: 0.75
    }
  };

  console.log("[TTS Verification]");
  console.log("- ELEVENLABS_API_KEY loaded:", apiKey ? "YES" : "NO");
  console.log("- API key length:", apiKey ? apiKey.length : 0);
  console.log("- API key prefix (first 5 characters only):", apiKey ? apiKey.substring(0, 5) : "N/A");
  console.log("- Voice ID:", defaultVoiceId);
  console.log("- Model ID:", modelId);

  try {
    console.log(`[TTS] Initiating ElevenLabs POST request to: ${requestUrl}`);
    console.log("Audio format requested: MP3");
    console.log("Audio MIME type requested: audio/mpeg");

    const response = await axios.post(
      requestUrl,
      payload,
      {
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          accept: "audio/mpeg"
        },
        responseType: "arraybuffer",
        timeout: 15000 // 15s timeout
      }
    );

    console.log("=== ELEVENLABS RESPONSE RECEIVED ===");
    console.log("HTTP status:", response.status);
    console.log("Response headers:", response.headers);
    console.log("Response content length:", response.data ? response.data.byteLength : 0);
    console.log("Audio MIME type:", response.headers["content-type"] || "audio/mpeg");

    return Buffer.from(response.data);
  } catch (error) {
    console.error("=== ELEVENLABS TTS API ERROR ===");
    console.error("HTTP status:", error.response?.status || "N/A");
    console.error("Request URL:", requestUrl);
    console.error("Voice ID:", defaultVoiceId);
    console.error("Model ID:", modelId);
    console.error("Request payload (excluding API key):", JSON.stringify(payload));
    
    const loggedHeaders = error.config?.headers ? { ...error.config.headers } : {};
    if (loggedHeaders["xi-api-key"]) {
      loggedHeaders["xi-api-key"] = "REDACTED";
    }
    console.error("Request headers (mask the API key):", loggedHeaders);
    
    let responseBody = "N/A";
    if (error.response?.data) {
      if (Buffer.isBuffer(error.response.data)) {
        responseBody = error.response.data.toString("utf8");
      } else if (error.response.data instanceof ArrayBuffer) {
        responseBody = Buffer.from(error.response.data).toString("utf8");
      } else {
        responseBody = JSON.stringify(error.response.data);
      }
    }
    console.error("Full response body:", responseBody);
    console.error("Response headers:", error.response?.headers || "N/A");

    // Complete Axios error object serialization
    const cleanError = {
      message: error.message,
      name: error.name,
      code: error.code,
      status: error.response?.status,
      statusText: error.response?.statusText,
      headers: error.response?.headers,
      config: {
        url: error.config?.url,
        method: error.config?.method,
        headers: { ...error.config?.headers }
      }
    };
    if (cleanError.config && cleanError.config.headers && cleanError.config.headers["xi-api-key"]) {
      cleanError.config.headers["xi-api-key"] = "REDACTED";
    }
    console.error("Complete Axios error object:", cleanError);
    console.error("Stack trace:", error.stack);

    // Specific field and voice ID checking logic
    const lowerBody = responseBody.toLowerCase();
    if (lowerBody.includes("voice") && (lowerBody.includes("not found") || lowerBody.includes("invalid") || lowerBody.includes("could not find"))) {
      console.error("The configured Voice ID is invalid.");
    }

    try {
      const parsedBody = JSON.parse(responseBody);
      if (parsedBody.detail && parsedBody.detail.message) {
        console.error("Payload format validation failed. Field details:", parsedBody.detail.message);
      } else if (parsedBody.detail) {
        console.error("Payload format validation failed. Details:", JSON.stringify(parsedBody.detail));
      }
    } catch (e) {
      // not JSON
    }

    console.warn("[TTS] ElevenLabs API failed. Falling back to Local Mock WAV sound to prevent breaking the flow.");
    return createMockWav();
  }
};

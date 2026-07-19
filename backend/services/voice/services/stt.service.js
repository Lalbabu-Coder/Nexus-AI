import axios from "axios";

/**
 * Transcribe a raw binary audio buffer into text.
 * Falls back to a mock demo transcription if the Deepgram API key is not set.
 *
 * @param {Buffer} audioBuffer - Contiguous binary audio data.
 * @returns {Promise<string>} The transcribed text prompt.
 */
export const transcribeAudio = async (audioBuffer) => {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  
  if (!apiKey || apiKey === "YOUR_DEEPGRAM_API_KEY_HERE") {
    console.warn("[STT] Deepgram API Key is missing or default. Falling back to Local Mock Mode.");
    // Simulate minor network delay for realistic mock response
    await new Promise((resolve) => setTimeout(resolve, 800));
    return "This is a demo transcription. Please configure your DEEPGRAM_API_KEY in the voice service environment variables.";
  }

  try {
    console.log(`[STT] Forwarding ${audioBuffer.length} audio bytes to Deepgram API...`);
    console.log("Audio format: Raw Headerless 16-bit Signed Integer PCM");
    console.log("Sample rate: 16000 Hz");
    console.log("Encoding: S16LE (linear16)");
    console.log("MIME type: audio/raw");
    
    // Call Deepgram Nova-2 transcription model with raw PCM parameters
    const response = await axios.post(
      "https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&encoding=linear16&sample_rate=16000&channels=1&language=multi",
      audioBuffer,
      {
        headers: {
          Authorization: `Token ${apiKey}`,
          "Content-Type": "audio/raw"
        },
        timeout: 15000 // 15-second request timeout boundary
      }
    );

    const transcript = response.data?.results?.channels[0]?.alternatives[0]?.transcript;
    
    if (!transcript) {
      console.warn("[STT] Deepgram returned empty transcript payload");
      return "";
    }

    return transcript;
  } catch (error) {
    console.error("=== DEEPGRAM STT API ERROR ===");
    console.error("HTTP status:", error.response?.status || "N/A");
    console.error("Response body:", error.response?.data ? JSON.stringify(error.response.data) : "N/A");
    console.error("Request URL:", error.config?.url || "N/A");
    
    const loggedHeaders = error.config?.headers ? { ...error.config.headers } : {};
    if (loggedHeaders.Authorization) {
      loggedHeaders.Authorization = "Bearer TOKEN_REDACTED";
    }
    console.error("Request headers (excluding key):", loggedHeaders);
    
    console.error("Audio format being sent: Raw headerless Linear 16-bit PCM");
    console.error("Sample rate: 16000 Hz");
    console.error("Encoding: S16LE (linear16)");
    console.error("MIME type: audio/raw");
    
    throw new Error(`Speech-to-Text conversion failed: ${error.message}`);
  }
};

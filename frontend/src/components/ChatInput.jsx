import { useState } from "react";
import { Send, Paperclip, Square, Zap, MessageSquare, Code2, Presentation, Image as ImageIcon, Globe, FileText, X, Mic, MicOff, Sparkles, Loader2, Volume2, User, Radio } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { addMessage, setArtifacts, setIsLoading } from "../redux/message.slice";
import { sendPrompt } from "../features/agent.api";
import { useEffect } from "react";
import { createConversation, updateConversations } from "../features/conversation.api";
import { addConversation, setConvTitle, setSelectedConversation } from "../redux/conversation.slice";
import { useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const speakText = (text, onEnd) => {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
    
    // 1. Remove code blocks completely (they are terrible to listen to)
    let cleanText = text.replace(/```[\s\S]*?```/g, " ");
    
    // 2. Remove inline code backticks
    cleanText = cleanText.replace(/`([^`]+)`/g, "$1");
    
    // 3. Remove markdown syntax like bold, italics, links, and headings
    cleanText = cleanText
      .replace(/[#*`_\[\]()\-]/g, " ") // replace markdown symbols with spaces
      .replace(/\n+/g, " ") // replace newlines with spaces
      .replace(/\s+/g, " ") // compress multiple spaces
      .trim();

    if (!cleanText) {
      if (onEnd) onEnd();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(cleanText);
    const voices = window.speechSynthesis.getVoices();
    
    // 4. Detect if text contains Hindi characters
    const isHindi = /[\u0900-\u097F]/.test(cleanText);
    console.log(`[Voice Client] Speech language detection: isHindi=${isHindi}`);
    utterance.lang = isHindi ? "hi-IN" : "en-US";

    let preferredVoice = null;
    if (isHindi) {
      // Find a Hindi voice (prefer local over online cloud-based Microsoft voices because they fail on Chrome)
      const hindiVoices = voices.filter(
        (v) =>
          v.lang === "hi" ||
          v.lang.startsWith("hi-") ||
          v.lang.startsWith("hi_") ||
          v.name.toLowerCase().includes("hindi")
      );
      preferredVoice =
        hindiVoices.find(
          (v) =>
            !v.name.toLowerCase().includes("online") &&
            !v.name.toLowerCase().includes("natural")
        ) || hindiVoices[0];
    } else {
      // Find an English voice (prefer local over online)
      const englishVoices = voices.filter(
        (v) =>
          v.lang === "en" ||
          v.lang.startsWith("en-") ||
          v.lang.startsWith("en_") ||
          v.name.toLowerCase().includes("english")
      );
      preferredVoice =
        englishVoices.find(
          (v) =>
            !v.name.toLowerCase().includes("online") &&
            !v.name.toLowerCase().includes("natural")
        ) || englishVoices[0];
    }

    // Fallback to first available voice if preferred language voice is not found
    utterance.voice = preferredVoice || voices.find(v => v.lang === "hi" || v.lang.startsWith("hi-")) || voices.find(v => v.lang === "en" || v.lang.startsWith("en-")) || voices[0];
    
    if (utterance.voice) {
      console.log(`[Voice Client] Selected voice: ${utterance.voice.name} (${utterance.voice.lang})`);
      utterance.lang = utterance.voice.lang;
    }
    
    utterance.rate = 1.1; // Slightly faster for a modern, crisp AI feel
    utterance.pitch = 1.05; // Slightly higher pitch for clarity

    // Setup speech lifecycle event handlers
    utterance.onstart = () => {
      console.log("[Voice Client] Speech started speaking");
    };
    utterance.onend = () => {
      console.log("[Voice Client] Speech finished speaking");
      if (onEnd) onEnd();
    };
    utterance.onerror = (e) => {
      console.error("[Voice Client] Speech error occurred:", e.error, e);
      
      // If the remote online voice failed to play, retry immediately with the default system local voice
      if (utterance.voice && (e.error === "synthesis-failed" || e.error === "voice-unavailable")) {
        console.warn("[Voice Client] Remote online voice failed. Retrying speech synthesis with default local voice...");
        
        // Clear the failed utterance from the queue to unblock the engine
        window.speechSynthesis.cancel();
        
        const fallbackUtterance = new SpeechSynthesisUtterance(cleanText);
        fallbackUtterance.lang = "en-US"; // Force local English voice (like Microsoft David) to prevent resolving to the failed online Hindi voice again
        fallbackUtterance.rate = 1.0;
        fallbackUtterance.pitch = 1.0;
        fallbackUtterance.voice = null; // System default voice (guaranteed to be local & offline)
        
        fallbackUtterance.onstart = () => console.log("[Voice Client] Fallback local speech started");
        fallbackUtterance.onend = () => {
          console.log("[Voice Client] Fallback local speech finished");
          if (onEnd) onEnd();
        };
        fallbackUtterance.onerror = (err) => {
          console.error("[Voice Client] Fallback local speech failed:", err.error);
          if (onEnd) onEnd();
        };
        
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        window.speechSynthesis.speak(fallbackUtterance);
      } else {
        if (onEnd) onEnd();
      }
    };
    
    console.log("[Voice Client] Speaking response text using Web Speech API...");
    
    // Resume speech synthesis to bypass Chrome silent pausing bugs
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
    window.speechSynthesis.speak(utterance);
  } else {
    console.warn("[Voice Client] Web Speech Synthesis not supported in this browser.");
    if (onEnd) onEnd();
  }
};

export default function ChatInput({
  setBanner
}) {
  const [selectedAgent, setSelectedAgent] = useState("auto");
  const [value, setValue] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [voiceState, setVoiceState] = useState("idle"); // "idle" | "connecting" | "listening" | "processing" | "speaking"
  const [connectionStatus, setConnectionStatus] = useState("disconnected"); // "disconnected" | "connecting" | "connected" | "reconnecting"
  const [liveTranscript, setLiveTranscript] = useState("");
  const [aiResponseText, setAiResponseText] = useState("");

  const recognitionRef = useRef(null);
  const dispatch = useDispatch();
  const { selectedConversation } = useSelector(state => state.conversation);
  const { isLoading } = useSelector(state => state.message);
  const fileRef = useRef(null);

  const [selectedFile, setSelectedFile] = useState(null);

  const placeholders = {
    auto: "Ask NexusAI...",
    chat: "Chat with NexusAI...",
    coding: "Describe the software you want...",
    pdf: "Generate a PDF about...",
    ppt: "Create a presentation about...",
    image: "Describe the image...",
    search: "Search the web..."
  };

  const agents = [
    { id: "auto", icon: Zap, label: "Auto" },
    { id: "chat", icon: MessageSquare, label: "Chat" },
    { id: "coding", icon: Code2, label: "Coding" },
    { id: "pdf", icon: FileText, label: "PDF" },
    { id: "ppt", icon: Presentation, label: "PPT" },
    { id: "image", icon: ImageIcon, label: "Image" },
    { id: "search", icon: Globe, label: "Search" }
  ];

  const socketRef = useRef(null);
  const audioCtxRef = useRef(null);
  const streamRef = useRef(null);
  const processorRef = useRef(null);
  const audioChunksRef = useRef([]);
  const activeAudioRef = useRef(null);

  const stopRecordingLocally = () => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
  };

  const stopVoiceSession = () => {
    stopRecordingLocally();
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    setIsListening(false);
    setVoiceState("idle");
    setConnectionStatus("disconnected");
  };

  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.getVoices();
    }
    return () => {
      // Unmount cleanup
      if (processorRef.current) processorRef.current.disconnect();
      if (streamRef.current) streamRef.current.getTracks().forEach((track) => track.stop());
      if (audioCtxRef.current) audioCtxRef.current.close().catch(() => {});
      if (socketRef.current) socketRef.current.close();
      
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
      }
    };
  }, []);

  const toggleMic = async () => {
    // Stop any ongoing SpeechSynthesis or HTML5 Audio playback immediately
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }

    if (isListening) {
      stopVoiceSession();
      return;
    }

    setVoiceState("connecting");
    setConnectionStatus("connecting");
    setLiveTranscript("");
    setAiResponseText("");

    try {
      console.log("[Voice Client] Toggling mic... Instantiating AudioContext inside user gesture stack.");
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioContextClass({ sampleRate: 16000 });
      audioCtxRef.current = audioCtx;

      if (audioCtx.state === "suspended") {
        console.log("[Voice Client] AudioContext is suspended, resuming...");
        await audioCtx.resume();
      }

      console.log("[Voice Client] Requesting microphone access...");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      let conversation = selectedConversation;
      if (!conversation) {
        const newConversation = await createConversation();
        dispatch(addConversation(newConversation));
        dispatch(setSelectedConversation(newConversation));
        conversation = newConversation;
      }

      const serverUrl = (import.meta.env.VITE_SERVER_URL || "http://localhost:8000").replace(/['"]/g, "");
      const wsUrl = serverUrl.replace(/^http/, "ws") + "/api/voice";

      console.log(`[Voice Client] Connecting to WebSocket: ${wsUrl}`);
      const ws = new WebSocket(wsUrl);
      ws.binaryType = "blob";
      socketRef.current = ws;

      ws.onopen = () => {
        console.log("[Voice Client] WebSocket connection opened. Sending 'start' control handshake.");
        setIsListening(true);
        setConnectionStatus("connected");
        setVoiceState("listening");
        ws.send(
          JSON.stringify({
            type: "start",
            conversationId: conversation._id,
            agent: selectedAgent,
          })
        );
      };

      ws.onmessage = async (event) => {
        if (event.data instanceof Blob) {
          console.log(`[Voice Client] Received binary audio packet: ${event.data.size} bytes`);
          audioChunksRef.current.push(event.data);
        } else {
          const data = JSON.parse(event.data);
          console.log("[Voice Client] Received JSON control message:", data);

          if (data.type === "ready") {
            console.log("[Voice Client] Handshake confirmed. Hooking up mic stream...");
            setVoiceState("listening");
            setConnectionStatus("connected");
            const currentAudioCtx = audioCtxRef.current;
            if (!currentAudioCtx) {
              throw new Error("AudioContext was not initialized!");
            }
            if (currentAudioCtx.state === "suspended") {
              await currentAudioCtx.resume();
            }

            const source = currentAudioCtx.createMediaStreamSource(stream);
            const processor = currentAudioCtx.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;

            let sentChunksCount = 0;
            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBuffer = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) {
                const s = Math.max(-1, Math.min(1, inputData[i]));
                pcmBuffer[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
              }
              if (ws.readyState === WebSocket.OPEN) {
                sentChunksCount++;
                if (sentChunksCount % 4 === 0) {
                  console.log(`[Voice Client] Sending PCM packets stream: ${sentChunksCount} chunks transmitted`);
                }
                ws.send(pcmBuffer.buffer);
              }
            };

            source.connect(processor);
            processor.connect(currentAudioCtx.destination);
          } else if (data.type === "processing") {
            console.log("[Voice Client] Server processing VAD silence event. Halting mic recording.");
            stopRecordingLocally();
            setVoiceState("processing");
            dispatch(setIsLoading(true));
          } else if (data.type === "transcription") {
            console.log("[Voice Client] User speech transcribed:", data.text);
            setLiveTranscript(data.text);
            dispatch(addMessage({ role: "user", content: data.text }));
          } else if (data.type === "finished") {
            console.log("[Voice Client] Assistant response complete:", data.text);
            dispatch(setIsLoading(false));
            setVoiceState("speaking");
            setAiResponseText(data.text);
            dispatch(addMessage({ role: "assistant", content: data.text }));

            // Play synthesized response audio
            if (audioChunksRef.current.length > 0) {
              const chunks = [...audioChunksRef.current];
              audioChunksRef.current = [];
              
              console.log(`[Voice Client] Total audio chunks received: ${chunks.length}`);
              chunks.forEach((chunk, idx) => {
                console.log(`[Voice Client] Chunk ${idx}: size=${chunk.size} bytes, type=${chunk.type}`);
              });

              // Detect MIME type dynamically from the first chunk's signature
              const firstChunk = chunks[0];
              const headerSlice = firstChunk.slice(0, 4);
              
              const reader = new FileReader();
              reader.onload = () => {
                const arrayBuffer = reader.result;
                const view = new DataView(arrayBuffer);
                let detectedMime = "audio/mpeg"; // Default to MP3
                
                if (view.byteLength >= 4) {
                  const signature = view.getUint32(0, false); // big-endian
                  console.log(`[Voice Client] Audio binary header signature: 0x${signature.toString(16).toUpperCase()}`);
                  if (signature === 0x52494646) { // "RIFF"
                    detectedMime = "audio/wav";
                    console.log("[Voice Client] Detected WAV format ('RIFF' header matched)");
                  } else {
                    console.log("[Voice Client] Detected MP3 format (or generic stream)");
                  }
                }
                
                const audioBlob = new Blob(chunks, { type: detectedMime });
                console.log(`[Voice Client] Created Audio Blob: size=${audioBlob.size} bytes, type=${audioBlob.type}`);
                
                if (detectedMime === "audio/wav" && audioBlob.size === 16044) {
                  console.log("[Voice Client] Mock audio fallback detected (16044 bytes). Redirecting to Web Speech API.");
                  setVoiceState("speaking");
                  speakText(data.text, () => setVoiceState("idle"));
                  return;
                }
                
                const audioUrl = URL.createObjectURL(audioBlob);
                const audio = new Audio(audioUrl);
                activeAudioRef.current = audio;
                
                audio.oncanplay = () => {
                  console.log(`[Voice Client] Event: oncanplay | duration=${audio.duration}s | readyState=${audio.readyState}`);
                };
                
                audio.onloadedmetadata = () => {
                  console.log(`[Voice Client] Event: onloadedmetadata | duration=${audio.duration}s | networkState=${audio.networkState}`);
                };
                
                audio.onerror = (e) => {
                  console.error("[Voice Client] Event: onerror | Audio error details:", audio.error);
                  URL.revokeObjectURL(audioUrl); // Release object URL on error
                  if (activeAudioRef.current === audio) {
                    activeAudioRef.current = null;
                  }
                  setVoiceState("idle");
                };
                
                audio.onended = () => {
                  console.log(`[Voice Client] Event: onended | currentTime=${audio.currentTime}s`);
                  URL.revokeObjectURL(audioUrl); // Release object URL on completion
                  if (activeAudioRef.current === audio) {
                    activeAudioRef.current = null;
                  }
                  setVoiceState("idle");
                };
                
                console.log("[Voice Client] Audio playback started");
                console.log(`[Voice Client] State before play(): paused=${audio.paused}, muted=${audio.muted}, volume=${audio.volume}, duration=${audio.duration}`);
                
                audio.play()
                  .then(() => {
                    console.log("[Voice Client] Audio element play() promise resolved successfully");
                    setVoiceState("speaking");
                  })
                  .catch((e) => {
                    console.error("[Voice Client] Audio element play() promise rejected:", e);
                    URL.revokeObjectURL(audioUrl); // Release object URL on failure
                    if (activeAudioRef.current === audio) {
                      activeAudioRef.current = null;
                    }
                    setVoiceState("idle");
                  });
              };
              
              reader.readAsArrayBuffer(headerSlice);
            } else {
              // Fallback to Web Speech API ONLY if no audio was received from the server at all
              console.log("[Voice Client] No audio received from server. Falling back to Web Speech API.");
              setVoiceState("speaking");
              speakText(data.text, () => setVoiceState("idle"));
            }

            // Close session cleanly
            stopVoiceSession();
          } else if (data.type === "error") {
            console.error("[Voice Client] Received pipeline error:", data.message);
            dispatch(setIsLoading(false));
            setBanner({
              open: true,
              title: "Assistant Error",
              message: data.message,
              type: "error",
            });
            stopVoiceSession();
          }
        }
      };

      ws.onerror = (err) => {
        console.error("[Voice Client] WebSocket connection error:", err);
        setConnectionStatus("disconnected");
        stopVoiceSession();
      };

      ws.onclose = () => {
        console.log("[Voice Client] WebSocket connection closed");
        setConnectionStatus("disconnected");
        stopVoiceSession();
      };
    } catch (err) {
      console.error("[Voice Client] Failed to boot voice session:", err);
      alert("Microphone permission denied or connection timed out.");
      stopVoiceSession();
    }
  };


  const handleSend = async () => {
    const prompt = value.trim();
    if (!prompt) return;

    dispatch(setIsLoading(true));

    try {


      let conversation = selectedConversation;

      if (!conversation) {
        const newConversation = await createConversation();
        dispatch(addConversation(newConversation));
        dispatch(setSelectedConversation(newConversation));
        conversation = newConversation;
      }

      if (conversation.title === "New Chat") {
        await updateConversations(conversation._id, prompt.slice(0, 40));
        dispatch(setConvTitle({ conversationId: conversation._id, title: prompt.slice(0, 40) }));
      }

      dispatch(addMessage({ role: "user", content: prompt }));
      setValue("");

      const formData = new FormData();

formData.append(
    "conversationId",
    conversation._id
);

formData.append(
    "prompt",
    prompt
);

formData.append(
    "agent",
    selectedAgent
);

if(selectedFile){

    formData.append(
        "file",
        selectedFile
    );

}

setSelectedFile(null)

      const data = await sendPrompt(formData);
    console.log(data)
     dispatch(
  addMessage({
    role: "assistant",
    content: data.answer,
    images:data.images
  })
);

console.log(data)

if(data.artifacts){
  dispatch(
    setArtifacts(
      data.artifacts
    )
  );
}}
catch(error){

  setBanner({

    open:true,

    title:
      error.response?.data?.title ||
      "Something went wrong",

    message:
      error.response?.data?.message ||
      "Please try again."

  });

}
  finally {
       dispatch(setIsLoading(false));
    }
  };

  return (
   <div className="w-full overflow-hidden px-4 md:px-6 py-4 border-t border-white/[0.06] bg-[#040508]/90 backdrop-blur-xl">
     {isListening && (
       <div 
         onClick={stopVoiceSession}
         className="fixed inset-0 z-[9999] bg-[#06070a]/95 backdrop-blur-2xl flex flex-col items-center justify-between py-10 px-4 md:px-8 select-none transition-all duration-300 animate-transcript-fade"
       >
         {/* Top Header */}
         <div className="w-full max-w-xl flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
           {/* Brand & Connection Badge */}
           <div className="flex items-center gap-3">
             <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] backdrop-blur-md">
               {connectionStatus === "connected" ? (
                 <>
                   <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
                   <span className="text-[11px] font-semibold text-emerald-400 tracking-wider uppercase">Connected</span>
                 </>
               ) : connectionStatus === "connecting" ? (
                 <>
                   <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                   <span className="text-[11px] font-semibold text-amber-400 tracking-wider uppercase">Connecting...</span>
                 </>
               ) : (
                 <>
                   <span className="w-2 h-2 rounded-full bg-rose-500" />
                   <span className="text-[11px] font-semibold text-rose-400 tracking-wider uppercase">Disconnected</span>
                 </>
               )}
             </div>
             <span className="text-xs text-slate-400 font-medium hidden sm:inline-block">NexusAI Voice Mode</span>
           </div>

           {/* Close Button */}
           <button 
             onClick={stopVoiceSession}
             className="p-2.5 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-slate-300 hover:text-white transition-all cursor-pointer shadow-lg active:scale-95"
             title="Exit Voice Mode"
           >
             <X size={18} />
           </button>
         </div>

         {/* Center Section: Live Transcript + Visual Orb + Assistant Response */}
         <div className="flex flex-col items-center justify-center gap-5 my-auto w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
           
           {/* Live User Speech Transcript Bubble */}
           {liveTranscript && (
             <div className="w-full max-w-md bg-[#0c0e17]/90 border border-indigo-500/25 backdrop-blur-xl rounded-2xl p-4 shadow-[0_10px_30px_rgba(99,102,241,0.12)] animate-transcript-fade transition-all">
               <div className="flex items-center justify-between mb-2">
                 <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
                   <User size={13} />
                   <span>You (Live Speech)</span>
                 </div>
                 <span className="flex items-center gap-1.5 text-[11px] text-indigo-300/80 italic">
                   <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
                   Transcribing...
                 </span>
               </div>
               <p className="text-sm md:text-base text-slate-300 font-normal italic leading-relaxed break-words">
                 "{liveTranscript}"
               </p>
             </div>
           )}

           {/* Central Visual Orb & Mic Core with 4 Visual States */}
           <div className="relative flex items-center justify-center w-52 h-52 md:w-64 md:h-64 my-2">
             
             {/* State 1: CONNECTING / IDLE */}
             {voiceState === "connecting" && (
               <div className="absolute inset-0 flex items-center justify-center">
                 <div className="w-48 h-48 md:w-56 md:h-56 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                 <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-indigo-500/10 to-purple-500/10 blur-2xl animate-pulse" />
               </div>
             )}

             {/* State 2: LISTENING (User speaking - expanding wave ripples) */}
             {voiceState === "listening" && (
               <>
                 <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-indigo-600/25 via-purple-600/20 to-pink-500/20 blur-3xl animate-pulse" />
                 <div className="absolute w-full h-full rounded-full border border-indigo-500/30 animate-voice-ripple-1 pointer-events-none" />
                 <div className="absolute w-full h-full rounded-full border border-purple-500/30 animate-voice-ripple-2 pointer-events-none" />
                 <div className="absolute w-full h-full rounded-full border border-indigo-400/20 animate-voice-ripple-3 pointer-events-none" />
               </>
             )}

             {/* State 3: PROCESSING (AI thinking - gradient spinner halo) */}
             {voiceState === "processing" && (
               <>
                 <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-cyan-500/20 via-indigo-500/20 to-purple-600/20 blur-3xl" />
                 <div className="absolute w-52 h-52 md:w-60 md:h-60 rounded-full border-2 border-transparent border-t-cyan-400 border-r-indigo-500 animate-spin-slow pointer-events-none" />
                 <div className="absolute w-44 h-44 md:w-52 md:h-52 rounded-full border border-purple-500/30 animate-ping opacity-30 [animation-duration:1.5s]" />
               </>
             )}

             {/* State 4: SPEAKING (AI response talking - glowing equalizer ring) */}
             {voiceState === "speaking" && (
               <>
                 <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-emerald-500/25 via-indigo-500/20 to-purple-500/20 blur-3xl animate-pulse" />
                 <div className="absolute w-52 h-52 md:w-60 md:h-60 rounded-full border-2 border-emerald-500/40 shadow-[0_0_30px_rgba(16,185,129,0.3)] animate-pulse" />
               </>
             )}

             {/* Core Button Orb Container */}
             <div className={`relative w-36 h-36 md:w-44 md:h-44 rounded-full p-[2px] shadow-2xl transition-all duration-500 ${
               voiceState === "listening" 
                 ? "bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 shadow-[0_0_50px_rgba(99,102,241,0.5)] scale-105" 
                 : voiceState === "processing"
                 ? "bg-gradient-to-br from-cyan-400 via-indigo-500 to-purple-600 shadow-[0_0_50px_rgba(6,182,212,0.4)]"
                 : voiceState === "speaking"
                 ? "bg-gradient-to-br from-emerald-400 via-indigo-500 to-purple-500 shadow-[0_0_50px_rgba(16,185,129,0.5)] scale-105"
                 : "bg-gradient-to-br from-slate-700 via-slate-800 to-indigo-950 shadow-lg"
             }`}>
               <div className="w-full h-full rounded-full bg-[#080a10]/90 backdrop-blur-2xl flex flex-col items-center justify-center overflow-hidden relative">
                 
                 {/* Visualizer Inside Orb */}
                 {voiceState === "listening" && (
                   <div className="flex items-center justify-center gap-1.5 h-10">
                     <span className="w-1.5 h-5 bg-gradient-to-t from-indigo-500 to-cyan-400 rounded-full animate-bounce [animation-delay:0.1s] [animation-duration:1s]" />
                     <span className="w-1.5 h-8 bg-gradient-to-t from-purple-500 to-pink-400 rounded-full animate-bounce [animation-delay:0.3s] [animation-duration:0.8s]" />
                     <span className="w-1.5 h-6 bg-gradient-to-t from-pink-500 to-indigo-400 rounded-full animate-bounce [animation-delay:0.2s] [animation-duration:1.2s]" />
                     <span className="w-1.5 h-9 bg-gradient-to-t from-cyan-500 to-purple-400 rounded-full animate-bounce [animation-delay:0.4s] [animation-duration:0.9s]" />
                     <span className="w-1.5 h-5 bg-gradient-to-t from-indigo-500 to-pink-400 rounded-full animate-bounce [animation-delay:0.5s] [animation-duration:1.1s]" />
                   </div>
                 )}

                 {voiceState === "processing" && (
                   <div className="flex flex-col items-center justify-center gap-2">
                     <Loader2 size={28} className="text-cyan-400 animate-spin" />
                   </div>
                 )}

                 {voiceState === "speaking" && (
                   <div className="flex items-end justify-center gap-1.5 h-10">
                     <span className="w-1.5 bg-gradient-to-t from-emerald-500 to-indigo-400 rounded-full animate-equalizer-bar-1" />
                     <span className="w-1.5 bg-gradient-to-t from-emerald-400 to-cyan-300 rounded-full animate-equalizer-bar-2" />
                     <span className="w-1.5 bg-gradient-to-t from-emerald-500 to-purple-400 rounded-full animate-equalizer-bar-3" />
                     <span className="w-1.5 bg-gradient-to-t from-emerald-400 to-indigo-300 rounded-full animate-equalizer-bar-4" />
                     <span className="w-1.5 bg-gradient-to-t from-emerald-500 to-teal-300 rounded-full animate-equalizer-bar-5" />
                   </div>
                 )}

                 {(voiceState === "connecting" || voiceState === "idle") && (
                   <Mic size={32} className="text-indigo-400 animate-pulse" />
                 )}
               </div>
             </div>
           </div>

           {/* Dynamic Voice State Label */}
           <div className="flex flex-col items-center text-center gap-1.5 max-w-xs">
             <p className="text-lg font-semibold tracking-tight text-slate-100 flex items-center gap-2">
               {voiceState === "connecting" && "Connecting to Voice..."}
               {voiceState === "listening" && (
                 <>
                   <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
                   Listening...
                 </>
               )}
               {voiceState === "processing" && (
                 <>
                   <Sparkles size={16} className="text-cyan-400 animate-spin" />
                   NexusAI Thinking...
                 </>
               )}
               {voiceState === "speaking" && (
                 <>
                   <Volume2 size={16} className="text-emerald-400 animate-bounce" />
                   NexusAI Speaking...
                 </>
               )}
               {voiceState === "idle" && "Tap Mic to Speak"}
             </p>
             <p className="text-xs text-slate-400 leading-relaxed font-normal">
               {voiceState === "listening" ? "Speak naturally in Hindi or English." : "Tap below to exit voice mode."}
             </p>
           </div>

           {/* Assistant Spoken Response Bubble */}
           {aiResponseText && (
             <div className="w-full max-w-md bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-indigo-500/25 text-slate-200 rounded-2xl rounded-tl-sm px-5 py-4 shadow-[0_8px_32px_rgba(99,102,241,0.12)] backdrop-blur-md animate-stream-word transition-all">
               <div className="flex items-center gap-2 mb-2.5 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
                 <Sparkles size={14} className="text-indigo-400" />
                 <span>NexusAI Spoken Response</span>
               </div>
               <div className="text-sm md:text-base text-slate-100 leading-relaxed font-normal">
                 <ReactMarkdown remarkPlugins={[remarkGfm]}>
                   {aiResponseText}
                 </ReactMarkdown>
               </div>
             </div>
           )}

         </div>

         {/* Footer Control Bar */}
         <div className="w-full max-w-xs flex flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
           <button 
             onClick={stopVoiceSession}
             className="w-full py-3 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-violet-600 text-white font-semibold text-xs hover:opacity-90 active:scale-95 transition-all shadow-[0_4px_20px_rgba(99,102,241,0.3)] cursor-pointer flex items-center justify-center gap-2"
           >
             <MicOff size={16} />
             Stop & Exit Voice Mode
           </button>
           <span className="text-[10px] text-slate-500 tracking-wider uppercase font-semibold">Tap anywhere or press close to exit</span>
         </div>
       </div>
     )}

     {/* Main Input Card Container */}
     <div className="flex flex-col gap-3 bg-[#090b12]/90 border border-white/[0.08] focus-within:border-indigo-500/40 focus-within:shadow-[0_0_40px_rgba(99,102,241,0.15)] rounded-2xl p-4 transition-all duration-300 shadow-2xl relative">

       {/* Agent Pills */}
       <div className="flex w-full gap-2 pr-2 flex-wrap items-center">
         {agents.map((agent) => {
           const Icon = agent.icon;
           const isActive = selectedAgent === agent.id;

           return (
             <button
               key={agent.id}
               onClick={() => setSelectedAgent(agent.id)}
               className={`
                 flex-shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all duration-200 cursor-pointer
                 ${
                   isActive
                     ? "bg-gradient-to-r from-indigo-500 via-purple-500 to-violet-600 text-white border-transparent shadow-[0_0_18px_rgba(99,102,241,0.35)] scale-[1.03]"
                     : "bg-white/[0.03] text-slate-400 border-white/[0.06] hover:bg-white/[0.07] hover:text-slate-200 hover:border-white/[0.1]"
                 }
               `}
             >
               <Icon size={13} className={isActive ? "text-white" : "text-slate-500"} />
               {agent.label}
             </button>
           );
         })}
       </div>

{

selectedFile && (

<div className="my-3">

<div className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">

{

selectedFile.type==="application/pdf"

?

<FileText

size={16}

className="text-red-400"

/>

:



selectedFile?.type.startsWith("image/")

&&

<img

src={URL.createObjectURL(selectedFile)}

className="h-10 w-10 rounded-xl object-cover mt-3"

/>



}

<div>

<p className="text-xs text-white">

{

selectedFile.name

}

</p>

<p className="text-[10px] text-slate-500">

{

Math.ceil(

selectedFile.size/

1024

)

}

KB

</p>

</div>

<button

onClick={()=>{

setSelectedFile(null);

fileRef.current.value="";

}}

className="ml-2"

>

<X

size={14}

className="text-slate-500 hover:text-white"

/>

</button>

</div>

</div>

)
}


        {/* Textarea */}
        <textarea
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder={
placeholders[selectedAgent]
}
          rows={3}
          disabled={isLoading}
          className="w-full bg-transparent outline-none resize-none text-[14px] text-slate-200 placeholder:text-slate-600 leading-relaxed [scrollbar-width:none] [&::-webkit-scrollbar]:hidden disabled:opacity-50"
        />

        {/* Bottom row */}
        <div className="flex items-center justify-between">

          {/* Left — attach + mic */}
          <div className="flex items-center gap-1">
  <input

ref={fileRef}

type="file"

hidden

accept=".pdf,image/*"

onChange={(e)=>{

const file =
e.target.files[0];

if(file){

setSelectedFile(file);

}

}}

/>
            <button className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-600 hover:text-slate-400 hover:bg-white/[0.05] border border-transparent hover:border-white/[0.06] transition-all duration-150 bg-transparent cursor-pointer"
            onClick={()=>
fileRef.current.click()
}
            >
              <Paperclip size={14} />
            </button>
           <button
             onClick={toggleMic}
             title={isListening ? "Stop Voice Session" : "Start Voice Assistant"}
             className={`
               relative flex items-center justify-center w-8 h-8 rounded-lg transition-all cursor-pointer duration-200
               ${
                 isListening
                   ? voiceState === "listening"
                     ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-[0_0_12px_rgba(99,102,241,0.5)] scale-105"
                     : voiceState === "processing"
                     ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40"
                     : voiceState === "speaking"
                     ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                     : "bg-red-500 text-white"
                   : "text-slate-400 hover:text-white hover:bg-white/[0.08] border border-transparent hover:border-white/[0.06] animate-mic-idle-glow"
               }
             `}
           >
             {isListening ? (
               voiceState === "processing" ? (
                 <Loader2 size={14} className="animate-spin text-cyan-400" />
               ) : voiceState === "speaking" ? (
                 <Volume2 size={14} className="animate-bounce text-emerald-400" />
               ) : (
                 <MicOff size={14} />
               )
             ) : (
               <Mic size={14} />
             )}
           </button>
          </div>

          {/* Right — send / stop */}
          <button
            onClick={handleSend}
            disabled={!isLoading && !value.trim()}
            className={`flex items-center justify-center w-8 h-8 rounded-lg border-none cursor-pointer transition-all duration-150
              ${isLoading
                ? "bg-white text-[#0d0f14] hover:bg-slate-200"
                : value.trim()
                ? "bg-gradient-to-br from-indigo-500 to-violet-700 hover:opacity-90 text-white"
                : "bg-white/[0.05] text-slate-600 cursor-not-allowed"
              }`}
          >
            {isLoading ? <Square size={12} fill="currentColor" /> : <Send size={14} />}
          </button>

        </div>
      </div>

      <p className="text-center text-[10.5px] text-slate-700 mt-2.5">
        NexusAI can make mistakes. Verify important info.
      </p>
    </div>
  );
}
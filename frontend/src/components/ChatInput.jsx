import { useState } from "react";
import { Send, Paperclip,  Square, Zap, MessageSquare, Code2, Presentation, Image as ImageIcon, Globe, FileText,X } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { addMessage, setArtifacts, setIsLoading } from "../redux/message.slice";
import { sendPrompt } from "../features/agent.api";
import { Mic, MicOff } from "lucide-react";
import { useEffect } from "react";
import { createConversation, updateConversations } from "../features/conversation.api";
import { addConversation, setConvTitle, setSelectedConversation } from "../redux/conversation.slice";
import { useRef } from "react";

const speakText = (text) => {
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

    if (!cleanText) return;

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
        fallbackUtterance.onend = () => console.log("[Voice Client] Fallback local speech finished");
        fallbackUtterance.onerror = (err) => console.error("[Voice Client] Fallback local speech failed:", err.error);
        
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        window.speechSynthesis.speak(fallbackUtterance);
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
  }
};

export default function ChatInput({
  setBanner
}) {
  const [selectedAgent, setSelectedAgent] =useState("auto");
  const [value, setValue] = useState("");
const [isListening, setIsListening] = useState(false);

const recognitionRef = useRef(null);
  const dispatch = useDispatch();
  const { selectedConversation } = useSelector(state => state.conversation);
   const { isLoading } = useSelector(state => state.message);
const fileRef = useRef(null);

const [

selectedFile,

setSelectedFile

]=useState(null);

   const placeholders={

auto:"Ask NexusAI...",

chat:"Chat with NexusAI...",

coding:"Describe the software you want...",

pdf:"Generate a PDF about...",

ppt:"Create a presentation about...",

image:"Describe the image...",

search:"Search the web..."

};

   const agents = [

  {
    id:"auto",
    icon:Zap,
    label:"Auto"
  },

  {
    id:"chat",
    icon:MessageSquare,
    label:"Chat"
  },

  {
    id:"coding",
    icon:Code2,
    label:"Coding"
  },

  {
    id:"pdf",
    icon:FileText,
    label:"PDF"
  },

  {
    id:"ppt",
    icon:Presentation,
    label:"PPT"
  },

  {
    id:"image",
    icon:ImageIcon,
    label:"Image"
  },

  {
    id:"search",
    icon:Globe,
    label:"Search"
  }

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
            dispatch(setIsLoading(true));
          } else if (data.type === "transcription") {
            console.log("[Voice Client] User speech transcribed:", data.text);
            dispatch(addMessage({ role: "user", content: data.text }));
          } else if (data.type === "finished") {
            console.log("[Voice Client] Assistant response complete:", data.text);
            dispatch(setIsLoading(false));
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
                  speakText(data.text);
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
                };
                
                audio.onended = () => {
                  console.log(`[Voice Client] Event: onended | currentTime=${audio.currentTime}s`);
                  URL.revokeObjectURL(audioUrl); // Release object URL on completion
                  if (activeAudioRef.current === audio) {
                    activeAudioRef.current = null;
                  }
                };
                
                console.log("[Voice Client] Audio playback started");
                console.log(`[Voice Client] State before play(): paused=${audio.paused}, muted=${audio.muted}, volume=${audio.volume}, duration=${audio.duration}`);
                
                audio.play()
                  .then(() => {
                    console.log("[Voice Client] Audio element play() promise resolved successfully");
                  })
                  .catch((e) => {
                    console.error("[Voice Client] Audio element play() promise rejected:", e);
                    URL.revokeObjectURL(audioUrl); // Release object URL on failure
                    if (activeAudioRef.current === audio) {
                      activeAudioRef.current = null;
                    }
                  });
              };
              
              reader.readAsArrayBuffer(headerSlice);
            } else {
              // Fallback to Web Speech API ONLY if no audio was received from the server at all
              console.log("[Voice Client] No audio received from server. Falling back to Web Speech API.");
              speakText(data.text);
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
        stopVoiceSession();
      };

      ws.onclose = () => {
        console.log("[Voice Client] WebSocket connection closed");
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
   <div className="w-full overflow-hidden px-4 md:px-6 py-5 border-t border-white/[0.04] bg-[#06070a]/80 backdrop-blur-md">
     {isListening && (
       <div 
         onClick={stopVoiceSession}
         className="fixed inset-0 z-[9999] bg-[#090a0f]/98 backdrop-blur-xl flex flex-col items-center justify-between py-16 px-6 select-none cursor-pointer"
       >
         {/* Top Header */}
         <div className="w-full max-w-lg flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
           <div className="flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
             <span className="text-[11px] font-semibold text-slate-500 tracking-wider uppercase">NexusAI Voice Mode</span>
           </div>
           <button 
             onClick={stopVoiceSession}
             className="p-2 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-400 hover:text-white transition-all cursor-pointer"
           >
             <X size={16} />
           </button>
         </div>

         {/* Central ChatGPT-like Glowing Circle/Orb */}
         <div className="flex flex-col items-center justify-center gap-10 my-auto" onClick={(e) => e.stopPropagation()}>
           <div className="relative flex items-center justify-center w-60 h-60">
             {/* Glowing Background Aura */}
             <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-indigo-500/15 via-purple-500/10 to-pink-500/15 blur-3xl animate-pulse" />
             
             {/* Pulsing Wave Rings */}
             <div className="absolute w-44 h-44 rounded-full border border-indigo-500/20 animate-ping opacity-25 [animation-duration:3s]" />
             <div className="absolute w-36 h-36 rounded-full border border-purple-500/30 animate-ping opacity-45 [animation-duration:2s]" />

             {/* ChatGPT Glowing Orb Core */}
             <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 p-[1.5px] shadow-[0_0_40px_rgba(99,102,241,0.4)] transition-all duration-300">
               <div className="w-full h-full rounded-full bg-[#090a0f]/90 backdrop-blur-2xl flex items-center justify-center overflow-hidden">
                 <div className="flex items-end justify-center gap-1.5 h-10">
                   <span className="w-1 h-5 bg-gradient-to-t from-indigo-500 to-cyan-400 rounded-full animate-bounce [animation-delay:0.1s] [animation-duration:1s]" />
                   <span className="w-1 h-8 bg-gradient-to-t from-purple-500 to-pink-400 rounded-full animate-bounce [animation-delay:0.3s] [animation-duration:0.8s]" />
                   <span className="w-1 h-6 bg-gradient-to-t from-pink-500 to-indigo-400 rounded-full animate-bounce [animation-delay:0.2s] [animation-duration:1.2s]" />
                   <span className="w-1 h-9 bg-gradient-to-t from-cyan-500 to-purple-400 rounded-full animate-bounce [animation-delay:0.4s] [animation-duration:0.9s]" />
                   <span className="w-1 h-5 bg-gradient-to-t from-indigo-500 to-pink-400 rounded-full animate-bounce [animation-delay:0.5s] [animation-duration:1.1s]" />
                 </div>
               </div>
             </div>
           </div>

           {/* Status text */}
           <div className="flex flex-col items-center text-center gap-2 max-w-xs">
             <p className="text-lg font-semibold text-slate-100 tracking-tight">Listening...</p>
             <p className="text-xs text-slate-400 leading-relaxed font-normal">
               Speak in Hindi or English. Tap anywhere to close.
             </p>
           </div>
         </div>

         {/* Footer */}
         <div className="w-full max-w-xs flex flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
           <button 
             onClick={stopVoiceSession}
             className="px-6 py-2.5 rounded-full bg-white text-[#090a0f] font-semibold text-xs hover:bg-slate-200 active:scale-95 transition-all shadow-md cursor-pointer"
           >
             Mute Microphone
           </button>
           <span className="text-[9px] text-slate-600 tracking-wider uppercase font-semibold">Tap anywhere to exit voice mode</span>
         </div>
       </div>
     )}

       <div className="flex flex-col gap-2.5 bg-white/[0.02] border border-white/[0.05] focus-within:border-indigo-500/30 focus-within:shadow-[0_0_30px_rgba(99,102,241,0.06)] rounded-2xl px-4.5 pt-4 pb-3 transition-all duration-200">


    <div className="flex w-[80%] gap-2 pr-2 flex-wrap">

    {agents.map((agent) => {

      const Icon = agent.icon;
      const isActive = selectedAgent === agent.id;

      return (

        <button
          key={agent.id}
          onClick={() => setSelectedAgent(agent.id)}
          className={`
            flex-shrink-0
            
            inline-flex
            items-center
            gap-1.5
            px-3.5
            py-2
            rounded-full
            text-xs
            font-semibold
            border
            transition-all
            duration-200
            cursor-pointer

            ${
              isActive
                ? "bg-gradient-to-r from-indigo-500 via-purple-500 to-violet-600 text-white border-transparent shadow-[0_0_15px_rgba(99,102,241,0.25)] scale-[1.02]"
                : "bg-white/[0.02] text-slate-400 border-white/[0.04] hover:bg-white/[0.05] hover:text-slate-200"
            }
          `}
        >

          <Icon
            size={14}
            className={
              isActive
                ? "text-white"
                : "text-slate-500"
            }
          />

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

className={`

flex

items-center

justify-center

w-8

h-8

rounded-lg

transition-all

cursor-pointer

${

isListening

?

"bg-red-500 text-white"

:

"text-slate-600 hover:bg-white/[0.05]"

}

`}

>

{

isListening

?

<MicOff size={14}/>

:

<Mic size={14}/>

}

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
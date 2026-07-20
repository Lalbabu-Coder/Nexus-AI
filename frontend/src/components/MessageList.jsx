import MessageBubble from "./MessageBubble";

import { useDispatch, useSelector } from "react-redux";
import { getMessages } from "../features/message.api";
import { setArtifacts, setMessages } from "../redux/message.slice";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
function NeuralPulse() {
  return (
    <div className="relative w-9 h-9 flex items-center justify-center shrink-0">
      {[0, 0.45, 0.9].map((delay, i) => (
        <motion.span
          key={i}
          className="absolute inset-0 rounded-full border border-cyan-400/30"
          initial={{ scale: 0.3, opacity: 0.55 }}
          animate={{ scale: 1.7, opacity: 0 }}
          transition={{
            duration: 1.8,
            repeat: Infinity,
            delay,
            ease: "easeOut",
          }}
        />
      ))}
      <motion.span
        className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-cyan-300 to-violet-400"
        style={{ boxShadow: "0 0 14px rgba(125,211,252,0.55)" }}
        animate={{ scale: [1, 1.25, 1] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

const THINKING_LABELS = ["Thinking", "Analyzing", "Reasoning", "Generating"];

function GeneratingIndicator() {
  const [labelIndex, setLabelIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setLabelIndex((prev) => (prev + 1) % THINKING_LABELS.length);
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  const label = THINKING_LABELS[labelIndex];

  return (
    <div className="flex items-center gap-3 max-w-[72%] py-1">
      <NeuralPulse />
      <div className="flex overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={label}
            className="flex"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            {label.split("").map((ch, i) => (
              <motion.span
                key={i}
                className="text-[13px] font-medium tracking-wide text-slate-400"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{
                  duration: 1.4,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.07,
                }}
              >
                {ch}
              </motion.span>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function MessageList() {

  const bottomRef = useRef(null);
  const { messages, isLoading } = useSelector(state => state.message);
  const { selectedConversation } = useSelector(state => state.conversation);
  const dispatch = useDispatch();
useEffect(() => {

  requestAnimationFrame(() => {

    bottomRef.current?.scrollIntoView({

      behavior: "smooth",

      block: "end"

    });

  });

}, [messages.length, isLoading]);
  useEffect(() => {
    if (!selectedConversation || !selectedConversation?._id || selectedConversation?.title === "New Chat") return;
    const get = async () => {
      const data = await getMessages(selectedConversation._id);
      dispatch(setMessages(data));
      const latestArtifactMessage =
  [...data]
    .reverse()
    .find(
      msg =>
        msg.artifacts &&
        msg.artifacts.length > 0
    );

if (latestArtifactMessage) {

  dispatch(
    setArtifacts(
      latestArtifactMessage.artifacts
    )
  );

}
    };
    get();
  }, [selectedConversation?._id]);

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {messages.length === 0 && !isLoading ? (
        <div className="h-full flex flex-col items-center justify-center gap-6 text-center max-w-[620px] mx-auto select-none py-8 relative">
          
          {/* Ambient Background Aura Lights */}
          <div className="absolute w-72 h-72 rounded-full bg-gradient-to-tr from-indigo-500/20 via-purple-500/15 to-pink-500/10 blur-3xl pointer-events-none animate-pulse-glow" />

          {/* Holographic Glowing Central Core Visual */}
          <div className="relative w-24 h-24 flex items-center justify-center shrink-0 my-1 animate-float-slow">
            {/* Outer Concentric Animated Rings */}
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 opacity-25 blur-lg animate-pulse-glow" />
            <div className="absolute inset-0.5 rounded-3xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-cyan-400 opacity-70 animate-spin pointer-events-none" style={{ animationDuration: '12s' }} />
            <div className="absolute -inset-2 rounded-full border border-indigo-500/20 animate-ping opacity-30 pointer-events-none [animation-duration:3s]" />
            
            {/* Core Solid Glass Sphere Card */}
            <div className="absolute inset-[3px] rounded-[20px] bg-[#07090f]/95 border border-white/10 flex items-center justify-center z-10 backdrop-blur-xl shadow-[0_0_35px_rgba(99,102,241,0.25),_inset_0_1px_1px_rgba(255,255,255,0.1)]">
              <span className="text-[34px] font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-purple-200 to-cyan-300">N</span>
            </div>
          </div>
          
          {/* Title & Tagline */}
          <div className="flex flex-col items-center gap-2.5 z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 backdrop-blur-md mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-[11px] font-semibold text-indigo-300 uppercase tracking-widest">Autonomous Intelligence 3.0</span>
            </div>

            <h1 className="text-[42px] md:text-[48px] font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-indigo-200 leading-none">
              Nexus<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">AI</span>
            </h1>
            <h3 className="text-[18px] md:text-[20px] font-semibold text-slate-200 tracking-tight">How can I assist you today?</h3>
            <p className="text-[13.5px] text-slate-400 max-w-[420px] mx-auto leading-relaxed font-normal">
              Empowering next-gen autonomous agent workflows for code, search, synthesis, and voice interaction.
            </p>
          </div>

          {/* Interactive Suggestion Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 w-full mt-3 z-10">
            {[
              { title: "Write a Netflix Clone", desc: "Full-stack code architecture", accent: "from-indigo-500 to-cyan-400" },
              { title: "Explain Redis Caching", desc: "Deep concept breakdown", accent: "from-purple-500 to-pink-400" },
              { title: "Design AI Dashboard", desc: "Modern UI components", accent: "from-cyan-400 to-emerald-400" }
            ].map((item) => (
              <div
                key={item.title}
                className="flex flex-col items-start text-left p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-indigo-500/40 hover:bg-white/[0.04] shadow-[0_4px_20px_rgba(0,0,0,0.2)] hover:shadow-[0_8px_30px_rgba(99,102,241,0.15)] hover:-translate-y-1 transition-all duration-300 cursor-pointer group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-indigo-500/10 to-transparent rounded-bl-full pointer-events-none group-hover:scale-125 transition-transform duration-300" />
                <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${item.accent} mb-3 shadow-[0_0_8px_rgba(99,102,241,0.5)]`} />
                <span className="text-[13px] font-bold text-slate-200 group-hover:text-indigo-300 transition-colors duration-150 tracking-tight">{item.title}</span>
                <span className="text-[11px] text-slate-500 mt-1 font-medium">{item.desc}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              <MessageBubble role={msg.role} content={msg.content} images={msg?.images || []}/>
            </motion.div>
          ))}

          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <GeneratingIndicator />
            </motion.div>
          )}
        
        </>
      )}
        <div ref={bottomRef} />
    </div>
  );
}
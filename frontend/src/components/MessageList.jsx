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
        <div className="h-full flex flex-col items-center justify-center gap-7 text-center max-w-[540px] mx-auto select-none py-10 relative">
          
          {/* Glowing central core visual */}
          <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
            {/* Outer animated rotating border ring */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 opacity-30 blur-md animate-pulse-glow" />
            <div className="absolute inset-0.5 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 opacity-70 animate-spin" style={{ animationDuration: '15s' }} />
            
            {/* Inner solid glass card */}
            <div className="absolute inset-[3px] rounded-[13px] bg-[#0c0e14]/90 border border-white/[0.08] flex items-center justify-center z-10 backdrop-blur-sm shadow-[inset_0_0_12px_rgba(255,255,255,0.05)]">
              <span className="text-[28px] font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-purple-200">N</span>
            </div>
          </div>
          
          <div className="flex flex-col gap-2 z-10">
            <h1 className="text-[40px] font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-purple-200">
              Nexus<span className="text-indigo-400">AI</span>
            </h1>
            <h3 className="text-[17px] font-bold text-slate-300">How can I assist you today?</h3>
            <p className="text-[13.5px] text-slate-500 max-w-[340px] mx-auto leading-relaxed">
              Unlock the power of advanced multimodal AI agents for search, code, docs, and presentations.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full mt-4 z-10">
            {[
              { title: "Write a Netflix clone", desc: "Build code project", accent: "from-blue-500 to-indigo-500" },
              { title: "Explain Redis", desc: "Understand concepts", accent: "from-purple-500 to-pink-500" },
              { title: "Build a dashboard", desc: "Design interfaces", accent: "from-teal-500 to-emerald-500" }
            ].map((item) => (
              <button
                key={item.title}
                className="flex flex-col items-start text-left p-4 rounded-xl bg-white/[0.01] border border-white/[0.04] hover:border-indigo-500/30 hover:bg-white/[0.03] hover:shadow-[0_0_25px_rgba(99,102,241,0.08)] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group"
              >
                <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${item.accent} mb-3`} />
                <span className="text-[12.5px] font-semibold text-slate-200 group-hover:text-indigo-300 transition-colors duration-150">{item.title}</span>
                <span className="text-[10.5px] text-slate-500 mt-1">{item.desc}</span>
              </button>
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
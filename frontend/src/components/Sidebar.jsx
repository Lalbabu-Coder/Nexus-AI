import { useEffect, useState } from "react";
import { Plus, MessageSquare, Settings, LogOut, User, PenSquare, Menu, X, Coins, ConeIcon, CoinsIcon, Trash2 } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import api from "../utils/axios";
import { setUserData } from "../redux/user.slice";
import { createConversation, getConversations, deleteConversation } from "../features/conversation.api";
import { addConversation, setConversations, setSelectedConversation, removeConversation } from "../redux/conversation.slice";
import { getMessages } from "../features/message.api";
import { setArtifacts, setMessages } from "../redux/message.slice";
  import BillingDrawer from "./BillingDrawer";

export default function Sidebar() {
  const [hovered, setHovered]     = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
 const [imageError,setImageError]=useState(false)
  const { userData } = useSelector(state => state.user);
  const { conversations, selectedConversation } = useSelector(state => state.conversation);
  const dispatch = useDispatch();
const [showBilling, setShowBilling] =useState(false);
  const logout = async () => {
    try {
      await api.get("/api/auth/logout");
      dispatch(setUserData(null));
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const data = await getConversations();
        dispatch(setConversations(data));
      } catch (error) {
        console.log(error);
      }
    };
    fetchConversations();
  }, [userData?._id]);

  const handleCreateConversation = () => {
    dispatch(setSelectedConversation(null));
    dispatch(setMessages([]));
    dispatch(setArtifacts([]));
    setMobileOpen(false);
  };

  const handleSelectConversation = async (conversation) => {
    setMobileOpen(false);
    dispatch(setSelectedConversation(conversation));
    const messages = await getMessages(conversation._id);
    dispatch(setMessages(messages));
     dispatch(setArtifacts(messages.artifacts));
  };

  const handleDeleteConversation = async (conversationId) => {
    try {
      await deleteConversation(conversationId);
      dispatch(removeConversation(conversationId));
      if (selectedConversation?._id === conversationId) {
        dispatch(setMessages([]));
        dispatch(setArtifacts([]));
      }
    } catch (error) {
      console.log("Delete error:", error);
    }
  };

  const PanelIcon = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/>
    </svg>
  );

  /* ── Collapsed rail — desktop only ── */
  const CollapsedRail = () => (
    <div className="hidden lg:flex flex-col items-center w-[56px] h-screen bg-[#07080b] border-r border-white/[0.06] py-4 gap-1 shrink-0">
      <button
        onClick={() => setCollapsed(false)}
        className="flex items-center justify-center w-9 h-9 rounded-xl text-slate-500 hover:text-slate-200 hover:bg-white/[0.05] transition-colors duration-150 bg-transparent border-none cursor-pointer mb-1"
      >
        <PanelIcon />
      </button>

      <button
        onClick={handleCreateConversation}
        className="flex items-center justify-center w-9 h-9 rounded-xl text-slate-500 hover:text-slate-200 hover:bg-white/[0.05] transition-colors duration-150 bg-transparent border-none cursor-pointer"
      >
        <Plus size={17} />
      </button>

      <div className="flex-1 flex flex-col items-center gap-1 overflow-y-auto w-full px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden mt-1">
        {conversations.map((chat) => {
          const isActive = selectedConversation?._id === chat._id;
          return (
            <button
              key={chat._id}
              onClick={() => handleSelectConversation(chat)}
              title={chat.title}
              className={`flex items-center justify-center w-9 h-9 rounded-xl transition-colors duration-150 border-none cursor-pointer
                ${isActive ? "bg-indigo-500/15 text-indigo-400" : "bg-transparent text-slate-500 hover:bg-white/[0.05] hover:text-slate-300"}`}
            >
              <MessageSquare size={15} />
            </button>
          );
        })}
      </div>

      <div className="mt-auto">
        {userData && (
          <div className="relative">
            {userData.avatar
              ? <img src={userData.avatar} alt={userData.name} className="w-8 h-8 rounded-[8px] object-cover border-2 border-indigo-500/25" />
              : <div className="w-8 h-8 rounded-[8px] bg-white/[0.06] flex items-center justify-center"><User size={14} className="text-slate-400" /></div>
            }
            <span className="absolute -bottom-px -right-px w-2 h-2 bg-green-500 rounded-full border-[1.5px] border-[#0d0f14] block" />
          </div>
        )}
      </div>
    </div>
  );

  /* ── Full sidebar content ── */
  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-[#06070a]/95 backdrop-blur-xl">

      {/* Header */}
      <div className="flex items-center gap-2.5 px-4.5 py-4 border-b border-white/[0.06]">
        {/* Desktop collapse */}
        <button
          onClick={() => setCollapsed(true)}
          className="hidden lg:flex items-center justify-center w-8 h-8 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-white/[0.06] transition-all duration-150 bg-transparent border border-transparent hover:border-white/[0.08] cursor-pointer"
        >
          <PanelIcon />
        </button>

        {/* Mobile close */}
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden flex items-center justify-center w-8 h-8 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-white/[0.06] transition-all duration-150 bg-transparent border border-transparent hover:border-white/[0.08] cursor-pointer"
        >
          <X size={16} />
        </button>

        <div className="flex items-center gap-2 flex-1">
          <span className="text-[18px] font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-200 to-purple-300">NexusAI</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_#10b981]" />
        </div>

        <span className="text-[10px] font-bold uppercase text-indigo-300 bg-indigo-500/15 border border-indigo-500/30 px-2.5 py-0.5 rounded-full tracking-wider shadow-[0_0_10px_rgba(99,102,241,0.15)]">
         {userData?.plan ?? "pro"}
        </span>

        <button
          onClick={handleCreateConversation}
          className="flex items-center justify-center w-8 h-8 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-white/[0.06] transition-all duration-150 bg-transparent border border-transparent hover:border-white/[0.08] cursor-pointer"
          title="New Chat"
        >
          <PenSquare size={15} />
        </button>
      </div>

      {/* New Chat Button */}
      <div className="px-4 pt-4 pb-2">
        <button
          onClick={handleCreateConversation}
          className="w-full flex items-center justify-center gap-2.5 text-sm font-bold text-white bg-gradient-to-r from-indigo-500 via-purple-600 to-violet-700 hover:opacity-95 active:scale-98 rounded-xl py-3 border border-indigo-400/30 shadow-[0_0_25px_rgba(99,102,241,0.25)] hover:shadow-[0_0_35px_rgba(99,102,241,0.4)] transition-all duration-200 cursor-pointer tracking-wide"
        >
          <Plus size={16} className="text-white" />
          New Chat
        </button>
      </div>

      {/* Section label */}
      {conversations.length === 0 ? (
        <div className="px-5 pt-3 pb-1 text-[10.5px] font-bold uppercase tracking-widest text-slate-500">
          No Recent Chats
        </div>
      ) : (
        <p className="px-5 pt-3 pb-1 text-[10.5px] font-bold uppercase tracking-widest text-slate-500">
          Recent Chats
        </p>
      )}

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {conversations.map((chat) => {
          const isActive = selectedConversation?._id === chat._id;
          const isHov = hovered === chat._id;
          return (
            <div
              key={chat._id}
              onClick={() => handleSelectConversation(chat)}
              onMouseEnter={() => setHovered(chat._id)}
              onMouseLeave={() => setHovered(null)}
              className={`flex items-center gap-2.5 cursor-pointer px-3.5 py-2.5 rounded-xl border transition-all duration-200 relative group
                ${isActive 
                  ? "bg-gradient-to-r from-indigo-500/15 via-purple-500/10 to-transparent border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.08)]"
                  : isHov 
                  ? "bg-white/[0.04] border-white/[0.06]"
                  : "bg-transparent border-transparent"}`}
            >
              {isActive && (
                <span className="absolute left-0 top-2.5 bottom-2.5 w-[3px] bg-gradient-to-b from-indigo-400 to-purple-500 rounded-r-md shadow-[0_0_10px_rgba(99,102,241,0.6)]" />
              )}
              <div className={`flex items-center justify-center shrink-0 w-7 h-7 rounded-lg transition-all duration-200
                ${isActive ? "bg-indigo-500/20 text-indigo-300" : "bg-white/[0.04] text-slate-500 group-hover:text-slate-300"}`}>
                <MessageSquare size={14} />
              </div>
              <p className={`text-[13px] font-medium truncate flex-1 ${isActive ? "text-slate-100 font-semibold" : "text-slate-300 group-hover:text-white"}`}>
                {chat.title}
              </p>
              {isHov && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteConversation(chat._id);
                  }}
                  className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer border-none bg-transparent"
                  title="Delete Chat"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer User Profile */}
      <div className="p-3.5 border-t border-white/[0.06] bg-black/20">
        {userData ? (
          <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-md hover:border-indigo-500/20 transition-all duration-200">
            <div className="relative shrink-0">
              {imageError || !userData.avatar ? (
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center">
                  <User size={16} className="text-slate-300" />
                </div>
              ) : (
                <img
                  src={userData.avatar}
                  alt={userData.name}
                  className="w-9 h-9 rounded-xl object-cover border border-indigo-500/30 shadow-md"
                  onError={() => setImageError(true)}
                />
              )}
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#06070a] block shadow-[0_0_6px_#10b981]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13.5px] font-bold text-slate-100 truncate tracking-tight">{userData.name}</p>
              <p className="text-[10.5px] text-slate-400 font-medium truncate mt-0.5">{userData.plan || "Pro Plan"}</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowBilling(true)}
                className="flex items-center justify-center w-7 h-7 rounded-lg border-none bg-transparent text-amber-400 hover:bg-amber-500/10 hover:text-amber-300 transition-all cursor-pointer"
                title="Upgrade Plan"
              >
                <CoinsIcon size={16} />
              </button>
              <button
                onClick={logout}
                className="flex items-center justify-center w-7 h-7 rounded-lg border-none bg-transparent text-slate-500 hover:bg-rose-500/10 hover:text-rose-400 transition-all cursor-pointer"
                title="Sign Out"
              >
                <LogOut size={14} />
              </button>
            </div>
          </div>
        ) : (
          <div className="px-1">
            <button className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-slate-200 bg-white/[0.05] border border-white/[0.08] rounded-xl py-2.5 cursor-pointer hover:bg-white/[0.08] hover:border-indigo-500/30 transition-all">
              Sign In
            </button>
          </div>
        )}
      </div>

    </div>
  );

  if (collapsed) return <CollapsedRail />;

  return (
    <>
      {/* ── Mobile hamburger ── */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-3.5 left-4 z-50 flex items-center justify-center w-8 h-8 rounded-lg bg-[#0d0f14] border border-white/[0.06] text-slate-400 hover:text-slate-200 transition-colors duration-150 cursor-pointer"
      >
        <Menu size={16} />
      </button>

      {/* ── Mobile backdrop ── */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        />
      )}

      {/* ── Sidebar panel ── */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-[270px] h-screen shrink-0
        bg-[#07080b] border-r border-white/[0.06]
        transition-transform duration-250
        ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}>
        <SidebarContent />
      </div>

<BillingDrawer

    open={showBilling}

    onClose={()=>
        setShowBilling(false)
    }

/>
    </>
  );
}
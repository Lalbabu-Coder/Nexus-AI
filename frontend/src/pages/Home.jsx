import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FaGoogle } from "react-icons/fa";
import ArtifactPanel from "../components/ArtifactPanel";
import ChatArea from "../components/ChatArea";
import Sidebar from "../components/Sidebar";
import api from "../utils/axios";
import { setUserData } from "../redux/user.slice";
import { signInWithPopup, signInWithRedirect, getRedirectResult } from "firebase/auth";
import { auth, googleProvider } from "../../firebase";

function Home() {
  const { userData } = useSelector(state => state.user);
  const dispatch = useDispatch();

  const login = async (token) => {
    try {
      const { data } = await api.post(`/api/auth/login`, { token });
      dispatch(setUserData(data.user));
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    const handleRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          const token = await result.user.getIdToken();
          await login(token);
        }
      } catch (error) {
        console.error("Error getting redirect result:", error);
      }
    };
    handleRedirectResult();
  }, []);

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const token = await result.user.getIdToken();
      await login(token);
    } catch (error) {
      console.error("Google popup login failed, trying redirect:", error);
      try {
        await signInWithRedirect(auth, googleProvider);
      } catch (redirectError) {
        console.error("Google redirect login failed:", redirectError);
      }
    }
  };

  return (
    <div className="h-screen flex bg-[#06070a] text-white overflow-hidden relative">
      {/* Premium Ambient Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[60%] rounded-full bg-indigo-500/10 blur-[140px] pointer-events-none select-none animate-pulse-glow" />
      <div className="absolute bottom-[-15%] right-[-5%] w-[45%] h-[55%] rounded-full bg-purple-500/8 blur-[120px] pointer-events-none select-none animate-pulse-glow" />
      <div className="absolute top-[30%] left-[40%] w-[30%] h-[40%] rounded-full bg-indigo-600/5 blur-[150px] pointer-events-none select-none" />

      <Sidebar />
      <ChatArea />
      <ArtifactPanel />

      {!userData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md">
          <div className="w-[360px] bg-[#0c0e14]/80 backdrop-blur-md border border-indigo-500/20 rounded-2xl p-8 flex flex-col gap-6 shadow-[0_0_50px_rgba(99,102,241,0.15)]">

            <div className="flex flex-col gap-1.5 text-center">
              <h2 className="text-[22px] font-bold text-white tracking-tight bg-gradient-to-r from-indigo-300 via-violet-200 to-indigo-100 bg-clip-text text-transparent">Welcome to NexusAI</h2>
              <p className="text-[13px] text-slate-400">Step into the future of autonomous intelligence.</p>
            </div>

            <button
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 py-[11px] rounded-xl text-sm font-semibold text-white bg-gradient-to-br from-indigo-500 to-violet-700 hover:from-indigo-400 hover:to-violet-600 active:from-indigo-600 active:to-violet-800 border border-indigo-500/30 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all duration-200 cursor-pointer"
            >
              <FaGoogle size={15} className="text-white" />
              Continue with Google
            </button>

          </div>
        </div>
      )}
    </div>
  );
}

export default Home;
import express from "express";
import cors from "cors";
import helmet from "helmet";
import connectDB from "./config/db.js";
import dotenv from "dotenv";
import router from "./routes/auth.routes.js";
dotenv.config();
const app = express();
app.set("trust proxy", 1);
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "https://nexus-ai-tau-black.vercel.app",
  "http://localhost:5173"
].filter(Boolean).map((url) => (url.endsWith("/") ? url.slice(0, -1) : url));

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "Cookie", "x-user-id"]
}));

app.use(
  helmet({
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  })
);
app.use(express.json());
const port=process.env.PORT 



import redis from "../../shared/redis/redis.js";

app.get("/", (req, res) => {
  res.status(200).json({
    service: "auth",
    status: "ok",
    commit: process.env.RENDER_GIT_COMMIT || "local"
  });
});

app.get("/redis-test", async (req, res) => {
  try {
    console.log("Redis GET start");
    const response = await redis.ping();
    console.log("Redis GET success");
    return res.status(200).json({
      success: true,
      response: response
    });
  } catch (error) {
    console.error("Redis PING failed:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
      stack: error.stack
    });
  }
});

app.use("/",router)
app.listen(port, () => {
    connectDB()
  console.log(
    `auth service running on ${port}`
  );
});

import express from "express";
import http from "http";
import https from "https";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import proxy from "express-http-proxy";
import { proxyWithUser } from "./utils/proxyWithHeaders.js";
import { protect } from "./middlewares/auth.middleware.js";
import { getCurrentUser } from "./controllers/user.controller.js";
import cookieParser from "cookie-parser"
import { createProxyMiddleware } from "http-proxy-middleware";
dotenv.config();
console.log("=== GATEWAY STARTUP ENVIRONMENT VARIABLES ===");
console.log("process.env.VOICE_SERVICE:", process.env.VOICE_SERVICE);
console.log("process.env.VOICE_SERVICE_URL:", process.env.VOICE_SERVICE_URL);
console.log("=============================================");
const app = express();
app.set("trust proxy", 1);
const port=process.env.PORT || 5000
let allowedOrigin = process.env.FRONTEND_URL || "http://localhost:5173";
if (allowedOrigin.endsWith("/")) {
  allowedOrigin = allowedOrigin.slice(0, -1);
}

app.use(cors({
    origin: allowedOrigin,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie", "x-user-id"]
}));
app.use(
  "/uploads",
  express.static("uploads")
);
app.use(
  helmet({
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  })
);
app.use(morgan("dev"));
app.use(cookieParser());
app.use(express.json());
app.use("/api/auth",proxy(process.env.AUTH_SERVICE))
app.use("/api/me",protect,getCurrentUser)
app.use("/api/chat",protect,proxyWithUser(process.env.CHAT_SERVICE))
app.use("/api/agent",protect,proxyWithUser(process.env.AGENT_SERVICE))
app.use("/api/billing",protect,proxyWithUser(process.env.BILLING_SERVICE))
// wsProxy is replaced by direct WebSocket proxy implementation in the upgrade event handler


app.get(["/", "/health", "/api/health"], (req, res) => {
  console.log(`[Gateway] Health check endpoint pinged at ${new Date().toISOString()}`);
  res.status(200).json({
    service: "gateway",
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});


const server = http.createServer(app);
server.listen(port, () => {
  console.log(
    `Gateway running on ${port}`
  );
});

// Gracefully close server and release socket port on exit signals
const handleShutdown = () => {
  console.log("[Gateway] Shutdown signal received. Closing port 8000...");
  server.close(() => {
    process.exit(0);
  });
  // Force release after 100ms if connections remain active
  setTimeout(() => {
    process.exit(0);
  }, 100);
};

process.on("SIGINT", handleShutdown);
process.on("SIGTERM", handleShutdown);
process.on("SIGUSR2", handleShutdown);

server.on("upgrade", (req, socket, head) => {
  console.log("=== GATEWAY WEBSOCKET UPGRADE REQUEST ===");
  console.log("URL:", req.url);
  console.log("Cookies:", req.headers.cookie);
  
  if (req.url.startsWith("/api/voice")) {
    try {
      let resolvedTarget = process.env.VOICE_SERVICE || process.env.VOICE_SERVICE_URL || "http://localhost:8005";
      if (resolvedTarget === "undefined" || resolvedTarget === "null" || !resolvedTarget) {
        resolvedTarget = "http://localhost:8005";
      }
      
      const targetUrl = new URL(resolvedTarget);
      const isSecure = targetUrl.protocol === "https:" || targetUrl.protocol === "wss:";
      const transport = isSecure ? https : http;
      
      console.log(`[Gateway Upgrade] Direct WS proxying to target: "${targetUrl.href}"`);
      
      const headers = { ...req.headers };
      headers.host = targetUrl.host;
      
      const proxyReq = transport.request({
        method: req.method,
        hostname: targetUrl.hostname,
        port: targetUrl.port || (isSecure ? 443 : 80),
        path: req.url,
        headers: headers,
        agent: false
      });
      
      proxyReq.on("upgrade", (proxyRes, proxySocket, proxyHead) => {
        let responseHeader = `HTTP/1.1 101 Switching Protocols\r\n`;
        for (const [key, value] of Object.entries(proxyRes.headers)) {
          if (Array.isArray(value)) {
            for (const val of value) {
              responseHeader += `${key}: ${val}\r\n`;
            }
          } else {
            responseHeader += `${key}: ${value}\r\n`;
          }
        }
        responseHeader += `\r\n`;
        
        socket.write(responseHeader);
        
        if (proxyHead && proxyHead.length > 0) {
          proxySocket.unshift(proxyHead);
        }
        proxySocket.pipe(socket).pipe(proxySocket);
        console.log("[Gateway Upgrade] WebSocket connection proxied successfully!");
      });
      
      proxyReq.on("error", (err) => {
        console.error("[Gateway Upgrade] Error occurred while proxying request:", err);
        socket.end("HTTP/1.1 502 Bad Gateway\r\n\r\n");
      });
      
      proxyReq.end();
    } catch (err) {
      console.error("[Gateway Upgrade] Error during WebSocket proxy upgrade:", err);
      socket.end("HTTP/1.1 500 Internal Server Error\r\n\r\n");
    }
  } else {
    socket.destroy();
  }
});

process.on("beforeExit", (code) => {
  console.log(`[DEBUG] Gateway beforeExit fired with code: ${code}`);
});

process.on("exit", (code) => {
  console.log(`[DEBUG] Gateway exit fired with code: ${code}`);
});

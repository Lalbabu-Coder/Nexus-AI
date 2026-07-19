import express from "express";
import { chat } from "../controllers/agent.controller.js";
import multer from "../config/multer.js";
import mongoose from "mongoose";

const router = express.Router();

router.get("/health", (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatusMap = { 0: "disconnected", 1: "connected", 2: "connecting", 3: "disconnecting" };
  
  console.log(`[Agent Service] Health endpoint checked at ${new Date().toISOString()}`);
  
  return res.status(200).json({
    service: "agent-service",
    status: "ok",
    uptime: process.uptime(),
    dbStatus: dbStatusMap[dbState] || "unknown",
    timestamp: new Date().toISOString()
  });
});

router.post(
 "/chat",
 multer.single("file"),
 chat
);

export default router;
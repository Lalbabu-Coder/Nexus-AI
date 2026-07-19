import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import router from "./routes/agent.route.js";

const bootStartTime = Date.now();
console.log(`[Agent Service] Initiating boot process at ${new Date(bootStartTime).toISOString()}...`);

dotenv.config();
const app = express();
app.use(express.json());
const port = process.env.PORT || 5002;

app.use("/", router);

app.use((err, req, res, next) => {
  console.error("[Agent Service Unhandled Error]", err);
  if (err.status) {
    return res.status(err.status).json(err.data);
  }
  return res.status(500).json({
    success: false,
    message: err.message || "Internal Server Error"
  });
});

app.listen(port, async () => {
  try {
    await connectDB();
  } catch (dbErr) {
    console.error("[Agent Service] DB Connection failed during startup:", dbErr);
  }
  
  const bootEndTime = Date.now();
  const startupDurationMs = bootEndTime - bootStartTime;
  const startupDurationSec = (startupDurationMs / 1000).toFixed(2);
  
  console.log(`=== [AGENT SERVICE STARTUP COMPLETE] ===`);
  console.log(`[Agent Service] Listening on port: ${port}`);
  console.log(`[Agent Service] Boot Start Time : ${new Date(bootStartTime).toISOString()}`);
  console.log(`[Agent Service] Boot End Time   : ${new Date(bootEndTime).toISOString()}`);
  console.log(`[Agent Service] Startup Duration: ${startupDurationMs} ms (${startupDurationSec} seconds)`);
  console.log(`========================================`);
});


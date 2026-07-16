import express from "express";
import cors from "cors";
import connectDB from "./config/db.js";
import dotenv from "dotenv";
import router from "./routes/auth.routes.js";
dotenv.config();
const app = express();
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

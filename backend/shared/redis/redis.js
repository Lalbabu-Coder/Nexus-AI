import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

const url = process.env.REDIS_URL;

if (!url) {
  throw new Error("CRITICAL ERROR: process.env.REDIS_URL is undefined or empty!");
}

// Print the first 25 characters and mask the rest
const maskedUrl = url.substring(0, 25) + "...(masked)";
console.log("Loaded REDIS_URL from process.env:", maskedUrl);

const isSecure = url.startsWith("rediss://");
console.log("Redis URL protocol starts with:", isSecure ? "rediss://" : (url.startsWith("redis://") ? "redis://" : "unknown protocol"));

const redisOptions = {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: true,
  connectTimeout: 10000,
  retryStrategy(times) {
    return Math.min(times * 100, 2000);
  }
};

// Force TLS configuration if the URL uses rediss:// or is an Upstash connection
if (isSecure || url.includes("upstash")) {
  console.log("Log: Configuring TLS options for secure connection...");
  redisOptions.tls = {
    rejectUnauthorized: false
  };
}

console.log("Log: About to create new Redis() instance...");
const redis = new Redis(url, redisOptions);

redis.on("connect", () => {
  console.log("⚡ Redis: connect event");
});
redis.on("ready", () => {
  console.log("✅ Redis: ready event (Client is ready)");
});
redis.on("error", (error) => {
  console.error("❌ Redis: error event", error);
});
redis.on("close", () => {
  console.log("🔌 Redis: close event");
});
redis.on("reconnecting", (delay) => {
  console.log(`🔄 Redis: reconnecting in ${delay}ms`);
});
redis.on("end", () => {
  console.log("⏹️ Redis: end event");
});

export default redis;
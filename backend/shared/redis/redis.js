import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

const url = process.env.REDIS_URL;

console.log("process.env.REDIS_URL exists?:", !!url);

if (url) {
  const isSecure = url.startsWith("rediss://");
  const isPlain = url.startsWith("redis://");
  console.log("Protocol:", isSecure ? "rediss://" : (isPlain ? "redis://" : "unknown protocol"));
  console.log("Does the URL contain \"upstash.io\"?:", url.includes("upstash.io"));
} else {
  console.log("Protocol: N/A");
  console.log("Does the URL contain \"upstash.io\"?: false");
  throw new Error("CRITICAL ERROR: process.env.REDIS_URL is undefined or empty!");
}

const redisOptions = {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: true,
  connectTimeout: 10000,
  retryStrategy(times) {
    return Math.min(times * 100, 2000);
  }
};

const isSecure = url.startsWith("rediss://");
if (isSecure || url.includes("upstash")) {
  console.log("Log: Configuring TLS options for secure connection...");
  redisOptions.tls = {
    rejectUnauthorized: false
  };
}

console.log("Redis options actually passed to new Redis():", redisOptions);
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
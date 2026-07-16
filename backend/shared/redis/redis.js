import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

const redisOptions = {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: true,
  connectTimeout: 10000,
  retryStrategy(times) {
    return Math.min(times * 100, 2000);
  }
};

// Auto-configure TLS for Upstash or rediss secure connection strings
if (process.env.REDIS_URL && (process.env.REDIS_URL.startsWith("rediss://") || process.env.REDIS_URL.includes("upstash"))) {
  redisOptions.tls = {
    rejectUnauthorized: false
  };
}

console.log("Initializing Redis client...");
const redis = new Redis(process.env.REDIS_URL, redisOptions);

redis.on("connect", () => {
  console.log("⚡ Redis: connect event");
});
redis.on("ready", () => {
  console.log("✅ Redis: ready event");
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
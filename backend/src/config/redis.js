import Redis from "ioredis";

let redis = null;

if (process.env.USE_REDIS === "true") {
  redis = new Redis({
    host: "127.0.0.1",
    port: 6379,
  });

  redis.on("connect", () => {
    console.log("✅ Redis connected");
  });

  redis.on("error", (err) => {
    console.log("⚠️ Redis disabled:", err.message);
  });
}

export default redis;
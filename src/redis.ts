import { createClient } from "redis";

export const redis = createClient({
  url: "redis://localhost:6379",
});

try {
  await redis.connect();
} catch {
  throw new Error("Unable to connect to Redis");
}

redis.on("error", (err) => console.error("Redis Client Error", err));

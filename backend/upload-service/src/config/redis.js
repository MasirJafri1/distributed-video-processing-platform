const { createClient } =
  require("redis");

const redisClient =
  createClient({
    url: process.env.REDIS_URL || "redis://localhost:6379"
  });

redisClient.connect();

module.exports =
  redisClient;
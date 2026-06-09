const { createClient } =
  require("redis");

const redisClient =
  createClient({
    url: process.env.REDIS_URL || "redis://redis:6379"
  });

redisClient.connect();

module.exports =
  redisClient;
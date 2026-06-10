import { createClient } from "redis";

const redisClient = createClient({
  url: "redis://redis:6379",
});

redisClient.connect();

export default redisClient;

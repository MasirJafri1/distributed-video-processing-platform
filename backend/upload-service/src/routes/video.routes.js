const express = require("express");
const redisClient =
  require("../config/redis");
const prisma =
  require("../db/prisma");

const router = express.Router();

router.get("/", async (req, res) => {

  const cachedVideos =
    await redisClient.get(
      "videos"
    );

  if (cachedVideos) {

    return res.json(
      JSON.parse(cachedVideos)
    );
  }

  const videos =
    await prisma.video.findMany({
      orderBy: {
        createdAt: "desc"
      }
    });

  await redisClient.set(
    "videos",
    JSON.stringify(videos),
    {
      EX: 60
    }
  );

  res.json(videos);
});

module.exports = router;
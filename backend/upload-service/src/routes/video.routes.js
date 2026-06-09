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

  const mappedVideos = videos.map(video => ({
    ...video,
    thumbnailUrl: video.thumbnailKey
      ? `https://${process.env.CLOUDFRONT_DOMAIN}/${video.thumbnailKey}`
      : null
  }));

  await redisClient.set(
    "videos",
    JSON.stringify(mappedVideos),
    {
      EX: 60
    }
  );

  res.json(mappedVideos);
});

router.get("/:id", async (req, res) => {
  const video = await prisma.video.findUnique({
    where: {
      id: req.params.id
    }
  });

  if (!video) {
    return res.status(404).json({
      message: "Video not found"
    });
  }

  res.json({
    ...video,
    playbackUrl: `https://${process.env.CLOUDFRONT_DOMAIN}/${video.masterPlaylistKey}`,
    thumbnailUrl: video.thumbnailKey
      ? `https://${process.env.CLOUDFRONT_DOMAIN}/${video.thumbnailKey}`
      : null
  });
});

module.exports = router;
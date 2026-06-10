import prisma from "../db/prisma.js";
import redisClient from "../config/redis.js";

const markVideoProcessed = async (
  videoId,
  masterPlaylistKey,
  thumbnailUrl,
  hlsUrl,
  thumbnailKey,
) => {
  const updatedVideo = await prisma.video.update({
    where: {
      id: videoId,
    },
    data: {
      status: "COMPLETED",
      masterPlaylistKey,
      thumbnailUrl,
      hlsMasterUrl: hlsUrl,
      thumbnailKey,
    },
  });

  await redisClient.del("videos");

  return updatedVideo;
};

export { markVideoProcessed };

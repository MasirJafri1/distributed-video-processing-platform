const prisma =
  require("../db/prisma");
const redisClient =
  require("../config/redis");

const markVideoProcessed =
  async (
    videoId,
    processedUrl,
    thumbnailUrl,
    hlsUrl
  ) => {

  const updatedVideo = await prisma.video.update({
    where: {
      id: videoId
    },

    data: {
      status: "PROCESSED",

      processedVideoUrl:
        processedUrl,

      thumbnailUrl,

      hlsMasterUrl: hlsUrl
    }
  });

await redisClient.del("videos");

return updatedVideo;
};

module.exports = {
  markVideoProcessed
};
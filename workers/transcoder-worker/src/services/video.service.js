const prisma =
  require("../db/prisma");
const redisClient =
  require("../config/redis");

const markVideoProcessed =
  async (
    videoId,
    masterPlaylistKey,
    thumbnailUrl,
    hlsUrl,
    thumbnailKey
  ) => {

  const updatedVideo = await prisma.video.update({
    where: {
      id: videoId
    },

    data: {
      status: "COMPLETED",

      masterPlaylistKey,

      thumbnailUrl,

      hlsMasterUrl: hlsUrl,

      thumbnailKey
    }
  });

await redisClient.del("videos");

return updatedVideo;
};

module.exports = {
  markVideoProcessed
};
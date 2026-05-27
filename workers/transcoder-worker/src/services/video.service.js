const prisma =
  require("../db/prisma");

const markVideoProcessed =
  async (
    videoId,
    processedUrl,
    thumbnailUrl,
    hlsUrl
  ) => {

  return prisma.video.update({
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
};

module.exports = {
  markVideoProcessed
};
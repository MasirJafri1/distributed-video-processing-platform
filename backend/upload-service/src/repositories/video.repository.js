const prisma = require("../db/prisma");

const createVideo = async ({
  id,
  fileName,
  originalS3Key,
  status
}) => {

  return prisma.video.create({
    data: {
      id,
      fileName,
      originalS3Key,
      status
    }
  });
};

module.exports = {
  createVideo
};
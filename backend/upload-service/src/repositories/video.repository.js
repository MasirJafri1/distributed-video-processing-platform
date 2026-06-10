import prisma from "../db/prisma.js";

export const createVideo = async ({ id, fileName, originalS3Key, status }) => {
  return prisma.video.create({
    data: {
      id,
      fileName,
      originalS3Key,
      status,
    },
  });
};

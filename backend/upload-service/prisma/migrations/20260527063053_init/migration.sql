-- CreateTable
CREATE TABLE "Video" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalS3Key" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "processedVideoUrl" TEXT,
    "hlsMasterUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Video_pkey" PRIMARY KEY ("id")
);

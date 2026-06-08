const path = require("path");

const fs = require("fs");

const logger =
  require("../utils/logger");

const {
  downloadFile,
  uploadFile
} = require("../services/s3.service");

const {
  generateThumbnail
} = require("./thumbnail.processor");

const {
  transcodeVideo
} = require("./transcoder.processor");

const {
  generateHLS
} = require("./hls.processor");

const {
  markVideoProcessed
} = require("../services/video.service");

const {
  notifyVideoCompleted
} = require("../services/notification.service");

const {
  createHlsVariant
} = require("../services/hls.service");

const {
  uploadDirectory
} = require("../services/hls-upload.service");

const {
  generateMasterPlaylist
} = require(
  "../services/master-playlist.service"
);

const processVideoJob = async (job) => {
  try {
    logger.info("Processing video:");
    logger.info(job);

    const videoId = job.videoId;

    const tempDir = path.join(
      __dirname,
      "../../temp"
    );

    const outputDir = path.join(
      __dirname,
      "../../output"
    );

    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, {
        recursive: true
      });
    }

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, {
        recursive: true
      });
    }

    fs.mkdirSync(
      "/app/temp/360p",
      { recursive: true }
    );

    fs.mkdirSync(
      "/app/temp/480p",
      { recursive: true }
    );

    fs.mkdirSync(
      "/app/temp/720p",
      { recursive: true }
    );

    const inputPath = path.join(
      tempDir,
      "input.mp4"
    );

    await downloadFile(
      process.env.RAW_BUCKET_NAME,
      job.s3Key,
      inputPath
    );

    logger.info("Video downloaded");

    await createHlsVariant(
      inputPath,
      "/app/temp/360p",
      360,
      "800k"
    );

    await createHlsVariant(
      inputPath,
      "/app/temp/480p",
      480,
      "1400k"
    );

    await createHlsVariant(
      inputPath,
      "/app/temp/720p",
      720,
      "2800k"
    );

    logger.info("HLS variant generation completed");

    fs.mkdirSync(
      "/app/temp/hls",
      {
        recursive: true
      }
    );

    await generateMasterPlaylist(
      "/app/temp/hls/master.m3u8"
    );

    await uploadDirectory(
      "/app/temp/360p",
      `hls/${videoId}/360p`
    );

    await uploadDirectory(
      "/app/temp/480p",
      `hls/${videoId}/480p`
    );

    await uploadDirectory(
      "/app/temp/720p",
      `hls/${videoId}/720p`
    );

    await uploadFile(
      process.env.PROCESSED_BUCKET_NAME,
      `hls/${videoId}/master.m3u8`,
      "/app/temp/hls/master.m3u8",
      "application/x-mpegURL"
    );

    logger.info("HLS directories uploaded");

    await markVideoProcessed(
      videoId,
      `hls/${videoId}/master.m3u8`,
      null,
      `hls/${videoId}/360p/index.m3u8`
    );

    logger.info("Database updated");

    await notifyVideoCompleted({
      id: videoId,
      status: "COMPLETED"
    });

    // Clean up local files
    if (fs.existsSync("/app/temp/360p")) {
      fs.rmSync("/app/temp/360p", { recursive: true, force: true });
    }
    if (fs.existsSync("/app/temp/480p")) {
      fs.rmSync("/app/temp/480p", { recursive: true, force: true });
    }
    if (fs.existsSync("/app/temp/720p")) {
      fs.rmSync("/app/temp/720p", { recursive: true, force: true });
    }
    if (fs.existsSync("/app/temp/hls")) {
      fs.rmSync("/app/temp/hls", { recursive: true, force: true });
    }

    if (fs.existsSync(inputPath)) {
      fs.unlinkSync(inputPath);
    }

    logger.info("Cleanup completed");

  } catch (error) {
    logger.error("Video processing failed:");
    logger.error(error);
    throw error;
  }
};

module.exports = {
  processVideoJob
};
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

const processVideoJob = async (job) => {
  try {
    logger.info("Processing video:");

    logger.info(job);

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

    const inputPath = path.join(
      tempDir,
      "input.mp4"
    );

    const outputVideoPath = path.join(
      outputDir,
      "output.mp4"
    );

    await downloadFile(
      process.env.RAW_BUCKET_NAME,
      job.s3Key,
      inputPath
    );

    logger.info("Video downloaded");

    await transcodeVideo(
      inputPath,
      outputVideoPath
    );

    logger.info("Transcoding completed");

    await generateHLS(
      inputPath,
      outputDir
    );

    logger.info("HLS generation completed");

    await generateThumbnail(
      inputPath,
      outputDir
    );

    logger.info("Thumbnail generated");

    await uploadFile(
      process.env.PROCESSED_BUCKET_NAME,
      `processed/${job.videoId}.mp4`,
      outputVideoPath,
      "video/mp4"
    );

    await uploadFile(
      process.env.THUMBNAIL_BUCKET_NAME,
      `thumbnails/${job.videoId}.jpg`,
      path.join(
        outputDir,
        "thumbnail.jpg"
      ),
      "image/jpeg"
    );

    logger.info("Thumbnail uploaded");

    const outputFiles =
      fs.readdirSync(outputDir);

    for (const file of outputFiles) {

      const filePath = path.join(
        outputDir,
        file
      );

      if (file.endsWith(".m3u8")) {

        await uploadFile(
          process.env.PROCESSED_BUCKET_NAME,
          `hls/${job.videoId}/${file}`,
          filePath,
          "application/vnd.apple.mpegurl"
        );

        logger.info(
          `${file} uploaded`
        );
      }

      if (file.endsWith(".ts")) {

        await uploadFile(
          process.env.PROCESSED_BUCKET_NAME,
          `hls/${job.videoId}/${file}`,
          filePath,
          "video/mp2t"
        );

        logger.info(
          `${file} uploaded`
        );
      }
    }

    logger.info("HLS files uploaded");

    await markVideoProcessed(
    job.videoId,

    `processed/${job.videoId}.mp4`,

    `thumbnails/${job.videoId}.jpg`,

    `hls/${job.videoId}/index.m3u8`
  );

  logger.info("Database updated");

    const files =
      fs.readdirSync(outputDir);

    for (const file of files) {

      const filePath = path.join(
        outputDir,
        file
      );

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    if (fs.existsSync(inputPath)) {
      fs.unlinkSync(inputPath);
    }

    logger.info("Cleanup completed");

  } catch (error) {

    logger.error(
      "Video processing failed:"
    );

    logger.error(error);
  }
};

module.exports = {
  processVideoJob
};
const path = require("path");

const fs = require("fs");

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

const processVideoJob = async (job) => {
  try {
    console.log("Processing video:");

    console.log(job);

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

    console.log("Video downloaded");

    await transcodeVideo(
      inputPath,
      outputVideoPath
    );

    console.log("Transcoding completed");

    await generateThumbnail(
      inputPath,
      outputDir
    );

    console.log("Thumbnail generated");

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

    console.log("Files uploaded");

    if (fs.existsSync(inputPath)) {
      fs.unlinkSync(inputPath);
    }

    if (fs.existsSync(outputVideoPath)) {
      fs.unlinkSync(outputVideoPath);
    }

    const thumbnailPath = path.join(
      outputDir,
      "thumbnail.jpg"
    );

    if (fs.existsSync(thumbnailPath)) {
      fs.unlinkSync(thumbnailPath);
    }

    console.log("Cleanup completed");

  } catch (error) {
    console.error(
      "Video processing failed:"
    );

    console.error(error);
  }
};

module.exports = {
  processVideoJob
};
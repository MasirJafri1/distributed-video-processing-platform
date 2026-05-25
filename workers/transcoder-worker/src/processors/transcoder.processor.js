const ffmpeg = require("fluent-ffmpeg");

const transcodeVideo = (
  inputPath,
  outputPath
) => {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)

      .outputOptions([
        "-preset fast",
        "-crf 28"
      ])

      .save(outputPath)

      .on("end", resolve)

      .on("error", reject);
  });
};

module.exports = {
  transcodeVideo
};
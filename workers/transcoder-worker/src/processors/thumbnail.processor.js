const ffmpeg = require("fluent-ffmpeg");

const generateThumbnail = (
  inputPath,
  outputPath
) => {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .screenshots({
        timestamps: ["10%"],
        filename: "thumbnail.jpg",
        folder: outputPath,
        size: "1280x720"
      })

      .on("end", resolve)

      .on("error", reject);
  });
};

module.exports = {
  generateThumbnail
};
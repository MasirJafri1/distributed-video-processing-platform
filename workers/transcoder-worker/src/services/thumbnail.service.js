const ffmpeg = require("fluent-ffmpeg");

function generateThumbnail(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .screenshots({
        timestamps: ["5"],
        filename: "thumbnail.jpg",
        folder: outputPath,
        size: "640x360"
      })
      .on("end", resolve)
      .on("error", reject);
  });
}

module.exports = {
  generateThumbnail
};

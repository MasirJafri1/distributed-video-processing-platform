import ffmpeg from "fluent-ffmpeg";

function generateThumbnail(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .screenshots({
        timestamps: ["10%"],
        filename: "thumbnail.jpg",
        folder: outputPath,
        size: "640x360",
      })
      .on("end", resolve)
      .on("error", reject);
  });
}

export { generateThumbnail };

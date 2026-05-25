const ffmpeg = require("fluent-ffmpeg");

const generateHLS = (
  inputPath,
  outputDir
) => {
  return new Promise((resolve, reject) => {

    ffmpeg(inputPath)

      .outputOptions([
        "-preset fast",
        "-g 48",
        "-sc_threshold 0",
        "-map 0:0",
        "-map 0:1?",
        "-hls_time 10",
        "-hls_playlist_type vod"
      ])

      .output(`${outputDir}/index.m3u8`)

      .on("end", resolve)

      .on("error", reject)

      .run();
  });
};

module.exports = {
  generateHLS
};
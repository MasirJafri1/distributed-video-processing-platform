const ffmpeg =
  require("fluent-ffmpeg");

function createHlsVariant(
  inputPath,
  outputDir,
  height,
  bitrate
) {

  return new Promise(
    (resolve, reject) => {

      ffmpeg(inputPath)

        .videoCodec("libx264")

        .size(`?x${height}`)

        .outputOptions([
          `-b:v ${bitrate}`,
          "-hls_time 6",
          "-hls_playlist_type vod"
        ])

        .output(
          `${outputDir}/index.m3u8`
        )

        .on(
          "end",
          resolve
        )

        .on(
          "error",
          reject
        )

        .run();
    }
  );
}

module.exports = {
  createHlsVariant
};
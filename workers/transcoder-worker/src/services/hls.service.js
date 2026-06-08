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
          "-preset veryfast",
          "-profile:v main",
          "-hls_time 6",
          "-hls_playlist_type vod",
          "-hls_list_size 0",
          "-sc_threshold 0",
          `-hls_segment_filename ${outputDir}/segment_%03d.ts`
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
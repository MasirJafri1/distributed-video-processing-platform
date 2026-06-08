const fs =
  require("fs");

async function generateMasterPlaylist(
  outputPath
) {

  const content = `#EXTM3U

#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=640x360
360p/index.m3u8

#EXT-X-STREAM-INF:BANDWIDTH=2800000,RESOLUTION=1280x720
720p/index.m3u8
`;

  fs.writeFileSync(
    outputPath,
    content
  );
}

module.exports = {
  generateMasterPlaylist
};
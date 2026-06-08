const fs =
  require("fs");

const path =
  require("path");

const {
  uploadFile
} = require(
  "./s3.service"
);

async function uploadDirectory(
  directory,
  prefix
) {

  const files =
    fs.readdirSync(
      directory
    );

  for (
    const file
    of files
  ) {

    await uploadFile(
      `${directory}/${file}`,
      `${prefix}/${file}`
    );
  }
}

module.exports = {
  uploadDirectory
};

const { createPresignedPost } = require("@aws-sdk/s3-presigned-post");

const { v4: uuidv4 } = require("uuid");

const { s3Client } = require("../config/aws");

const generateUploadUrl = async (fileName, contentType) => {
  const videoId = uuidv4();

  const key = `raw/${videoId}-${fileName}`;

  const { url, fields } = await createPresignedPost(s3Client, {
    Bucket: process.env.RAW_BUCKET_NAME,
    Key: key,
    Conditions: [
      ["content-length-range", 0, 524288000], // max 500MB
      ["eq", "$Content-Type", contentType]
    ],
    Fields: {
      "Content-Type": contentType
    },
    Expires: 3600
  });

  return {
    videoId,
    uploadUrl: url,
    fields,
    key
  };
};

module.exports = {
  generateUploadUrl
};
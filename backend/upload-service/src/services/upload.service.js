const { PutObjectCommand } = require("@aws-sdk/client-s3");

const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const { v4: uuidv4 } = require("uuid");

const { s3Client } = require("../config/aws");

const generateUploadUrl = async (fileName, contentType) => {
  const videoId = uuidv4();

  const key = `raw/${videoId}-${fileName}`;

  const command = new PutObjectCommand({
    Bucket: process.env.RAW_BUCKET_NAME,
    Key: key,
    ContentType: contentType
  });

  const uploadUrl = await getSignedUrl(
    s3Client,
    command,
    {
      expiresIn: 3600
    }
  );

  return {
    videoId,
    uploadUrl,
    key
  };
};

module.exports = {
  generateUploadUrl
};
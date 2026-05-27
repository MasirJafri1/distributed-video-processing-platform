const {
  S3Client,
  GetObjectCommand,
  PutObjectCommand
} = require("@aws-sdk/client-s3");

const fs = require("fs");

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
});

const downloadFile = async (
  bucket,
  key,
  downloadPath
) => {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key
  });

  const response = await s3Client.send(command);

  const writeStream = fs.createWriteStream(
    downloadPath
  );

  return new Promise((resolve, reject) => {
    response.Body.pipe(writeStream);

    response.Body.on("error", reject);

    writeStream.on("finish", resolve);
  });
};

const uploadFile = async (
  bucket,
  key,
  filePath,
  contentType
) => {
  const fileStream =
    fs.createReadStream(filePath);

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: fileStream,
    ContentType: contentType
  });

  await s3Client.send(command);
};

module.exports = {
  downloadFile,
  uploadFile
};
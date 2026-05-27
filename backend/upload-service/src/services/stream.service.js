const {
  GetObjectCommand
} = require("@aws-sdk/client-s3");

const {
  getSignedUrl
} = require(
  "@aws-sdk/s3-request-presigner"
);

const {
  s3Client
} = require("../config/aws");

const generateSignedStreamUrl =
  async (key) => {

    const command =
      new GetObjectCommand({

        Bucket:
          process.env
            .PROCESSED_BUCKET_NAME,

        Key: key
      });

    return getSignedUrl(
      s3Client,
      command,
      {
        expiresIn: 3600
      }
    );
  };

module.exports = {
  generateSignedStreamUrl
};
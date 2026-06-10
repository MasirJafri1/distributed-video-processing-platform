import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client } from "../config/aws.js";

export const generateSignedStreamUrl = async (key) => {
  const command = new GetObjectCommand({
    Bucket: process.env.PROCESSED_BUCKET_NAME,
    Key: key,
  });

  return getSignedUrl(s3Client, command, {
    expiresIn: 3600,
  });
};

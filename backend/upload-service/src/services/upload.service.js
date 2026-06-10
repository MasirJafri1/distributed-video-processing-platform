import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { v4 as uuidv4 } from "uuid";
import { s3Client } from "../config/aws.js";

export const generateUploadUrl = async (fileName, contentType) => {
  const videoId = uuidv4();

  const key = `raw/${videoId}-${fileName}`;

  const { url, fields } = await createPresignedPost(s3Client, {
    Bucket: process.env.RAW_BUCKET_NAME,
    Key: key,
    Conditions: [
      ["content-length-range", 0, 524288000], // max 500MB
      ["eq", "$Content-Type", contentType],
    ],
    Fields: {
      "Content-Type": contentType,
    },
    Expires: 3600,
  });

  return {
    videoId,
    uploadUrl: url,
    fields,
    key,
  };
};

import fs from "fs";
import path from "path";
import { uploadFile } from "./s3.service.js";

async function uploadDirectory(directory, prefix) {
  const files = fs.readdirSync(directory);

  for (const file of files) {
    const ext = path.extname(file);
    const contentType =
      ext === ".m3u8" ? "application/x-mpegURL" : "video/MP2T";

    await uploadFile(
      process.env.PROCESSED_BUCKET_NAME,
      `${prefix}/${file}`,
      `${directory}/${file}`,
      contentType,
    );
  }
}

export { uploadDirectory };

import logger from "../utils/logger.js";
import { generateUploadUrl } from "../services/upload.service.js";
import { createVideo } from "../repositories/video.repository.js";

const createUploadUrl = async (req, res) => {
  try {
    const { fileName, contentType } = req.body;

    if (!fileName || !contentType) {
      return res.status(400).json({
        message: "fileName and contentType required",
      });
    }

    const allowedMimeTypes = [
      "video/mp4",
      "video/quicktime",
      "video/x-msvideo",
    ];

    if (!allowedMimeTypes.includes(contentType)) {
      return res.status(400).json({
        message: "Unsupported file type",
      });
    }

    const data = await generateUploadUrl(fileName, contentType);

    await createVideo({
      id: data.videoId,
      fileName,
      originalS3Key: data.key,
      status: "UPLOADED",
    });

    return res.status(200).json(data);
  } catch (error) {
    logger.error(error);

    return res.status(500).json({
      message: "Failed to generate upload URL",
    });
  }
};

export { createUploadUrl };

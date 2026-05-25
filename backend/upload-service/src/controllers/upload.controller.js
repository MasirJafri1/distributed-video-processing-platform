const {
  generateUploadUrl
} = require("../services/upload.service");

const {
  publishVideoJob
} = require("../services/queue.service");

const createUploadUrl = async (req, res) => {
  try {
    const { fileName, contentType } = req.body;

    if (!fileName || !contentType) {
      return res.status(400).json({
        message: "fileName and contentType required"
      });
    }

    const data = await generateUploadUrl(
      fileName,
      contentType
    );

    await publishVideoJob({
      videoId: data.videoId,
      fileName,
      s3Key: data.key,
      status: "UPLOADED"
    });

    return res.status(200).json(data);

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to generate upload URL"
    });
  }
};

module.exports = {
  createUploadUrl
};
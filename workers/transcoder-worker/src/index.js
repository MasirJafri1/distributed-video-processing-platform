require("dotenv").config();

const {
  pollMessages,
  deleteMessage
} = require("./queue/sqs.consumer");

const {
  processVideoJob
} = require("./processors/video.processor");

const logger = require("./utils/logger");

const startWorker = async () => {
  console.log("Worker started");

  while (true) {
    try {
      const messages = await pollMessages();

      if (!messages.length) {

        await new Promise((resolve) =>
          setTimeout(resolve, 5000)
        );
        continue;
      }

      await Promise.all(
        messages.map(async (message) => {
          logger.info("Polling SQS queue...");

          const s3Event = JSON.parse(message.Body);

          const record = s3Event.Records[0];

          const s3Key = decodeURIComponent(record.s3.object.key);

          const fileName = s3Key.split("/").pop();

          const videoId = fileName.split("-")[0];

          const body = {
            videoId,
            fileName,
            s3Key
          };

          try {

            await processVideoJob(body);

            await deleteMessage(
              message.ReceiptHandle
            );

            logger.info(
              "Message processed successfully"
            );

          } catch (error) {

            logger.error(error);

            logger.error(
              "Message processing failed"
            );
          }

          console.log(
            "Message deleted from queue"
          );
        })
      );

    } catch (error) {
      console.error(error);
    }
  }
};

process.on(
  "SIGTERM",
  async () => {

    logger.info(
      "Graceful shutdown initiated"
    );

    process.exit(0);
  }
);

startWorker();  
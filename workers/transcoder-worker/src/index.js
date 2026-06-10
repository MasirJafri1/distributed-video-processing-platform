import "dotenv/config";
import { pollMessages, deleteMessage } from "./queue/sqs.consumer.js";
import { processVideoJob } from "./processors/video.processor.js";
import logger from "./utils/logger.js";

const startWorker = async () => {
  logger.info("Worker started");

  while (true) {
    try {
      const messages = await pollMessages();

      if (!messages.length) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        continue;
      }

      await Promise.all(
        messages.map(async (message) => {
          logger.info("Polling SQS queue...");

          const s3Event = JSON.parse(message.Body);

          const record = s3Event.Records[0];

          const s3Key = decodeURIComponent(record.s3.object.key);

          const fileName = s3Key.split("/").pop();

          const videoId = fileName.substring(0, 36);

          const body = {
            videoId,
            fileName,
            s3Key,
          };

          try {
            await processVideoJob(body);

            await deleteMessage(message.ReceiptHandle);

            logger.info("Message processed successfully");

            logger.info("Message deleted from queue");
          } catch (error) {
            logger.error(error);

            logger.error("Message processing failed");
          }
        }),
      );
    } catch (error) {
      logger.error(error);
    }
  }
};

process.on("SIGTERM", async () => {
  logger.info("Graceful shutdown initiated");

  process.exit(0);
});

startWorker();

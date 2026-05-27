require("dotenv").config();

const {
  pollMessages,
  deleteMessage
} = require("./queue/sqs.consumer");

const {
  processVideoJob
} = require("./processors/video.processor");

const startWorker = async () => {
  console.log("Worker started");

  while (true) {
    try {
      const messages = await pollMessages();

      for (const message of messages) {
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
      }

    } catch (error) {
      console.error(error);
    }
  }
};

startWorker();
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
        const body = JSON.parse(
          message.Body
        );

        await processVideoJob(body);

        await deleteMessage(
          message.ReceiptHandle
        );

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
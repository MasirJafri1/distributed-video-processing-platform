const {
  SQSClient,
  SendMessageCommand
} = require("@aws-sdk/client-sqs");

const sqsClient = new SQSClient({
  region: process.env.AWS_REGION,

  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey:
      process.env.AWS_SECRET_ACCESS_KEY
  }
});

const publishVideoJob = async (payload) => {
  const command = new SendMessageCommand({
    QueueUrl: process.env.SQS_QUEUE_URL,

    MessageBody: JSON.stringify(payload)
  });

  await sqsClient.send(command);
};

module.exports = {
  publishVideoJob
};
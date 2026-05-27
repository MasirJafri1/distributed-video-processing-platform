const {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageCommand
} = require("@aws-sdk/client-sqs");

const sqsClient = new SQSClient({
  region: process.env.AWS_REGION,
});

const pollMessages = async () => {
  const command = new ReceiveMessageCommand({
    QueueUrl: process.env.SQS_QUEUE_URL,

    MaxNumberOfMessages: 1,

    WaitTimeSeconds: 20
  });

  const response = await sqsClient.send(command);

  return response.Messages || [];
};

const deleteMessage = async (receiptHandle) => {
  const command = new DeleteMessageCommand({
    QueueUrl: process.env.SQS_QUEUE_URL,

    ReceiptHandle: receiptHandle
  });

  await sqsClient.send(command);
};

module.exports = {
  pollMessages,
  deleteMessage
};
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";

const sqsClient = new SQSClient({
  region: process.env.AWS_REGION,
});

export const publishVideoJob = async (payload) => {
  const command = new SendMessageCommand({
    QueueUrl: process.env.SQS_QUEUE_URL,
    MessageBody: JSON.stringify(payload),
  });

  await sqsClient.send(command);
};

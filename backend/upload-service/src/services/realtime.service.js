import logger from "../utils/logger.js";
import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
} from "@aws-sdk/client-apigatewaymanagementapi";
import prisma from "../db/prisma.js";

const client = new ApiGatewayManagementApiClient({
  endpoint: process.env.WEBSOCKET_API_ENDPOINT,
});

async function broadcast(payload) {
  const connections = await prisma.webSocketConnection.findMany();

  for (const connection of connections) {
    try {
      await client.send(
        new PostToConnectionCommand({
          ConnectionId: connection.id,

          Data: Buffer.from(JSON.stringify(payload)),
        }),
      );
    } catch (error) {
      logger.error(error);
    }
  }
}

export { broadcast };

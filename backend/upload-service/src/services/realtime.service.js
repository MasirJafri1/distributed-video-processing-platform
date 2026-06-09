const logger = require("../utils/logger");
const {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand
} = require(
  "@aws-sdk/client-apigatewaymanagementapi"
);

const prisma =
  require("../db/prisma");

const client =
  new ApiGatewayManagementApiClient({
    endpoint:
      process.env
        .WEBSOCKET_API_ENDPOINT
  });

async function broadcast(
  payload
) {

  const connections =
    await prisma.webSocketConnection.findMany();

  for (
    const connection
    of connections
  ) {

    try {

      await client.send(
        new PostToConnectionCommand({
          ConnectionId:
            connection.id,

          Data:
            Buffer.from(
              JSON.stringify(
                payload
              )
            )
        })
      );

    } catch (error) {

      logger.error(
        error
      );
    }
  }
}

module.exports = {
  broadcast
};
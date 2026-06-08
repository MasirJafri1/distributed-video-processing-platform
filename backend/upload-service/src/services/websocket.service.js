const prisma =
  require("../db/prisma");

async function saveConnection(
  connectionId
) {
  return prisma.webSocketConnection.create({
    data: {
      id: connectionId
    }
  });
}

async function removeConnection(
  connectionId
) {
  return prisma.webSocketConnection.deleteMany({
    where: {
      id: connectionId
    }
  });
}

async function getConnections() {
  return prisma.webSocketConnection.findMany();
}

module.exports = {
  saveConnection,
  removeConnection,
  getConnections
};
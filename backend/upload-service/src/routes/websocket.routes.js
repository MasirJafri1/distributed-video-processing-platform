const express =
  require("express");

const {
  saveConnection,
  removeConnection
} = require(
  "../services/websocket.service"
);

const router =
  express.Router();

router.post(
  "/connect",
  async (req, res) => {
    const connectionId = req.body.connectionId || req.body.requestContext?.connectionId;

    if (!connectionId) {
      return res.status(400).json({ error: "connectionId is required" });
    }

    await saveConnection(connectionId);

    res.json({
      success: true
    });
  }
);

router.post(
  "/disconnect",
  async (req, res) => {
    const connectionId = req.body.connectionId || req.body.requestContext?.connectionId;

    if (!connectionId) {
      return res.status(400).json({ error: "connectionId is required" });
    }

    await removeConnection(connectionId);

    res.json({
      success: true
    });
  }
);

module.exports = router;
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

    const {
      connectionId
    } = req.body;

    await saveConnection(
      connectionId
    );

    res.json({
      success: true
    });
  }
);

router.post(
  "/disconnect",
  async (req, res) => {

    const {
      connectionId
    } = req.body;

    await removeConnection(
      connectionId
    );

    res.json({
      success: true
    });
  }
);

module.exports = router;
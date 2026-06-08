const express =
  require("express");

const {
  notifyVideoCompleted
} = require(
  "../services/notification.service"
);

const router =
  express.Router();

router.post(
  "/video-completed",
  async (req, res) => {

    await notifyVideoCompleted(
      req.body
    );

    res.json({
      success: true
    });
  }
);

module.exports = router;
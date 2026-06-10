import express from "express";
import { notifyVideoCompleted } from "../services/notification.service.js";

const router = express.Router();

router.post("/video-completed", async (req, res) => {
  await notifyVideoCompleted(req.body);

  res.json({
    success: true,
  });
});

export default router;

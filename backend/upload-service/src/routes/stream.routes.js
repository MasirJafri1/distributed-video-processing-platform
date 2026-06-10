import express from "express";
import { generateSignedStreamUrl } from "../services/stream.service.js";

const router = express.Router();

router.get("/", async (req, res) => {
  const { key } = req.query;

  const url = await generateSignedStreamUrl(key);

  res.json({ url });
});

export default router;

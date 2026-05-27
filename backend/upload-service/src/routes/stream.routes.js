const express = require("express");

const {
  generateSignedStreamUrl
} = require(
  "../services/stream.service"
);

const router = express.Router();

router.get("/", async (req, res) => {

  const { key } = req.query;

  const url =
    await generateSignedStreamUrl(
      key
    );

  res.json({ url });
});

module.exports = router;
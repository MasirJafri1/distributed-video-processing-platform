const express = require("express");

const prisma =
  require("../db/prisma");

const router = express.Router();

router.get("/", async (req, res) => {

  const videos =
    await prisma.video.findMany({
      orderBy: {
        createdAt: "desc"
      }
    });

  res.json(videos);
});

module.exports = router;
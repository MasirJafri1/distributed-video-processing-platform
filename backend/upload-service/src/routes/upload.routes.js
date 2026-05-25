const express = require("express");

const {
  createUploadUrl
} = require("../controllers/upload.controller");

const router = express.Router();

router.post(
  "/presigned-url",
  createUploadUrl
);

module.exports = router;
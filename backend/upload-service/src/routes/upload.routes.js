import express from "express";
import { createUploadUrl } from "../controllers/upload.controller.js";

const router = express.Router();

router.post("/presigned-url", createUploadUrl);

export default router;

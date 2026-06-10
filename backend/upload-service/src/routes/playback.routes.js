import express from "express";
import logger from "../utils/logger.js";
import prisma from "../db/prisma.js";
import { generatePlaybackCookies } from "../services/cookie.service.js";

const router = express.Router();

/**
 * GET /videos/:id/playback-cookies
 *
 * Generates CloudFront signed cookies scoped to the video's HLS path.
 * The browser stores these cookies and automatically attaches them
 * on subsequent requests to the CloudFront CDN domain.
 */
router.get("/:id/playback-cookies", async (req, res) => {
  try {
    const { id } = req.params;

    // Verify video exists and is playable
    const video = await prisma.video.findUnique({
      where: { id },
    });

    if (!video) {
      return res.status(404).json({
        message: "Video not found",
      });
    }

    if (video.status !== "COMPLETED" && video.status !== "PROCESSED") {
      return res.status(400).json({
        message: "Video is not ready for playback",
      });
    }

    const cookies = generatePlaybackCookies(id);
    const cloudfrontDomain = process.env.CLOUDFRONT_DOMAIN;

    const cookieDomain = process.env.COOKIE_DOMAIN || ".masir-projects.me";
    const cookieOptions = [
      `Path=/`,
      `Secure`,
      `SameSite=None`,
      `Max-Age=7200`,
      `Domain=${cookieDomain}`,
    ].join("; ");

    const cookieHeaders = Object.entries(cookies).map(
      ([name, value]) => `${name}=${value}; ${cookieOptions}`,
    );

    res.setHeader("Set-Cookie", cookieHeaders);

    logger.info({ videoId: id }, "Playback cookies issued");

    return res.status(200).json({
      message: "Cookies set",
      cloudfrontDomain,
      videoId: id,
    });
  } catch (error) {
    logger.error(error, "Failed to generate playback cookies");
    return res.status(500).json({
      message: "Failed to generate playback cookies",
    });
  }
});

export default router;

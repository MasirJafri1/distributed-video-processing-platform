const { getSignedCookies } = require("@aws-sdk/cloudfront-signer");
const fs = require("fs");
const path = require("path");
const logger = require("../utils/logger");

// Load private key — supports both file path and inline PEM via env var
let privateKey;
if (process.env.CLOUDFRONT_PRIVATE_KEY_PATH) {
  privateKey = fs.readFileSync(
    path.resolve(process.env.CLOUDFRONT_PRIVATE_KEY_PATH),
    "utf8"
  );
} else if (process.env.CLOUDFRONT_PRIVATE_KEY) {
  // For Docker / CI: inline PEM stored as env var (newlines as \n)
  privateKey = process.env.CLOUDFRONT_PRIVATE_KEY.replace(/\\n/g, "\n");
} else {
  logger.warn("No CloudFront private key configured — signed cookies will not work");
}

const CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_DOMAIN;
const KEY_PAIR_ID = process.env.CLOUDFRONT_KEY_PAIR_ID;
const COOKIE_EXPIRY_HOURS = parseInt(process.env.COOKIE_EXPIRY_HOURS || "2", 10);

/**
 * Generate CloudFront signed cookies for a specific video's HLS assets.
 * Uses a wildcard policy so a single cookie set covers master.m3u8 + all segments.
 *
 * @param {string} videoId - The UUID of the video
 * @returns {Object} cookies - { "CloudFront-Policy", "CloudFront-Signature", "CloudFront-Key-Pair-Id" }
 */
const generatePlaybackCookies = (videoId) => {
  if (!privateKey || !KEY_PAIR_ID || !CLOUDFRONT_DOMAIN) {
    throw new Error("CloudFront signing is not configured");
  }

  const resourceUrl = `https://${CLOUDFRONT_DOMAIN}/hls/${videoId}/*`;
  const dateLessThan = new Date(
    Date.now() + COOKIE_EXPIRY_HOURS * 60 * 60 * 1000
  ).toISOString();

  const cookies = getSignedCookies({
    keyPairId: KEY_PAIR_ID,
    privateKey,
    policy: JSON.stringify({
      Statement: [
        {
          Resource: resourceUrl,
          Condition: {
            DateLessThan: {
              "AWS:EpochTime": Math.floor(
                new Date(dateLessThan).getTime() / 1000
              )
            }
          }
        }
      ]
    })
  });

  return cookies;
};

module.exports = {
  generatePlaybackCookies
};

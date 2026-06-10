import { NextResponse } from "next/server";

export async function GET(req, { params }) {
  try {
    const resolvedParams = await params;
    const pathParts = resolvedParams.path;

    if (!pathParts || pathParts.length < 2) {
      return new Response("Invalid HLS path", { status: 400 });
    }

    const videoId = pathParts[0];
    const fileSubPath = pathParts.slice(1).join("/");

    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const cdnUrl = process.env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN;

    // 1. Request signed playback cookies from the backend server-side
    const cookieRes = await fetch(
      `${apiUrl}/videos/${videoId}/playback-cookies`,
    );
    if (!cookieRes.ok) {
      return new Response("Failed to authenticate secure playback session", {
        status: cookieRes.status,
      });
    }

    // Extract the Set-Cookie headers
    const rawCookies = cookieRes.headers.getSetCookie
      ? cookieRes.headers.getSetCookie()
      : cookieRes.headers.get("set-cookie");

    // Format the cookies for the outgoing request header
    let cookieString = "";
    if (Array.isArray(rawCookies)) {
      cookieString = rawCookies.map((c) => c.split(";")[0]).join("; ");
    } else if (typeof rawCookies === "string") {
      cookieString = rawCookies.split(";")[0];
    }

    // 2. Fetch the HLS manifest or segment file from CloudFront CDN using the signed cookies
    const targetUrl = `${cdnUrl}/hls/${videoId}/${fileSubPath}`;
    const cdnRes = await fetch(targetUrl, {
      headers: {
        Cookie: cookieString,
      },
    });

    if (!cdnRes.ok) {
      return new Response(`Failed to fetch from CDN: ${cdnRes.statusText}`, {
        status: cdnRes.status,
      });
    }

    // 3. Detect and return correct content-type
    let contentType = "application/octet-stream";
    if (fileSubPath.endsWith(".m3u8")) {
      contentType = "application/vnd.apple.mpegurl";
    } else if (fileSubPath.endsWith(".ts")) {
      contentType = "video/mp2t";
    }

    const buffer = await cdnRes.arrayBuffer();
    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": fileSubPath.endsWith(".m3u8")
          ? "no-cache, no-store, must-revalidate"
          : "public, max-age=31536000",
      },
    });
  } catch (err) {
    console.error("Local HLS Proxy error:", err);
    return new Response(`Internal server error: ${err.message}`, {
      status: 500,
    });
  }
}

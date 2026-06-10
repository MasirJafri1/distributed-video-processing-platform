"use client";

import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";

export default function VideoPlayer({ src, videoId }) {
  const videoRef = useRef(null);
  const [cookiesReady, setCookiesReady] = useState(false);
  const [error, setError] = useState(null);

  // Step 1: Fetch playback cookies from the backend before loading HLS
  useEffect(() => {
    if (!videoId || (src && src.startsWith("/api/hls"))) {
      // If no videoId is provided or streaming via local API proxy, skip browser-side cookies
      setCookiesReady(true);
      return;
    }

    const fetchCookies = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        const res = await fetch(
          `${apiUrl}/videos/${videoId}/playback-cookies`,
          { credentials: "include" },
        );

        if (!res.ok) {
          throw new Error(`Failed to get playback cookies: ${res.status}`);
        }

        setCookiesReady(true);
      } catch (err) {
        console.error("Playback cookie error:", err);
        setError(err.message);
      }
    };

    fetchCookies();
  }, [videoId, src]);

  // Step 2: Once cookies are set, initialize HLS player with credentials
  useEffect(() => {
    if (!src || !cookiesReady) return;

    const video = videoRef.current;

    if (Hls.isSupported()) {
      const hls = new Hls({
        xhrSetup: (xhr) => {
          if (src && !src.startsWith("/api/hls")) {
            xhr.withCredentials = true;
          }
        },
      });
      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          console.error("HLS fatal error:", data);
          setError("Playback error — please try refreshing the page.");
        }
      });

      return () => {
        hls.destroy();
      };
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Safari native HLS
      video.src = src;
    }
  }, [src, cookiesReady]);

  if (error) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          color: "#ef4444",
          fontSize: "0.875rem",
          padding: "1rem",
        }}
      >
        {error}
      </div>
    );
  }

  if (!cookiesReady) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          color: "#94a3b8",
          fontSize: "0.875rem",
        }}
      >
        Preparing secure playback...
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      controls
      className="w-full h-full object-contain rounded-2xl border border-zinc-800 bg-black"
    />
  );
}

"use client";

import { useEffect, useRef } from "react";
import Hls from "hls.js";

export default function VideoPlayer({ src }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (!src) return;

    const video = videoRef.current;

    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(src);
      hls.attachMedia(video);

      return () => {
        hls.destroy();
      };
    } else {
      video.src = src;
    }
  }, [src]);

  return (
    <video
      ref={videoRef}
      controls
      width="100%"
      style={{
        maxWidth: "900px"
      }}
    />
  );
}

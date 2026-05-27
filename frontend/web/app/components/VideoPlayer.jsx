"use client";

import { useEffect, useRef } from "react";

import Hls from "hls.js";

export default function VideoPlayer({
  src
}) {

  const videoRef = useRef(null);

  useEffect(() => {

    if (
      Hls.isSupported() &&
      videoRef.current
    ) {

      const hls = new Hls();

      hls.loadSource(src);

      hls.attachMedia(videoRef.current);

      return () => {
        hls.destroy();
      };
    }

  }, [src]);

  return (
    <video
      ref={videoRef}
      controls
      className="w-full rounded-lg"
    />
  );
}
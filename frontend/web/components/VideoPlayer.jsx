"use client";

import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";

export default function VideoPlayer({ src, videoId, onHlsLog }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const [cookiesReady, setCookiesReady] = useState(false);
  const [error, setError] = useState(null);
  const [levels, setLevels] = useState([]);
  const [currentLevel, setCurrentLevel] = useState(-1); // -1 is Auto

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
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);

      // Event: Manifest Loaded - Extract resolutions
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setLevels(hls.levels || []);
        setCurrentLevel(hls.currentLevel);

        const log = {
          timestamp: new Date().toLocaleTimeString(),
          type: "MANIFEST",
          text: `[HLS] Master playlist parsed. Found ${hls.levels?.length || 0} variant resolutions.`,
        };
        onHlsLog?.(log);
      });

      // Event: Fragment Segment Loaded
      hls.on(Hls.Events.FRAG_LOADED, (event, data) => {
        const frag = data.frag;
        const stats = data.stats;
        const sizeMB = (stats.total / (1024 * 1024)).toFixed(2);
        const loadDurationMs = stats.loading.duration.toFixed(0);
        const levelName =
          hls.levels[frag.level]?.name || `${frag.height}p` || "Auto";
        const segmentFile =
          frag.relurl?.split("/").pop() || frag.url?.split("/").pop();

        const log = {
          timestamp: new Date().toLocaleTimeString(),
          type: "SEGMENT",
          text: `GET /${segmentFile} - 200 OK - ${sizeMB} MB in ${loadDurationMs}ms (${levelName})`,
          details: {
            url: frag.url,
            size: stats.total,
            bitrate: hls.levels[frag.level]?.bitrate,
          },
        };
        onHlsLog?.(log);
      });

      // Event: Resolution Level Switched
      hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
        const idx = data.level;
        const isAuto = hls.autoLevelEnabled;
        const levelName =
          hls.levels[idx]?.name || `${hls.levels[idx]?.height}p` || "Auto";

        const log = {
          timestamp: new Date().toLocaleTimeString(),
          type: "QUALITY",
          text: `[ABR] Switched streaming pipeline output to: ${levelName} ${isAuto ? "(Auto)" : "(Manual)"}`,
        };
        onHlsLog?.(log);
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          console.error("HLS fatal error:", data);
          setError("Playback error — please try refreshing the page.");

          const log = {
            timestamp: new Date().toLocaleTimeString(),
            type: "ERROR",
            text: `[HLS Error] Fatal stream error: ${data.details}`,
          };
          onHlsLog?.(log);
        }
      });

      return () => {
        hls.destroy();
        hlsRef.current = null;
      };
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Safari native HLS
      video.src = src;

      const log = {
        timestamp: new Date().toLocaleTimeString(),
        type: "NATIVE",
        text: `[HLS] Falling back to Safari native HLS playback engine.`,
      };
      onHlsLog?.(log);
    }
  }, [src, cookiesReady]);

  const changeQuality = (levelIndex) => {
    if (!hlsRef.current) return;
    hlsRef.current.currentLevel = levelIndex;
    setCurrentLevel(levelIndex);
  };

  if (error) {
    return (
      <div className="flex items-center justify-center w-full h-full text-rose-500 text-xs font-bold p-4 bg-zinc-950 rounded-2xl border border-zinc-800">
        {error}
      </div>
    );
  }

  if (!cookiesReady) {
    return (
      <div className="flex flex-col gap-3 items-center justify-center w-full h-full text-zinc-400 text-xs font-semibold bg-zinc-950 rounded-2xl border border-zinc-800">
        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        <span>Preparing secure playback...</span>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full group bg-black rounded-2xl overflow-hidden">
      <video
        ref={videoRef}
        controls
        className="w-full h-full object-contain rounded-2xl border border-zinc-800 bg-black"
      />

      {/* Absolute Overlay Quality Switcher */}
      {levels.length > 0 && (
        <div className="absolute top-4 right-4 z-20 opacity-90 hover:opacity-100 transition-opacity">
          <select
            value={currentLevel}
            onChange={(e) => changeQuality(Number(e.target.value))}
            className="bg-black/95 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg border border-zinc-700/80 shadow-md backdrop-blur-md cursor-pointer outline-none transition-all hover:border-zinc-500"
          >
            <option value="-1">Quality: Auto</option>
            {levels.map((level, idx) => (
              <option key={idx} value={idx}>
                {level.name || `${level.height}p`} (
                {Math.round(level.bitrate / 1000)}k)
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

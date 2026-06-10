"use client";

import React, { useState } from "react";
import VideoPlayer from "@/components/VideoPlayer";
import HlsDebuggerConsole from "./HlsDebuggerConsole";
import PipelineStatusTracker from "./PipelineStatusTracker";
import VideoMetadata from "./VideoMetadata";
import CreatorBanner from "./CreatorBanner";

export default function VideoDetailLayout({ video }) {
  const [logs, setLogs] = useState([]);

  const handleHlsLog = (log) => {
    setLogs((prev) => [...prev, log].slice(-100)); // limit log history
  };

  const isReady = video.status === "COMPLETED" || video.status === "PROCESSED";
  const isFailed = video.status === "FAILED";

  const useProxy = process.env.NEXT_PUBLIC_USE_HLS_PROXY === "true";
  const videoSrc = useProxy
    ? `/api/hls/${video.id}/master.m3u8`
    : video.playbackUrl ||
      `${process.env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN}/${video.masterPlaylistKey || `hls/${video.id}/master.m3u8`}`;

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      {/* Left Column: Player, Pipeline, Metadata, Creator (Takes 2 columns) */}
      <div className="lg:col-span-2 space-y-6">
        {/* Player Container Box */}
        <div className="overflow-hidden bg-white border border-zinc-200 rounded-3xl shadow-sm p-4">
          {isReady ? (
            <div className="aspect-video bg-black rounded-2xl overflow-hidden border border-zinc-950 flex items-center justify-center">
              <VideoPlayer
                videoId={video.id}
                src={videoSrc}
                onHlsLog={handleHlsLog}
              />
            </div>
          ) : (
            <div className="aspect-video bg-zinc-50 border border-dashed border-zinc-200 rounded-2xl flex flex-col items-center justify-center p-8 text-center">
              {isFailed ? (
                <>
                  <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center border border-rose-100 shadow-sm mb-4">
                    <svg
                      className="w-6 h-6 text-rose-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  </div>
                  <h3 className="font-bold text-zinc-900 text-lg">
                    Transcoding Failed
                  </h3>
                  <p className="text-zinc-500 text-xs mt-1 max-w-sm">
                    The FFmpeg encoding job encountered a processing error.
                    Check transcoder cloud logs.
                  </p>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 bg-zinc-100 rounded-2xl flex items-center justify-center border border-zinc-200 shadow-sm mb-4 animate-pulse">
                    <div className="w-5 h-5 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  <h3 className="font-bold text-zinc-900 text-lg">
                    Transcoding Quality Segments...
                  </h3>
                  <p className="text-zinc-500 text-xs mt-1 max-w-sm">
                    Our SQS worker is active. Generating HLS variant playlists
                    (360p, 480p, 720p).
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Visual Pipeline Status Tracker */}
        <PipelineStatusTracker status={video.status} />

        {/* Video Metadata Panel */}
        <VideoMetadata video={video} />

        {/* Authorship Creator Banner */}
        <CreatorBanner />
      </div>

      {/* Right Column: HLS Terminal Debugger Console (Takes 1 column) */}
      <div className="lg:col-span-1">
        {isReady ? (
          <div className="space-y-6">
            <HlsDebuggerConsole logs={logs} />
          </div>
        ) : (
          <div className="bg-white border border-zinc-200 rounded-3xl p-6 text-center text-xs text-zinc-400 font-mono shadow-sm">
            HLS terminal console active upon transcoding completion.
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import React from "react";

export default function VideoMetadata({ video }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-extrabold text-zinc-900 tracking-tight leading-tight">
            {video.fileName}
          </h1>
          <div className="flex items-center gap-3 text-xs text-zinc-500 font-medium">
            <span>Video ID:</span>
            <span className="font-mono text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-md">
              {video.id}
            </span>
          </div>
        </div>

        {/* Action button: copy page link */}
        <button
          onClick={() => {
            const videoPageUrl = `${window.location.origin}/video/${video.id}`;
            navigator.clipboard.writeText(videoPageUrl);
            alert("Video link copied to clipboard!");
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-zinc-200 hover:border-zinc-400 bg-white hover:bg-zinc-50 text-xs font-bold text-zinc-900 rounded-xl shadow-sm transition-all"
        >
          <svg
            className="w-4 h-4 text-zinc-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
            />
          </svg>
          Copy Video Link
        </button>
      </div>

      <hr className="border-zinc-200" />

      {/* Technical Specifications details box */}
      <div className="p-6 bg-zinc-50 rounded-2xl border border-zinc-200/60 space-y-4">
        <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
          Technical Specifications
        </h3>

        <div className="grid gap-4 sm:grid-cols-2 text-sm">
          <div className="space-y-1">
            <p className="text-zinc-400 text-xs">Transcode Status</p>
            <p className="font-semibold text-zinc-900 uppercase tracking-wide">
              {video.status === "COMPLETED" || video.status === "PROCESSED"
                ? "Completed"
                : video.status}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-zinc-400 text-xs">Streaming Method</p>
            <p className="font-semibold text-zinc-900">
              HLS Adaptive Bitrate (360p, 480p, 720p)
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-zinc-400 text-xs">Origin storage</p>
            <p className="font-semibold text-zinc-900">
              AWS S3 (Processed Bucket)
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-zinc-400 text-xs">CDN Distribution</p>
            <p className="font-semibold text-zinc-900">
              AWS CloudFront (Signed Cookies)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

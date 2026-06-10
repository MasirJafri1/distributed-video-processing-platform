import React from "react";
import Link from "next/link";

export default function DashboardVideoCard({ video }) {
  const statusConfig = {
    PENDING: {
      label: "Pending",
      classes: "bg-amber-50 text-amber-700 border-amber-200",
    },
    UPLOADED: {
      label: "Processing",
      classes: "bg-zinc-100 text-zinc-700 border-zinc-200 animate-pulse",
    },
    PROCESSING: {
      label: "Processing",
      classes: "bg-zinc-100 text-zinc-700 border-zinc-200 animate-pulse",
    },
    COMPLETED: {
      label: "Ready",
      classes: "bg-zinc-900 text-white border-zinc-900",
    },
    PROCESSED: {
      label: "Ready",
      classes: "bg-zinc-900 text-white border-zinc-900",
    },
    FAILED: {
      label: "Failed",
      classes: "bg-rose-50 text-rose-700 border-rose-200",
    },
  };

  const currentStatus = statusConfig[video.status] || {
    label: video.status,
    classes: "bg-zinc-100 text-zinc-700 border-zinc-200",
  };

  const formattedDate = video.createdAt
    ? new Date(video.createdAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Unknown date";

  return (
    <Link href={`/video/${video.id}`} className="group block">
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-zinc-400 hover:shadow-md">
        {/* Thumbnail area */}
        <div className="relative aspect-video w-full bg-zinc-50 overflow-hidden border-b border-zinc-200">
          {video.thumbnailUrl ? (
            <img
              src={video.thumbnailUrl}
              alt={video.fileName}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-4">
              <svg
                className="w-8 h-8 text-zinc-400 group-hover:text-zinc-600 transition-colors duration-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </div>
          )}
        </div>

        {/* Info content */}
        <div className="p-5">
          <h3 className="font-bold text-zinc-900 text-base leading-snug tracking-tight truncate group-hover:text-black transition-colors">
            {video.fileName}
          </h3>
          <p className="text-[11px] font-mono text-zinc-400 mt-1 truncate">
            {video.id}
          </p>

          <div className="flex items-center justify-between mt-4">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${currentStatus.classes}`}
            >
              {currentStatus.label}
            </span>
            <span className="text-[11px] text-zinc-400">{formattedDate}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

import React from "react";
import Link from "next/link";

// Utility to format file size
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

export default function UploadQueue({ uploads }) {
  if (uploads.length === 0) return null;

  return (
    <div className="space-y-4">
      <style>{`
        @keyframes progress-slide {
          0% { left: -30%; }
          100% { left: 100%; }
        }
      `}</style>
      <h3 className="text-sm font-semibold text-zinc-500 tracking-tight">
        Active Ingestion Queue
      </h3>

      <div className="space-y-3">
        {uploads.map((up) => {
          const isDone = up.status === "Completed";
          const isTranscoding = up.status === "Transcoding";
          const isFailed = up.status === "Failed";

          return (
            <div
              key={up.id}
              className="p-5 bg-white rounded-2xl border border-zinc-200 shadow-sm space-y-3 transition-colors hover:border-zinc-300"
            >
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-0.5 min-w-0">
                  <h4 className="font-semibold text-zinc-900 truncate">
                    {up.fileName}
                  </h4>
                  <p className="text-xs text-zinc-500">
                    {formatBytes(up.size)}
                  </p>
                </div>

                {/* Status Indicator */}
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider border ${
                      isDone
                        ? "bg-zinc-900 text-white border-zinc-900"
                        : isTranscoding
                          ? "bg-zinc-100 text-zinc-700 border-zinc-200 animate-pulse"
                          : isFailed
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : "bg-zinc-50 text-zinc-600 border-zinc-200"
                    }`}
                  >
                    {up.status}
                  </span>

                  {isDone && up.videoId && (
                    <Link
                      href={`/video/${up.videoId}`}
                      className="text-xs font-bold text-black underline underline-offset-2 hover:text-zinc-700"
                    >
                      Watch →
                    </Link>
                  )}
                </div>
              </div>

              {/* Progress bar container */}
              {!isFailed && (
                <div className="space-y-1">
                  <div className="relative w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
                    {isTranscoding ? (
                      <div
                        className="absolute top-0 h-full bg-zinc-800 rounded-full"
                        style={{
                          width: "30%",
                          animation: "progress-slide 1.5s infinite linear",
                        }}
                      />
                    ) : (
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isDone ? "bg-zinc-950" : "bg-black"
                        }`}
                        style={{ width: `${up.progress}%` }}
                      />
                    )}
                  </div>

                  <div className="flex justify-between items-center text-xs text-zinc-400">
                    <span className="flex items-center gap-1.5">
                      {isTranscoding && (
                        <span className="w-3 h-3 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin"></span>
                      )}
                      {isTranscoding
                        ? "Transcoding HLS qualities (360p, 480p, 720p)..."
                        : isDone
                          ? "All done!"
                          : `Uploading to S3...`}
                    </span>
                    <span>
                      {isTranscoding
                        ? "Processing..."
                        : isDone
                          ? "100%"
                          : `${up.progress}%`}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

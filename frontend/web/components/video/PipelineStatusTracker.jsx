"use client";

import React from "react";

export default function PipelineStatusTracker({ status }) {
  const isUploaded = [
    "UPLOADED",
    "PROCESSING",
    "PROCESSED",
    "COMPLETED",
  ].includes(status);
  const isProcessing = ["PROCESSING"].includes(status) || status === "UPLOADED"; // UPLOADED means waiting for worker/processing
  const isCompleted = ["PROCESSED", "COMPLETED"].includes(status);
  const isFailed = status === "FAILED";

  const stages = [
    {
      id: "S3_INGEST",
      name: "S3 Raw Ingest",
      resource: "s3://raw-video-platform",
      description: "Direct upload via secure multipart presigned POST URL.",
      isFinished: isUploaded,
      isActive: false,
    },
    {
      id: "SQS_TRIGGER",
      name: "SQS Queue Event",
      resource: "sqs://transcode-jobs",
      description: "S3 Event notification fires message to trigger workers.",
      isFinished: isUploaded,
      isActive: false,
    },
    {
      id: "EC2_WORKER",
      name: "EC2 FFmpeg Worker",
      resource: "t3.medium / FFmpeg",
      description: "Transcoding raw MP4 to 360p, 480p, and 720p HLS playlists.",
      isFinished: isCompleted,
      isActive: isProcessing && !isFailed,
    },
    {
      id: "S3_OUTPUT",
      name: "S3 Segment Storage",
      resource: "s3://processed-video-platform",
      description: "HLS index playlists and TS segments saved, secured by OAC.",
      isFinished: isCompleted,
      isActive: false,
    },
    {
      id: "CDN_CACHE",
      name: "CloudFront CDN Cache",
      resource: "cloudfront://distribution",
      description: "Global edge node caching, authorized via Signed Cookies.",
      isFinished: isCompleted,
      isActive: false,
    },
  ];

  return (
    <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm space-y-6">
      <div>
        <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">
          AWS Distributed Pipeline Status
        </h3>
        <p className="text-xs text-zinc-500 mt-1">
          Detailed processing trail of this video across AWS infrastructure
          components.
        </p>
      </div>

      <div className="relative border-l border-zinc-200/80 ml-3.5 pl-6 space-y-6">
        {stages.map((stage, idx) => {
          let badgeColor = "bg-zinc-100 text-zinc-400 border-zinc-200";
          let lineDotColor = "bg-zinc-200 border-white";

          if (stage.isFinished) {
            badgeColor = "bg-emerald-50 text-emerald-600 border-emerald-200";
            lineDotColor =
              "bg-emerald-500 border-emerald-100 ring-4 ring-emerald-50";
          } else if (stage.isActive) {
            badgeColor =
              "bg-blue-50 text-blue-600 border-blue-200 animate-pulse";
            lineDotColor =
              "bg-blue-500 border-blue-100 ring-4 ring-blue-50 animate-ping";
          } else if (isFailed && idx === 2) {
            // Failed stage
            badgeColor = "bg-rose-50 text-rose-600 border-rose-200";
            lineDotColor = "bg-rose-500 border-rose-100 ring-4 ring-rose-50";
          }

          return (
            <div key={stage.id} className="relative group">
              {/* Connector Dot */}
              <span
                className={`absolute -left-[31px] top-1.5 w-3 h-3 rounded-full border-2 transition-all duration-300 ${lineDotColor}`}
              />

              <div className="space-y-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-zinc-950">
                      {stage.name}
                    </span>
                    <span
                      className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border transition-all ${badgeColor}`}
                    >
                      {stage.isFinished
                        ? "COMPLETED"
                        : stage.isActive
                          ? "ACTIVE"
                          : isFailed && idx === 2
                            ? "FAILED"
                            : "PENDING"}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400 bg-zinc-50 px-2 py-0.5 rounded border border-zinc-100">
                    {stage.resource}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 leading-relaxed max-w-xl">
                  {stage.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

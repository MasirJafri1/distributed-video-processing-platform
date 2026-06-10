import React from "react";

export default function ArchitecturePipeline() {
  const steps = [
    {
      num: "01",
      title: "S3 Ingestion",
      desc: "Client uploads source video directly to AWS S3 Raw Bucket using secure multipart pre-signed URLs.",
    },
    {
      num: "02",
      title: "SQS Notification",
      desc: "S3 upload triggers an event message to Amazon SQS queue for task distribution.",
    },
    {
      num: "03",
      title: "FFmpeg Transcoder",
      desc: "Distributed EC2 Worker processes task, segments video, and encodes multi-bitrate HLS streams (360p, 480p, 720p).",
    },
    {
      num: "04",
      title: "Processed S3 Cache",
      desc: "HLS playlists and extracted thumbnails are stored in output S3 bucket, fully isolated by OAC.",
    },
    {
      num: "05",
      title: "CDN Distribution",
      desc: "Amazon CloudFront CDN caches HLS segments, secured by signed cookies issued to authorised clients.",
    },
    {
      num: "06",
      title: "Real-time Playback",
      desc: "Secure HLS client fetches cookie authorization, streams adaptive playback, and receives live websocket status.",
    },
  ];

  return (
    <section className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-zinc-900 tracking-tight">
          Pipeline Architecture Flow
        </h2>
        <p className="text-sm text-zinc-500">
          How the real-time distributed video transcoding system works under the
          hood.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {steps.map((step, idx) => (
          <div
            key={idx}
            className="group relative p-6 bg-white border border-zinc-200 rounded-2xl shadow-sm transition-all duration-300 hover:border-zinc-400 hover:shadow-md"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-mono font-bold text-zinc-400">
                STAGE {step.num}
              </span>
              <div className="w-8 h-8 rounded-xl bg-zinc-50 flex items-center justify-center border border-zinc-100 group-hover:bg-black group-hover:text-white transition-colors duration-300">
                <svg
                  className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors duration-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              </div>
            </div>
            <h3 className="font-bold text-zinc-900 text-base">{step.title}</h3>
            <p className="text-zinc-500 text-xs mt-2 leading-relaxed">
              {step.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

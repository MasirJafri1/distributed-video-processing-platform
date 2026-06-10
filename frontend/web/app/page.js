"use client";

import React from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ArchitecturePipeline from "@/components/ArchitecturePipeline";

export default function Home() {
  const features = [
    {
      title: "Distributed Architecture",
      desc: "Uses distributed AWS components with auto-trigger SQS message queues to scale encoding tasks dynamically.",
    },
    {
      title: "HLS Secure Streaming",
      desc: "Delivers adaptive quality streams securely cached globally via CloudFront using dynamic cookie authorization.",
    },
    {
      title: "Adaptive Bitrate Encoding",
      desc: "Splits streams into 360p, 480p, and 720p variant resolutions using performance-tuned FFmpeg instances.",
    },
  ];

  return (
    <div className="flex flex-col min-h-screen font-sans bg-[#fafafa]">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-12 md:py-20 space-y-16">
        {/* Hero Banner Section */}
        <section className="text-center max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 border border-zinc-200 text-xs font-semibold text-zinc-900 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Production Ready Cloud Architecture
          </div>

          <h1 className="text-4xl md:text-6xl font-black text-zinc-900 tracking-tight leading-none">
            Scale Your Video Ingestion Effortlessly
          </h1>

          <p className="text-base md:text-lg text-zinc-500 max-w-2xl mx-auto leading-relaxed">
            An industry-grade, real-time distributed transcoding pipeline.
            Stream multi-resolution HLS media cached on global CDNs.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center w-full sm:w-auto px-6 py-3 bg-black hover:bg-zinc-800 text-white font-bold rounded-2xl shadow-sm transition-all"
            >
              Go to Dashboard
            </Link>
            <Link
              href="/upload"
              className="inline-flex items-center justify-center w-full sm:w-auto px-6 py-3 border border-zinc-200 hover:border-zinc-400 bg-white hover:bg-zinc-50 text-zinc-900 font-bold rounded-2xl shadow-sm transition-all"
            >
              Upload Video
            </Link>
          </div>
        </section>

        {/* Feature Highlights Grid */}
        <section className="grid gap-6 md:grid-cols-3">
          {features.map((feat, idx) => (
            <div
              key={idx}
              className="p-6 bg-white border border-zinc-200 rounded-2xl shadow-sm space-y-2"
            >
              <h3 className="font-bold text-zinc-900 text-base">
                {feat.title}
              </h3>
              <p className="text-zinc-500 text-xs leading-relaxed">
                {feat.desc}
              </p>
            </div>
          ))}
        </section>

        {/* Architecture Pipeline Showcase */}
        <ArchitecturePipeline />

        {/* System Architecture Diagram */}
        <section className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-zinc-900 tracking-tight">
              Cloud Infrastructure Diagram
            </h2>
            <p className="text-sm text-zinc-500">
              Visual map of S3 raw ingestion, SQS message queuing, distributed
              EC2 transcoder workers, and secure CloudFront CDN caching.
            </p>
          </div>
          <div className="p-4 bg-white border border-zinc-200 rounded-3xl shadow-sm flex items-center justify-center overflow-hidden">
            <img
              src="/video-processing-Page-1.webp"
              alt="Flux System Cloud Architecture Diagram"
              className="max-w-4xl w-full rounded-2xl border border-zinc-100 shadow-sm"
            />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

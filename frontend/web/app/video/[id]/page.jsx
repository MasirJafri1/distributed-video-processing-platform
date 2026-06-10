import React from "react";
import Link from "next/link";
import { getVideo } from "@/services/video.service";
import VideoDetailLayout from "@/components/video/VideoDetailLayout";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export async function generateMetadata({ params }) {
  const { id } = await params;
  try {
    const video = await getVideo(id);
    if (video && !video.error) {
      return {
        title: `${video.title || "Video Asset"} - Pipeline Details`,
        description: `Stream HLS segments, monitor AWS workflow status, and debug dynamic resolution levels for video "${video.title || "Video"}" (ID: ${id}).`,
      };
    }
  } catch (err) {
    console.error("Failed to generate metadata for video page:", err);
  }
  return {
    title: "Video Detail Console",
    description:
      "Real-time adaptive bitrate HLS video playback and pipeline log tracking.",
  };
}

export default async function VideoPage({ params }) {
  const { id } = await params;
  let video = null;

  try {
    video = await getVideo(id);
  } catch (err) {
    console.error("Failed to load video:", err);
  }

  if (!video || video.error) {
    return (
      <div className="flex flex-col min-h-screen font-sans bg-[#fafafa]">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center border border-rose-100 shadow-sm mb-4">
            <svg
              className="w-8 h-8 text-rose-600"
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
          <h1 className="text-xl font-bold text-zinc-900">
            Video Registry Entry Not Found
          </h1>
          <p className="text-sm text-zinc-500 mt-1 max-w-sm">
            The requested video asset ID could not be retrieved from the
            database registry.
          </p>
          <Link
            href="/dashboard"
            className="mt-6 inline-flex px-4 py-2 bg-black text-white hover:bg-zinc-800 text-xs font-bold rounded-xl shadow-sm transition-all"
          >
            Go to Console
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const isReady = video.status === "COMPLETED" || video.status === "PROCESSED";
  const isFailed = video.status === "FAILED";

  const useProxy = process.env.NEXT_PUBLIC_USE_HLS_PROXY === "true";
  const videoSrc = useProxy
    ? `/api/hls/${video.id}/master.m3u8`
    : video.playbackUrl ||
      `${process.env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN}/${video.masterPlaylistKey || `hls/${video.id}/master.m3u8`}`;

  return (
    <div className="flex flex-col min-h-screen font-sans bg-[#fafafa]">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        {/* Back Link */}
        <Link
          href="/dashboard"
          className="inline-flex items-center text-xs font-bold text-zinc-500 hover:text-black mb-6 transition-colors"
        >
          <svg
            className="w-3.5 h-3.5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back to Dashboard
        </Link>

        {/* Unified Interactive Layout Console Showcase */}
        <VideoDetailLayout video={video} />
      </main>

      <Footer />
    </div>
  );
}

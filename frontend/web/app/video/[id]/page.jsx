import React from "react";
import Link from "next/link";
import { getVideo } from "@/services/video.service";
import VideoPlayer from "@/components/VideoPlayer";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import VideoMetadata from "@/components/video/VideoMetadata";
import CreatorBanner from "@/components/video/CreatorBanner";
import UpNextSidebar from "@/components/video/UpNextSidebar";

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

        {/* 2-Column Grid Layout */}
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main stream left panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Player Container Box */}
            <div className="overflow-hidden bg-white border border-zinc-200 rounded-3xl shadow-sm p-4">
              {isReady ? (
                <div className="aspect-video bg-black rounded-2xl overflow-hidden border border-zinc-950 flex items-center justify-center">
                  <VideoPlayer videoId={video.id} src={videoSrc} />
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
                        Our SQS worker is active. Generating HLS variant
                        playlists (360p, 480p, 720p).
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Video Metadata Panel */}
            <VideoMetadata video={video} />

            {/* Authorship Banner */}
            <CreatorBanner />
          </div>

          {/* Playlist sidebar panel */}
          <div className="lg:col-span-1">
            <UpNextSidebar currentVideoId={video.id} />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

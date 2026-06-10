import React from "react";
import Link from "next/link";
import DashboardVideoCard from "./DashboardVideoCard";

export default function DashboardVideoGrid({
  videos,
  loading,
  searchQuery,
  setSearchQuery,
}) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-zinc-500 mt-4">Loading video registry...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search Input bar */}
      <div className="flex items-center gap-2 max-w-md bg-white border border-zinc-200 rounded-2xl px-4 py-2 shadow-sm focus-within:border-zinc-400 transition-colors">
        <svg
          className="w-4 h-4 text-zinc-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          placeholder="Search by file name..."
          className="flex-1 text-sm bg-transparent border-0 outline-none text-zinc-900 placeholder:text-zinc-400"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Grid of cards */}
      {videos.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center p-12 bg-white rounded-2xl border border-zinc-200 shadow-sm">
          <svg
            className="w-12 h-12 text-zinc-300"
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
          <h3 className="font-bold text-zinc-900 mt-4 text-lg">
            No videos matching registry query
          </h3>
          <p className="text-zinc-500 text-sm mt-1 max-w-sm">
            {searchQuery
              ? "Try adjusting your search filters to find what you are looking for."
              : "Start by uploading your first video to the transcoding pipeline."}
          </p>
          <Link
            href="/upload"
            className="mt-6 inline-flex px-4 py-2 bg-black text-white hover:bg-zinc-800 text-sm font-semibold rounded-xl shadow-sm transition-all"
          >
            Upload Video
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((video) => (
            <DashboardVideoCard key={video.id} video={video} />
          ))}
        </div>
      )}
    </div>
  );
}

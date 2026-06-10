"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/services/api";

export default function UpNextSidebar({ currentVideoId }) {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSidebarVideos = async () => {
      try {
        const res = await api.get("/videos");
        // Exclude current video and filter for ready (COMPLETED or PROCESSED) ones
        const filtered = res.data.filter(
          (v) =>
            v.id !== currentVideoId &&
            (v.status === "COMPLETED" || v.status === "PROCESSED"),
        );
        setVideos(filtered.slice(0, 5)); // show max 5 suggestions
      } catch (err) {
        console.error("Failed to load sidebar videos:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSidebarVideos();
  }, [currentVideoId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">
          Up Next
        </h3>
        <div className="flex justify-center py-6">
          <div className="w-5 h-5 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (videos.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">
        Up Next
      </h3>

      <div className="space-y-3">
        {videos.map((vid) => (
          <Link key={vid.id} href={`/video/${vid.id}`} className="group block">
            <div className="flex gap-3 bg-white border border-zinc-200 rounded-2xl p-3 shadow-sm hover:border-zinc-400 hover:shadow-md transition-all duration-300">
              <div className="relative w-24 aspect-video bg-zinc-50 rounded-xl overflow-hidden flex-shrink-0 border border-zinc-100">
                {vid.thumbnailUrl ? (
                  <img
                    src={vid.thumbnailUrl}
                    alt={vid.fileName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-zinc-100">
                    <svg
                      className="w-4 h-4 text-zinc-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <h4 className="text-sm font-bold text-zinc-900 truncate group-hover:text-black">
                  {vid.fileName}
                </h4>
                <p className="text-[10px] text-zinc-400 mt-1 uppercase font-semibold">
                  Ready to stream
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

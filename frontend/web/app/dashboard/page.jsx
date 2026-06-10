"use client";

import React from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import DashboardStats from "@/components/dashboard/DashboardStats";
import DashboardVideoGrid from "@/components/dashboard/DashboardVideoGrid";
import useDashboardVideos from "@/hooks/useDashboardVideos";

export default function DashboardPage() {
  const {
    loading,
    searchQuery,
    setSearchQuery,
    filteredVideos,
    completedCount,
    processingCount,
    failedCount,
  } = useDashboardVideos();

  return (
    <div className="flex flex-col min-h-screen font-sans bg-[#fafafa]">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-10 space-y-8">
        {/* Workspace Title bar */}
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 leading-tight">
            Video Workspace Console
          </h1>
          <p className="text-sm text-zinc-500">
            Monitor, play, and configure real-time transcoding job runs in your
            cloud registry.
          </p>
        </div>

        {/* Dashboard Stats Row */}
        <DashboardStats
          completed={completedCount}
          processing={processingCount}
          failed={failedCount}
        />

        {/* Search and Grid Area */}
        <DashboardVideoGrid
          videos={filteredVideos}
          loading={loading}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />
      </main>

      <Footer />
    </div>
  );
}

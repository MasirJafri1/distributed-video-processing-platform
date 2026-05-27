"use client";

import { useEffect, useState } from "react";

import api from "@/services/api";

import UploadBox from "./components/UploadBox";

import VideoCard from "./components/VideoCard";

export default function Home() {

  const [videos, setVideos] =
    useState([]);

  const fetchVideos = async () => {

    const response =
      await api.get("/videos");

    setVideos(response.data);
  };

  useEffect(() => {

    fetchVideos();

    const interval =
      setInterval(fetchVideos, 15000);

    return () =>
      clearInterval(interval);

  }, []);

  return (
    <main className="p-10">

      <h1 className="text-4xl font-bold mb-8">
        Distributed Video Platform
      </h1>

      <UploadBox
        onUploadComplete={
          fetchVideos
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">

        {videos.map((video) => (
          <VideoCard
            key={video.id}
            video={video}
          />
        ))}

      </div>
    </main>
  );
}
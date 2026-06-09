"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/services/api";

import UploadBox from "./components/UploadBox";

import VideoCard from "./components/VideoCard";

import {
  connectWebSocket,
  disconnectWebSocket
} from "@/services/websocket";

export default function Home() {

  const [videos, setVideos] =
    useState([]);

  const fetchVideos = async () => {

    const response =
      await api.get("/videos");

    setVideos(response.data);
  };

  useEffect(() => {
    connectWebSocket(() => {
      async () => {
        await fetchVideos();
      }
    });

    return () => {
      disconnectWebSocket();
    };
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
          <Link href={`/video/${video.id}`} key={video.id} className="block hover:scale-[1.01] hover:shadow-lg transition-all duration-200">
            <VideoCard
              video={video}
            />
          </Link>
        ))}

      </div>
    </main>
  );
}
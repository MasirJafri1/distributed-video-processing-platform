"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/services/api";

import UploadBox from "./components/UploadBox";
import VideoCard from "@/components/VideoCard";

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

      <div className="grid gap-6 mt-10" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
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
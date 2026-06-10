import { useEffect, useState } from "react";
import api from "@/services/api";
import { connectWebSocket, disconnectWebSocket } from "@/services/websocket";

export default function useDashboardVideos() {
  const [videos, setVideos] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchVideos = async () => {
    try {
      const response = await api.get("/videos");
      // Sorter: most recent first
      const sorted = response.data.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
      );
      setVideos(sorted);
    } catch (err) {
      console.error("Failed to fetch videos:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();

    // Hook up real-time websocket updates
    connectWebSocket((payload) => {
      console.log("WebSocket event in dashboard:", payload);
      // Automatically refresh video list to show updated status/thumbnails
      fetchVideos();
    });

    return () => {
      disconnectWebSocket();
    };
  }, []);

  const filteredVideos = videos.filter((video) =>
    video.fileName.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const completedCount = videos.filter(
    (v) => v.status === "COMPLETED" || v.status === "PROCESSED",
  ).length;

  const processingCount = videos.filter(
    (v) =>
      v.status === "PROCESSING" ||
      v.status === "UPLOADED" ||
      v.status === "PENDING",
  ).length;

  const failedCount = videos.filter((v) => v.status === "FAILED").length;

  return {
    videos,
    loading,
    searchQuery,
    setSearchQuery,
    filteredVideos,
    completedCount,
    processingCount,
    failedCount,
    fetchVideos,
  };
}

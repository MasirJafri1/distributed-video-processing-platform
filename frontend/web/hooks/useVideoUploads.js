import { useState, useEffect, useRef } from "react";
import api from "@/services/api";
import { connectWebSocket, disconnectWebSocket } from "@/services/websocket";

export default function useVideoUploads() {
  const [uploads, setUploads] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [toasts, setToasts] = useState([]);
  const xhrRefs = useRef({});

  useEffect(() => {
    // Connect WebSocket for transcode completions
    connectWebSocket((payload) => {
      console.log("WebSocket event in upload hook:", payload);
      if (payload.type === "VIDEO_COMPLETED" && payload.video) {
        // Update upload state status
        setUploads((prev) =>
          prev.map((up) =>
            up.videoId === payload.video.id
              ? { ...up, status: "Completed", progress: 100 }
              : up,
          ),
        );

        // Append a toast notification
        const newToast = {
          id: Math.random().toString(36).substring(7),
          message: `Video "${payload.video.fileName}" is processed and ready!`,
          videoId: payload.video.id,
        };
        setToasts((prev) => [newToast, ...prev]);

        // Auto remove toast after 6 seconds
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
        }, 6000);
      }
    });

    return () => {
      disconnectWebSocket();
      // Abort any pending XHR uploads on unmount
      Object.values(xhrRefs.current).forEach((xhr) => xhr.abort());
    };
  }, []);

  // Polling fallback for videos stuck in Transcoding state (e.g. if WebSockets are slow/disconnected)
  useEffect(() => {
    const transcodingVideos = uploads.filter(
      (up) => up.status === "Transcoding" && up.videoId,
    );
    if (transcodingVideos.length === 0) return;

    const interval = setInterval(async () => {
      for (const up of transcodingVideos) {
        try {
          const res = await api.get(`/videos/${up.videoId}`);
          const status = res.data.status;

          if (status === "COMPLETED" || status === "PROCESSED") {
            setUploads((prev) =>
              prev.map((item) =>
                item.videoId === up.videoId
                  ? { ...item, status: "Completed", progress: 100 }
                  : item,
              ),
            );

            // Append completion toast
            const toastId = Math.random().toString(36).substring(7);
            setToasts((prev) => [
              {
                id: toastId,
                message: `Video "${up.fileName}" is processed and ready!`,
                videoId: up.videoId,
              },
              ...prev,
            ]);

            setTimeout(() => {
              setToasts((prev) => prev.filter((t) => t.id !== toastId));
            }, 6000);
          } else if (status === "FAILED") {
            setUploads((prev) =>
              prev.map((item) =>
                item.videoId === up.videoId
                  ? { ...item, status: "Failed" }
                  : item,
              ),
            );
          }
        } catch (err) {
          console.error(`Failed to poll status for video ${up.videoId}:`, err);
        }
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [uploads]);

  const handleFiles = (filesList) => {
    const filesArray = Array.from(filesList);
    filesArray.forEach((file) => {
      if (!file.type.startsWith("video/")) {
        alert(`File "${file.name}" is not a valid video file.`);
        return;
      }

      const uploadId = Math.random().toString(36).substring(7);
      const newUpload = {
        id: uploadId,
        fileName: file.name,
        size: file.size,
        progress: 0,
        status: "Preparing",
        videoId: null,
      };

      setUploads((prev) => [newUpload, ...prev]);
      uploadSingleFile(uploadId, file);
    });
  };

  const uploadSingleFile = async (uploadId, file) => {
    try {
      // 1. Fetch presigned S3 upload POST configurations
      const response = await api.post("/upload/presigned-url", {
        fileName: file.name,
        contentType: file.type,
      });

      const { uploadUrl, fields, videoId } = response.data;

      // Update upload status to Uploading and attach videoId
      setUploads((prev) =>
        prev.map((up) =>
          up.id === uploadId ? { ...up, status: "Uploading", videoId } : up,
        ),
      );

      // 2. Prepare multipart POST formData
      const formData = new FormData();
      Object.entries(fields).forEach(([key, val]) => {
        formData.append(key, val);
      });
      formData.append("file", file);

      // 3. Fire XHR to track upload progress accurately
      const xhr = new XMLHttpRequest();
      xhrRefs.current[uploadId] = xhr;

      xhr.open("POST", uploadUrl, true);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          setUploads((prev) =>
            prev.map((up) =>
              up.id === uploadId ? { ...up, progress: percent } : up,
            ),
          );
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          // Upload to S3 finished, now waiting for pipeline transcoding
          setUploads((prev) =>
            prev.map((up) =>
              up.id === uploadId
                ? { ...up, status: "Transcoding", progress: 100 }
                : up,
            ),
          );
        } else {
          setUploads((prev) =>
            prev.map((up) =>
              up.id === uploadId ? { ...up, status: "Failed" } : up,
            ),
          );
        }
        delete xhrRefs.current[uploadId];
      };

      xhr.onerror = () => {
        setUploads((prev) =>
          prev.map((up) =>
            up.id === uploadId ? { ...up, status: "Failed" } : up,
          ),
        );
        delete xhrRefs.current[uploadId];
      };

      xhr.send(formData);
    } catch (err) {
      console.error("Presigned URL or upload failure:", err);
      setUploads((prev) =>
        prev.map((up) =>
          up.id === uploadId ? { ...up, status: "Failed" } : up,
        ),
      );
    }
  };

  return {
    uploads,
    isDragOver,
    setIsDragOver,
    toasts,
    setToasts,
    handleFiles,
  };
}

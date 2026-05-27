"use client";

import { useState } from "react";

import api from "@/services/api";

export default function UploadBox({
  onUploadComplete
}) {

  const [uploading, setUploading] =
    useState(false);

  const handleUpload = async (e) => {

    const file = e.target.files[0];

    if (!file) return;

    try {
      setUploading(true);

      const response =
        await api.post(
          "/upload/presigned-url",
          {
            fileName: file.name,
            contentType: file.type
          }
        );

      const {
        uploadUrl,
        videoId,
        key
      } = response.data;

      await fetch(uploadUrl, {
        method: "PUT",

        headers: {
          "Content-Type": file.type
        },

        body: file
      });

      await fetch(
        `https://sqs.ap-south-1.amazonaws.com/YOUR_ACCOUNT_ID/video-platform-dev-video-processing`,
        {
          method: "POST"
        }
      );

      onUploadComplete();

      alert("Upload successful");

    } catch (error) {
      console.error(error);

      alert("Upload failed");

    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="border rounded-xl p-8">

      <input
        type="file"
        accept="video/*"
        onChange={handleUpload}
      />

      {uploading && (
        <p className="mt-4">
          Uploading...
        </p>
      )}
    </div>
  );
}
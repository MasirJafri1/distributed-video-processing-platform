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
        fields,
        videoId,
        key
      } = response.data;

      const formData = new FormData();
      Object.entries(fields).forEach(([k, v]) => {
        formData.append(k, v);
      });
      formData.append("file", file);

      const res = await fetch(uploadUrl, {
        method: "POST",
        body: formData
      });

      if (!res.ok) {
        throw new Error("S3 upload failed");
      }

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
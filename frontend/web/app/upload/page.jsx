"use client";

import React from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import DragDropZone from "@/components/upload/DragDropZone";
import UploadQueue from "@/components/upload/UploadQueue";
import UploadToastContainer from "@/components/upload/UploadToastContainer";
import useVideoUploads from "@/hooks/useVideoUploads";

export default function UploadPage() {
  const { uploads, isDragOver, setIsDragOver, toasts, setToasts, handleFiles } =
    useVideoUploads();

  return (
    <div className="flex flex-col min-h-screen font-sans bg-[#fafafa]">
      <Header />

      <main className="flex-1 max-w-3xl w-full mx-auto px-6 py-10 space-y-8">
        {/* Upload Title bar */}
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 leading-tight">
            Video Asset Ingestion
          </h1>
          <p className="text-sm text-zinc-500">
            Upload files directly to Amazon S3 Raw Bucket to automatically
            trigger FFmpeg HLS encoding.
          </p>
        </div>

        {/* Drag and Drop Box */}
        <DragDropZone
          onFilesSelected={handleFiles}
          isDragOver={isDragOver}
          setIsDragOver={setIsDragOver}
        />

        {/* Active Upload Registry Queue List */}
        <UploadQueue uploads={uploads} />

        {/* Floating Completed Transcode Toasts */}
        <UploadToastContainer toasts={toasts} setToasts={setToasts} />
      </main>

      <Footer />
    </div>
  );
}

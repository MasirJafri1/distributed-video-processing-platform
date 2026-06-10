import React from "react";

export const metadata = {
  title: "Upload Asset Ingestion",
  description:
    "Ingest new raw video assets directly to S3 and trigger distributed transcoding pipeline workers automatically.",
};

export default function UploadLayout({ children }) {
  return <>{children}</>;
}

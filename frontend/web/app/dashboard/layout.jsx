import React from "react";

export const metadata = {
  title: "Video Registry Console",
  description:
    "Monitor cloud registry videos, query transcode jobs, view real-time HLS segment logs, and review transcode status metrics.",
};

export default function DashboardLayout({ children }) {
  return <>{children}</>;
}

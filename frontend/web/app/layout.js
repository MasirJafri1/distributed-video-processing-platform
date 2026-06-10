import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: {
    template: "%s | Flux Video Platform",
    default: "Flux - Distributed Cloud Video Transcoding & Streaming",
  },
  description:
    "An industry-grade, real-time distributed video transcoding pipeline leveraging AWS SQS, S3, EC2 workers with FFmpeg, and global CloudFront CDN caching.",
  keywords: [
    "AWS",
    "S3",
    "SQS",
    "EC2",
    "FFmpeg",
    "HLS Streaming",
    "Adaptive Bitrate",
    "CloudFront CDN",
    "Video Processing",
    "Next.js",
  ],
  authors: [{ name: "Masir Jafri", url: "https://masirjafri.in" }],
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

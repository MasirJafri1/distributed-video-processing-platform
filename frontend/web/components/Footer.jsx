import React from "react";

export default function Footer() {
  return (
    <footer className="w-full bg-white border-t border-zinc-200 py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
        <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4">
          <span className="font-semibold text-zinc-900">Flux</span>
          <span className="hidden md:inline text-zinc-300">|</span>
          <span>
            Distributed Video Transcoding (S3, SQS, EC2, CloudFront, FFmpeg)
          </span>
        </div>

        <div className="flex items-center gap-4">
          <span>
            Made by{" "}
            <a
              href="https://masirjafri.in"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-zinc-900 hover:underline"
            >
              Masir Jafri
            </a>
          </span>
          <span className="text-zinc-300">|</span>
          <div className="flex items-center gap-3">
            <a
              href="https://github.com/MasirJafri1"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-black transition-colors"
            >
              GitHub
            </a>
            <a
              href="https://linkedin.com/in/masirjafri"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-black transition-colors"
            >
              LinkedIn
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

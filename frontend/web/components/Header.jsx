import React from "react";
import Link from "next/link";

export default function Header() {
  return (
    <header className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-zinc-200">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          {/* Logo brand */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-black rounded-xl flex items-center justify-center text-white font-black text-sm tracking-tighter">
              FL
            </div>
            <span className="font-extrabold text-zinc-900 text-lg tracking-tight group-hover:text-black transition-colors">
              Flux
            </span>
          </Link>

          {/* Navigation links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-zinc-500">
            <Link
              href="/dashboard"
              className="hover:text-black transition-colors"
            >
              Dashboard
            </Link>
            <Link href="/upload" className="hover:text-black transition-colors">
              Ingestion
            </Link>
            <a
              href="https://github.com/MasirJafri1/distributed-video-processing-platform"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-black transition-colors"
            >
              Pipeline Architecture
            </a>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/upload"
            className="inline-flex items-center justify-center px-4 py-2 bg-black hover:bg-zinc-800 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
          >
            Upload Video
          </Link>
        </div>
      </div>
    </header>
  );
}

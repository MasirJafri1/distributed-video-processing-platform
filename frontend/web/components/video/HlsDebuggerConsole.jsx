"use client";

import React, { useEffect, useRef } from "react";

export default function HlsDebuggerConsole({ logs }) {
  const terminalEndRef = useRef(null);

  useEffect(() => {
    // Auto scroll to bottom of terminal when logs update
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const getLogStyle = (type) => {
    switch (type) {
      case "MANIFEST":
        return "text-indigo-400 font-bold";
      case "QUALITY":
        return "text-amber-400 font-bold";
      case "SEGMENT":
        return "text-emerald-400";
      case "ERROR":
        return "text-rose-400 font-bold";
      case "NATIVE":
        return "text-cyan-400";
      default:
        return "text-zinc-300";
    }
  };

  return (
    <div className="bg-zinc-950 rounded-2xl border border-zinc-800 overflow-hidden shadow-lg flex flex-col h-[420px]">
      {/* Console Header */}
      <div className="bg-zinc-900 px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Pulsing indicator */}
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-bold text-zinc-300 font-mono tracking-tight">
            HLS Real-Time Pipeline Inspector
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded text-zinc-400 font-mono">
            Origin: S3/CloudFront
          </span>
        </div>
      </div>

      {/* Terminal Screen */}
      <div className="flex-1 p-4 overflow-y-auto font-mono text-[11px] space-y-2.5 scrollbar-thin scrollbar-thumb-zinc-800">
        {logs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-zinc-500 text-center flex-col gap-2 py-8">
            <svg
              className="w-5 h-5 animate-pulse text-zinc-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            <p>Initializing HLS decoder logs...</p>
            <p className="text-[10px] text-zinc-600 max-w-xs leading-normal">
              Start playing the video to capture live adaptive segment requests
              from S3 CDN.
            </p>
          </div>
        ) : (
          logs.map((log, index) => (
            <div
              key={index}
              className="flex items-start gap-2 leading-relaxed border-b border-zinc-900/50 pb-1.5"
            >
              <span className="text-zinc-600 select-none">
                [{log.timestamp}]
              </span>
              <span
                className={`${getLogStyle(log.type)} flex-1 whitespace-pre-wrap`}
              >
                {log.text}
              </span>
            </div>
          ))
        )}
        <div ref={terminalEndRef} />
      </div>

      {/* Terminal Status bar */}
      <div className="bg-zinc-900/40 px-4 py-2 border-t border-zinc-800/60 flex items-center justify-between text-[10px] text-zinc-500 font-mono">
        <div>Adaptive Bitrate (ABR): Active</div>
        <div>
          Chunks fetched: {logs.filter((l) => l.type === "SEGMENT").length}
        </div>
      </div>
    </div>
  );
}

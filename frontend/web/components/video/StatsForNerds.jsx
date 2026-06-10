"use client";

import React, { useState, useEffect } from "react";

export default function StatsForNerds({ stats }) {
  const [history, setHistory] = useState([]);

  // Keep track of the last 15 ticks of buffer health to draw the sparkline
  useEffect(() => {
    if (stats && stats.bufferHealth !== undefined) {
      setHistory((prev) => {
        const next = [...prev, stats.bufferHealth];
        return next.slice(-15);
      });
    }
  }, [stats]);

  if (!stats) return null;

  // Assume standard raw video file ingest at 12 Mbps
  const rawBitrateBps = 12 * 1024 * 1024;
  const rawSizeInBytes = ((stats.duration || 0) * rawBitrateBps) / 8;
  const hlsBytes = stats.hlsBytesDownloaded || 0;

  let savedBytes = 0;
  let percentSaved = 0;
  let rawSizeMB = "0.0";
  let savingsMB = "0.0";

  if (rawSizeInBytes > 0) {
    savedBytes = Math.max(0, rawSizeInBytes - hlsBytes);
    rawSizeMB = (rawSizeInBytes / (1024 * 1024)).toFixed(1);
    savingsMB = (savedBytes / (1024 * 1024)).toFixed(1);
    percentSaved = Math.round((savedBytes / rawSizeInBytes) * 100);
  }

  const hlsMB = (hlsBytes / (1024 * 1024)).toFixed(1);
  const resolution = stats.resolution || "Auto";
  const bitrate = stats.bitrate
    ? `${(stats.bitrate / 1000).toFixed(0)} kbps`
    : "0 kbps";
  const bufferHealth =
    stats.bufferHealth !== undefined ? `${stats.bufferHealth}s` : "0.0s";

  // Sparkline dimensions
  const svgWidth = 140;
  const svgHeight = 28;

  const renderSparkline = () => {
    if (history.length < 2) {
      return (
        <span className="text-[10px] text-zinc-400 font-mono italic">
          Gathering points...
        </span>
      );
    }

    const maxVal = Math.max(...history, 5); // default min height is 5s
    const minVal = 0;
    const points = history.map((val, idx) => {
      const x = (idx / (history.length - 1)) * svgWidth;
      const y = svgHeight - ((val - minVal) / (maxVal - minVal)) * svgHeight;
      return `${x},${y}`;
    });

    const pathData = `M ${points.join(" L ")}`;
    const lastX = svgWidth;
    const lastY =
      svgHeight -
      ((history[history.length - 1] - minVal) / (maxVal - minVal)) * svgHeight;

    return (
      <div className="flex items-center gap-3">
        <svg
          width={svgWidth}
          height={svgHeight}
          className="overflow-visible"
          id="nerd-stats-sparkline-svg"
        >
          {/* Subtle area fill under the sparkline */}
          <path
            d={`${pathData} L ${lastX},${svgHeight} L 0,${svgHeight} Z`}
            fill="url(#sparkline-gradient)"
            opacity="0.1"
          />
          {/* Sparkline path */}
          <path
            d={pathData}
            fill="none"
            stroke="#10b981" // emerald-500
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Pulsing endpoint */}
          <circle cx={lastX} cy={lastY} r="3" fill="#10b981" />
          <circle
            cx={lastX}
            cy={lastY}
            r="6"
            fill="#10b981"
            className="animate-ping"
            opacity="0.3"
          />
          <defs>
            <linearGradient id="sparkline-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    );
  };

  return (
    <div
      id="stats-for-nerds-panel"
      className="bg-zinc-950 border border-zinc-800 text-zinc-400 p-5 rounded-2xl font-mono text-[10px] space-y-4 shadow-lg animate-fadeIn relative overflow-hidden"
    >
      {/* Decorative backdrop mesh grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293708_1px,transparent_1px),linear-gradient(to_bottom,#1f293708_1px,transparent_1px)] bg-[size:14px_14px] pointer-events-none" />

      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2 relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="font-bold text-zinc-200 tracking-tight">
            STREAM PLAYBACK TELEMETRY
          </span>
        </div>
        <span className="text-[9px] text-zinc-600">v1.2.0 (Active)</span>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2 relative z-10">
        <div className="flex justify-between items-center py-1 border-b border-zinc-900/50">
          <span className="text-zinc-500">Video Quality:</span>
          <span className="text-zinc-200 font-bold">{resolution}</span>
        </div>

        <div className="flex justify-between items-center py-1 border-b border-zinc-900/50">
          <span className="text-zinc-500">Current Bitrate:</span>
          <span className="text-zinc-200 font-bold">{bitrate}</span>
        </div>

        <div className="flex justify-between items-center py-1 border-b border-zinc-900/50">
          <span className="text-zinc-500">Buffer Health:</span>
          <div className="flex items-center gap-2 font-bold text-zinc-200">
            <span>{bufferHealth}</span>
            <div className="w-1.5 h-6 bg-zinc-900 flex items-end rounded overflow-hidden">
              <div
                className="w-full bg-emerald-500 transition-all duration-300"
                style={{
                  height: `${Math.min(100, (Number(stats.bufferHealth) / 30) * 100)}%`,
                }}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center py-1 border-b border-zinc-900/50">
          <span className="text-zinc-500">Buffer Trend:</span>
          <div className="h-7 flex items-center">{renderSparkline()}</div>
        </div>

        <div className="flex justify-between items-center py-1 border-b border-zinc-900/50 sm:col-span-2">
          <span className="text-zinc-500">Bandwidth Ingest Summary:</span>
          <div className="flex flex-col items-end gap-0.5 text-right">
            <span className="text-zinc-200 font-bold">
              HLS: {hlsMB} MB / Raw: {rawSizeMB} MB
            </span>
            <span className="text-emerald-400 font-bold text-[9px]">
              Egress Savings: {savingsMB} MB ({percentSaved}% saved)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

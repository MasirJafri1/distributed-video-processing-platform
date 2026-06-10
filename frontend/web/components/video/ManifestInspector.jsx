"use client";

import React, { useState, useEffect } from "react";

export default function ManifestInspector({ videoSrc, video }) {
  const [tree, setTree] = useState({
    folders: {}, // "360p": { files: [], loading: false, loaded: false }
    masterLoaded: false,
    masterContent: "",
    error: null,
  });
  const [selectedFile, setSelectedFile] = useState("master.m3u8");
  const [expandedFolders, setExpandedFolders] = useState({});
  const [fileContents, setFileContents] = useState({}); // path -> text content
  const [loadingFile, setLoadingFile] = useState(null); // current path loading content
  const [isSimulated, setIsSimulated] = useState(false);
  const [copied, setCopied] = useState(false);

  // Compute base S3 folder prefix
  const videoId = video?.id || "video-id";
  const s3Prefix = `s3://processed-bucket/hls/${videoId}/`;

  // Determine base URL directory
  const getBaseDir = () => {
    if (!videoSrc) return "";
    const parts = videoSrc.split("/");
    parts.pop();
    return parts.join("/");
  };

  const videoSrcDir = getBaseDir();

  // Escapes HTML for safe rendering inside syntax highlighting
  const escapeHtml = (unsafe) => {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  // Pre-load master playlist
  useEffect(() => {
    if (!videoSrc) return;

    const loadMasterPlaylist = async () => {
      try {
        const isProxy = videoSrc.startsWith("/api/hls");
        const options = isProxy ? {} : { credentials: "include" };
        const res = await fetch(videoSrc, options);

        if (!res.ok) {
          throw new Error(`Master fetch failed with status: ${res.status}`);
        }

        const text = await res.text();

        // Parse variant folders from master playlist
        const lines = text.split("\n");
        const parsedFolders = [];
        lines.forEach((line) => {
          const cleanLine = line.trim();
          if (
            cleanLine &&
            !cleanLine.startsWith("#") &&
            cleanLine.endsWith(".m3u8")
          ) {
            const folderName = cleanLine.split("/")[0];
            if (folderName && !parsedFolders.includes(folderName)) {
              parsedFolders.push(folderName);
            }
          }
        });

        const initialFolders = {};
        const foldersList =
          parsedFolders.length > 0 ? parsedFolders : ["360p", "480p", "720p"];
        foldersList.forEach((f) => {
          initialFolders[f] = { files: [], loading: false, loaded: false };
        });

        setTree({
          folders: initialFolders,
          masterLoaded: true,
          masterContent: text,
          error: null,
        });

        setFileContents((prev) => ({
          ...prev,
          "master.m3u8": text,
        }));
      } catch (err) {
        console.warn(
          "Direct fetch failed, initializing simulation fallback:",
          err,
        );
        initializeSimulation();
      }
    };

    loadMasterPlaylist();
  }, [videoSrc]);

  // Setup Simulated contents in case of CORS/Offline environment
  const initializeSimulation = () => {
    setIsSimulated(true);

    const simulatedMaster = `#EXTM3U

#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=640x360
360p/index.m3u8

#EXT-X-STREAM-INF:BANDWIDTH=1400000,RESOLUTION=854x480
480p/index.m3u8

#EXT-X-STREAM-INF:BANDWIDTH=2800000,RESOLUTION=1280x720
720p/index.m3u8
`;

    setTree({
      folders: {
        "360p": { files: [], loading: false, loaded: false },
        "480p": { files: [], loading: false, loaded: false },
        "720p": { files: [], loading: false, loaded: false },
      },
      masterLoaded: true,
      masterContent: simulatedMaster,
      error: null,
    });

    setFileContents({
      "master.m3u8": simulatedMaster,
    });
  };

  // Copy code utility
  const handleCopy = () => {
    const textToCopy = fileContents[selectedFile] || "";
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Expand folder and lazy-load variant playlist contents
  const toggleFolder = async (folderName) => {
    const isExpanded = !!expandedFolders[folderName];
    setExpandedFolders((prev) => ({
      ...prev,
      [folderName]: !isExpanded,
    }));

    // If expanding and not loaded yet, fetch contents
    if (!isExpanded && !tree.folders[folderName]?.loaded) {
      setTree((prev) => ({
        ...prev,
        folders: {
          ...prev.folders,
          [folderName]: { ...prev.folders[folderName], loading: true },
        },
      }));

      try {
        let textContent = "";
        let segmentFiles = [];

        if (isSimulated) {
          // Simulated content fallback
          await new Promise((resolve) => setTimeout(resolve, 300));
          const numSegments =
            folderName === "360p" ? 7 : folderName === "480p" ? 7 : 7;

          segmentFiles = Array.from({ length: numSegments }, (_, i) => {
            const numStr = String(i).padStart(3, "0");
            return `segment_${numStr}.ts`;
          });

          const segmentLines = segmentFiles
            .map((seg) => `#EXTINF:6.000000,\n${seg}`)
            .join("\n");

          textContent = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:6
#EXT-X-MEDIA-SEQUENCE:0
#EXT-X-PLAYLIST-TYPE:VOD
${segmentLines}
#EXT-X-ENDLIST`;
        } else {
          // Fetch real index.m3u8 from CDN/Proxy
          const variantUrl = `${videoSrcDir}/${folderName}/index.m3u8`;
          const isProxy = variantUrl.startsWith("/api/hls");
          const options = isProxy ? {} : { credentials: "include" };

          const res = await fetch(variantUrl, options);
          if (!res.ok) throw new Error(`Failed to load ${folderName} playlist`);

          textContent = await res.text();

          // Parse segment ts files
          const lines = textContent.split("\n");
          lines.forEach((line) => {
            const clean = line.trim();
            if (clean && !clean.startsWith("#")) {
              segmentFiles.push(clean);
            }
          });
        }

        const allFolderFiles = ["index.m3u8", ...segmentFiles];

        setTree((prev) => ({
          ...prev,
          folders: {
            ...prev.folders,
            [folderName]: {
              files: allFolderFiles,
              loading: false,
              loaded: true,
            },
          },
        }));

        setFileContents((prev) => ({
          ...prev,
          [`${folderName}/index.m3u8`]: textContent,
        }));
      } catch (err) {
        console.error(`Error loading folder ${folderName}:`, err);
        // Fallback to empty files lists on error
        setTree((prev) => ({
          ...prev,
          folders: {
            ...prev.folders,
            [folderName]: {
              files: ["index.m3u8"],
              loading: false,
              loaded: true,
            },
          },
        }));
      }
    }
  };

  // Select file to inspect
  const selectFile = async (filePath) => {
    setSelectedFile(filePath);

    // If file is segment (.ts), we don't load content but show binary info
    if (filePath.endsWith(".ts")) {
      return;
    }

    // If content already cached, skip fetching
    if (fileContents[filePath]) {
      return;
    }

    setLoadingFile(filePath);

    try {
      if (isSimulated) {
        // Safe check
        setLoadingFile(null);
        return;
      }

      const fileUrl = `${videoSrcDir}/${filePath}`;
      const isProxy = fileUrl.startsWith("/api/hls");
      const options = isProxy ? {} : { credentials: "include" };

      const res = await fetch(fileUrl, options);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();

      setFileContents((prev) => ({
        ...prev,
        [filePath]: text,
      }));
    } catch (err) {
      console.error(`Error loading file content ${filePath}:`, err);
    } finally {
      setLoadingFile(null);
    }
  };

  // Custom regular expression syntax highlighting for .m3u8 files
  const highlightM3U8 = (text) => {
    if (!text) return null;
    const lines = text.split("\n");
    return lines.map((line, idx) => {
      let content = escapeHtml(line);
      let className = "text-zinc-400"; // Default

      if (line.startsWith("#EXTM3U")) {
        className = "text-sky-400 font-bold";
      } else if (line.startsWith("#EXT-X-STREAM-INF")) {
        className = "text-indigo-400 font-semibold";
        const parts = content.split(":");
        if (parts.length > 1) {
          const tag = parts[0];
          const params = parts.slice(1).join(":");
          // Highlight key-value pairs (e.g. BANDWIDTH=2800000)
          const highlightedParams = params.replace(
            /([A-Z0-9\-]+)=([^,\n]+)/g,
            '<span class="text-amber-300">$1</span>=<span class="text-emerald-400">$2</span>',
          );
          content = `${tag}:${highlightedParams}`;
        }
      } else if (line.startsWith("#EXT")) {
        className = "text-purple-400";
        const parts = content.split(":");
        if (parts.length > 1) {
          const tag = parts[0];
          const val = parts.slice(1).join(":");
          content = `${tag}:<span class="text-zinc-200">${val}</span>`;
        }
      } else if (line.trim() && !line.startsWith("#")) {
        className = "text-teal-300 font-medium";
      }

      return (
        <div
          key={idx}
          className="font-mono text-[11px] leading-5 min-h-[20px] flex"
        >
          <span className="inline-block w-8 text-right pr-3 mr-3 text-zinc-700 select-none border-r border-zinc-800 shrink-0">
            {idx + 1}
          </span>
          <span
            className={`${className} whitespace-pre-wrap break-all`}
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </div>
      );
    });
  };

  // Describe the selected file and its function in the ABR system
  const getFileBadgeInfo = () => {
    if (selectedFile === "master.m3u8") {
      return {
        title: "Master Playlist",
        desc: "Initial manifest defining stream resolutions & target bitrates for adaptive playback.",
        type: "application/x-mpegURL",
      };
    }
    if (selectedFile.endsWith("index.m3u8")) {
      const res = selectedFile.split("/")[0] || "Variant";
      return {
        title: `${res} Media Playlist`,
        desc: "Lists the discrete 6-second video chunks (.ts) in sequential order for playback.",
        type: "application/x-mpegURL",
      };
    }
    if (selectedFile.endsWith(".ts")) {
      return {
        title: "MPEG-TS Segment",
        desc: "A raw binary stream file containing H.264 video frames and AAC audio encoded by FFmpeg.",
        type: "video/MP2T",
      };
    }
    return {
      title: "Raw File",
      desc: "S3 Object storage binary output.",
      type: "binary",
    };
  };

  const badgeInfo = getFileBadgeInfo();

  return (
    <div
      id="s3-manifest-inspector-panel"
      className="bg-zinc-950 border border-zinc-800 rounded-2xl shadow-xl overflow-hidden flex flex-col animate-fadeIn relative"
    >
      {/* Mesh grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293708_1px,transparent_1px),linear-gradient(to_bottom,#1f293708_1px,transparent_1px)] bg-[size:14px_14px] pointer-events-none" />

      {/* Top Header Panel */}
      <div className="bg-zinc-900 border-b border-zinc-800 px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
        <div className="flex items-center gap-2.5">
          {/* AWS S3 Logo Color representation */}
          <div className="w-5 h-5 bg-amber-500 rounded flex items-center justify-center shadow-inner text-[10px] text-zinc-950 font-black">
            S3
          </div>
          <div>
            <span className="font-bold text-zinc-200 text-xs tracking-tight uppercase block font-mono">
              S3 Direct File Inspector
            </span>
            <span className="text-[10px] text-zinc-500 font-mono select-all">
              {s3Prefix}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isSimulated && (
            <span className="text-[9px] bg-amber-500/10 border border-amber-500/30 text-amber-400 px-2 py-0.5 rounded font-mono">
              Simulator Active
            </span>
          )}
          <span className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded text-zinc-400 font-mono border border-zinc-700/50">
            Bucket: processed-bucket
          </span>
        </div>
      </div>

      {/* Main Grid View */}
      <div className="grid md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-zinc-800 min-h-[460px] relative z-10">
        {/* Left Side: Folder Tree Explorer */}
        <div className="md:col-span-2 p-5 bg-zinc-950 overflow-y-auto max-h-[500px]">
          <div className="text-[10px] font-bold text-zinc-500 font-mono tracking-wider uppercase mb-3.5">
            S3 Object Directory
          </div>

          <div className="space-y-1.5 font-mono text-xs">
            {/* Root folder container */}
            <div className="flex items-center gap-1.5 text-zinc-400 font-medium py-1 px-1.5 rounded bg-zinc-900/50 border border-zinc-800/40">
              <svg
                className="w-4 h-4 text-amber-500 shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
              </svg>
              <span className="truncate select-none">{videoId}</span>
            </div>

            {/* Tree Items */}
            <div className="pl-4 border-l border-zinc-800/80 ml-3.5 space-y-1.5 py-1">
              {/* master.m3u8 file item */}
              <button
                onClick={() => selectFile("master.m3u8")}
                className={`w-full flex items-center justify-between py-1 px-2.5 rounded-lg border text-left cursor-pointer transition-all hover:bg-zinc-900/60 ${
                  selectedFile === "master.m3u8"
                    ? "bg-zinc-900 border-zinc-700 text-zinc-100"
                    : "border-transparent text-zinc-400"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <svg
                    className="w-3.5 h-3.5 text-sky-400 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <span className="truncate">master.m3u8</span>
                </div>
                <span className="text-[9px] text-zinc-600 bg-zinc-900/40 px-1 rounded shrink-0">
                  File
                </span>
              </button>

              {/* Resolution Folders */}
              {Object.keys(tree.folders).map((folderName) => {
                const isFolderExpanded = !!expandedFolders[folderName];
                const folderData = tree.folders[folderName];

                return (
                  <div key={folderName} className="space-y-1">
                    <button
                      onClick={() => toggleFolder(folderName)}
                      className="w-full flex items-center justify-between py-1 px-2.5 rounded-lg border border-transparent text-left cursor-pointer hover:bg-zinc-900/60 text-zinc-400 hover:text-zinc-300 transition-all"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {/* Expand/Collapse arrow */}
                        <svg
                          className={`w-3 h-3 text-zinc-600 shrink-0 transition-transform ${
                            isFolderExpanded ? "rotate-90" : ""
                          }`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <svg
                          className="w-3.5 h-3.5 text-amber-500 shrink-0"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                        </svg>
                        <span className="truncate font-semibold">
                          {folderName}
                        </span>
                      </div>
                      <span className="text-[9px] text-zinc-600 bg-zinc-900/40 px-1 rounded shrink-0">
                        Folder
                      </span>
                    </button>

                    {/* Folder Children Files */}
                    {isFolderExpanded && (
                      <div className="pl-6 border-l border-zinc-800/80 ml-3.5 space-y-1 py-1">
                        {folderData.loading && (
                          <div className="flex items-center gap-1.5 text-zinc-600 py-1 pl-2 text-[10px]">
                            <div className="w-2.5 h-2.5 border border-zinc-600 border-t-transparent rounded-full animate-spin"></div>
                            <span>Scanning S3 objects...</span>
                          </div>
                        )}

                        {!folderData.loading &&
                          folderData.files.map((file) => {
                            const fullFilePath = `${folderName}/${file}`;
                            const isTs = file.endsWith(".ts");
                            const isSelected = selectedFile === fullFilePath;

                            return (
                              <button
                                key={file}
                                onClick={() => selectFile(fullFilePath)}
                                className={`w-full flex items-center justify-between py-1.5 px-2 rounded-lg border text-left cursor-pointer transition-all hover:bg-zinc-900/40 ${
                                  isSelected
                                    ? "bg-zinc-900 border-zinc-800 text-zinc-100"
                                    : "border-transparent text-zinc-500 hover:text-zinc-300"
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  {isTs ? (
                                    <svg
                                      className="w-3.5 h-3.5 text-emerald-500 shrink-0"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                                      />
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                      />
                                    </svg>
                                  ) : (
                                    <svg
                                      className="w-3.5 h-3.5 text-purple-400 shrink-0"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                      />
                                    </svg>
                                  )}
                                  <span className="truncate text-[11px]">
                                    {file}
                                  </span>
                                </div>
                                <span className="text-[8px] opacity-65 font-mono select-none px-1 rounded shrink-0">
                                  {isTs ? "Segment" : "Playlist"}
                                </span>
                              </button>
                            );
                          })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Side: File Reader & Code View Console */}
        <div className="md:col-span-3 bg-zinc-950 flex flex-col max-h-[500px]">
          {/* File Metadata Toolbar */}
          <div className="bg-zinc-900/60 px-5 py-2.5 border-b border-zinc-800 flex items-center justify-between shrink-0">
            <div className="min-w-0">
              <div className="text-[10px] text-zinc-500 font-mono tracking-wider uppercase">
                Inspecting Object
              </div>
              <div className="text-zinc-200 font-mono text-xs font-bold truncate">
                {selectedFile}
              </div>
            </div>

            {selectedFile && !selectedFile.endsWith(".ts") && (
              <button
                onClick={handleCopy}
                disabled={!fileContents[selectedFile]}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold font-mono rounded bg-zinc-800 border border-zinc-700/60 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 cursor-pointer disabled:opacity-50 transition-all select-none"
              >
                {copied ? "COPIED" : "COPY CODE"}
              </button>
            )}
          </div>

          {/* Description Block */}
          <div className="bg-zinc-900/20 px-5 py-2.5 border-b border-zinc-900 flex flex-col gap-1 shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-zinc-200 font-mono bg-zinc-800 border border-zinc-700 px-1.5 py-0.5 rounded">
                {badgeInfo.title}
              </span>
              <span className="text-[9px] font-mono text-zinc-500">
                {badgeInfo.type}
              </span>
            </div>
            <p className="text-[10px] text-zinc-400 leading-normal font-mono">
              {badgeInfo.desc}
            </p>
          </div>

          {/* Code Viewer Console Panel */}
          <div className="flex-1 p-4 overflow-auto scrollbar-thin scrollbar-thumb-zinc-800 select-text">
            {loadingFile === selectedFile ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-500 font-mono gap-2 py-12">
                <div className="w-5 h-5 border border-zinc-400 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-[10px]">Fetching from cloud CDN...</span>
              </div>
            ) : selectedFile.endsWith(".ts") ? (
              // Binary placeholder panel
              <div className="h-full flex flex-col items-center justify-center text-zinc-500 font-mono gap-3.5 py-12 px-6 text-center">
                <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center shadow-inner">
                  <svg
                    className="w-5 h-5 text-emerald-500 animate-pulse"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="space-y-1">
                  <p className="text-zinc-200 text-xs font-bold uppercase tracking-wide">
                    MPEG-2 Transport Stream Binary Segment
                  </p>
                  <p className="text-[10px] text-zinc-500 max-w-sm leading-normal">
                    This file contains encoded binary H.264 video chunks & AAC
                    audio frames. It is loaded sequentially by the Hls.js
                    library in the browser player during live streaming.
                  </p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800/80 rounded-xl px-4 py-2 text-[10px] text-zinc-400 font-semibold shadow-inner">
                  s3://processed-bucket/hls/{videoId}/{selectedFile}
                </div>
              </div>
            ) : fileContents[selectedFile] ? (
              <div className="space-y-0.5">
                {highlightM3U8(fileContents[selectedFile])}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-zinc-600 font-mono text-[10px] py-12">
                Select a valid manifest file or folder to display code.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

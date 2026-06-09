import Link from "next/link";

export default function VideoCard({ video }) {
  const statusColors = {
    PENDING: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    PROCESSING: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    UPLOADED: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    PROCESSED: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    COMPLETED: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    FAILED: "bg-rose-500/10 text-rose-500 border-rose-500/20",
  };

  const statusLabels = {
    PENDING: "Pending",
    PROCESSING: "Processing...",
    UPLOADED: "Processing...",
    PROCESSED: "Ready",
    COMPLETED: "Ready",
    FAILED: "Failed",
  };

  const currentStatusColor = statusColors[video.status] || "bg-slate-500/10 text-slate-500 border-slate-500/20";
  const currentStatusLabel = statusLabels[video.status] || video.status;

  return (
    <Link href={`/video/${video.id}`} className="block group">
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-slate-700 hover:shadow-2xl hover:shadow-indigo-500/5">
        
        {/* Thumbnail Area */}
        <div className="relative aspect-video w-full bg-slate-950 overflow-hidden border-b border-slate-800/80">
          {video.thumbnailUrl ? (
            <img
              src={video.thumbnailUrl}
              alt={video.fileName}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-slate-950 to-slate-900 flex flex-col items-center justify-center p-4">
              <svg className="w-10 h-10 text-slate-700 group-hover:text-indigo-500 transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="p-5">
          <h3 className="font-bold text-slate-100 text-lg leading-snug tracking-tight truncate group-hover:text-indigo-400 transition-colors">
            {video.fileName}
          </h3>
          
          <div className="flex items-center justify-between mt-4">
            <span className={`inline-flex px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider rounded-full border ${currentStatusColor}`}>
              {currentStatusLabel}
            </span>
            <span className="text-xs text-slate-500 group-hover:text-slate-400 transition-colors">
              Watch Video →
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

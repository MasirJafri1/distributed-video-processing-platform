import { getVideo } from "@/services/video.service";
import VideoPlayer from "@/components/VideoPlayer";
import Link from "next/link";

export default async function Page({ params }) {
  const { id } = await params;
  const video = await getVideo(id);

  if (!video) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-slate-100 p-6">
        <h1 className="text-2xl font-bold mb-4">Video Not Found</h1>
        <Link href="/" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium transition">
          Go Back Home
        </Link>
      </div>
    );
  }

  const statusColors = {
    PENDING: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    PROCESSING: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    UPLOADED: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    PROCESSED: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    COMPLETED: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    FAILED: "bg-rose-500/10 text-rose-500 border-rose-500/20",
  };

  const currentStatusColor = statusColors[video.status] || "bg-slate-500/10 text-slate-500 border-slate-500/20";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        {/* Back Link */}
        <Link href="/" className="inline-flex items-center text-sm text-slate-400 hover:text-slate-200 mb-8 transition-colors">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Dashboard
        </Link>

        {/* Video Player Section */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
          
          {/* Player only shows if status is COMPLETED or PROCESSED */}
          {(video.status === "COMPLETED" || video.status === "PROCESSED") && (
            <div className="aspect-video bg-black rounded-xl overflow-hidden shadow-inner border border-slate-800 mb-6 flex items-center justify-center">
              <VideoPlayer videoId={video.id} src={video.playbackUrl || `${process.env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN}/${video.masterPlaylistKey || `hls/${video.id}/master.m3u8`}`} />
            </div>
          )}

          {/* Processing UI placeholder if not ready */}
          {video.status !== "COMPLETED" && video.status !== "PROCESSED" && (
            <div className="aspect-video bg-slate-950 rounded-xl flex flex-col items-center justify-center border border-dashed border-slate-800 mb-6 p-8 text-center">
              {video.status === "FAILED" ? (
                <div className="text-rose-500 text-lg font-semibold mb-2">Processing Failed</div>
              ) : (
                <div className="text-slate-400 text-lg font-semibold mb-2">Video is currently processing...</div>
              )}
              <p className="text-sm text-slate-500 max-w-sm">We are generating variant qualities (360p, 480p, 720p). Refresh page to check updates.</p>
            </div>
          )}

          {/* Details Section */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mt-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                {video.fileName}
              </h1>
              <p className="text-xs text-slate-500 mt-1">ID: {video.id}</p>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Custom processing state UI block */}
              <div className={`px-4 py-2 rounded-xl border ${currentStatusColor} font-medium text-sm`}>
                {(video.status === "PROCESSING" || video.status === "UPLOADED") && (
                  <p>Processing...</p>
                )}
                {(video.status === "COMPLETED" || video.status === "PROCESSED") && (
                  <p>Ready</p>
                )}
                {video.status === "FAILED" && (
                  <p>Failed</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

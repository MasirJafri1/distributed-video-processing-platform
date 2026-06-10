import React from "react";
import Link from "next/link";

export default function UploadToastContainer({ toasts, setToasts }) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 space-y-3 max-w-sm w-full">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="flex gap-3 p-4 bg-black text-white rounded-2xl shadow-xl border border-zinc-800 animate-slide-up"
        >
          {/* Success Icon */}
          <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-zinc-800 flex items-center justify-center border border-zinc-700">
            <svg
              className="w-4 h-4 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <div className="flex-1 space-y-1">
            <p className="text-sm font-medium">{toast.message}</p>
            {toast.videoId && (
              <Link
                href={`/video/${toast.videoId}`}
                className="inline-flex text-xs font-bold text-zinc-300 hover:text-white underline underline-offset-2"
              >
                Launch Player →
              </Link>
            )}
          </div>

          <button
            onClick={() =>
              setToasts((prev) => prev.filter((t) => t.id !== toast.id))
            }
            className="flex-shrink-0 text-zinc-500 hover:text-zinc-300 h-fit"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}

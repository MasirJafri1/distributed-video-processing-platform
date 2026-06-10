import React from "react";

export default function DashboardStats({ completed, processing, failed }) {
  const stats = [
    {
      label: "Completed Runs",
      value: completed,
      description: "Successfully processed HLS streams",
      color: "text-zinc-900",
      bg: "bg-zinc-100/50",
    },
    {
      label: "Active Queue",
      value: processing,
      description: "Currently transcoding or pending in SQS",
      color: "text-black",
      bg: "bg-zinc-100/50",
    },
    {
      label: "Failed Runs",
      value: failed,
      description: "Pipeline processing errors",
      color: failed > 0 ? "text-rose-600" : "text-zinc-900",
      bg: failed > 0 ? "bg-rose-50/50" : "bg-zinc-100/50",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {stats.map((stat, idx) => (
        <div
          key={idx}
          className={`p-6 rounded-2xl border border-zinc-200/80 bg-white shadow-sm transition-all duration-200 ${stat.bg}`}
        >
          <p className="text-sm font-medium text-zinc-500">{stat.label}</p>
          <div className="flex items-baseline gap-2 mt-2">
            <span
              className={`text-3xl font-extrabold tracking-tight ${stat.color}`}
            >
              {stat.value}
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">{stat.description}</p>
        </div>
      ))}
    </div>
  );
}

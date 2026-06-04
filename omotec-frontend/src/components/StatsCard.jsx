import React from "react";

export default function StatsCard({
  title,
  value,
  sub,
  icon,
  className = "",
}) {
  return (
    <div className={`bg-white p-5 rounded-2xl border border-gray-150 shadow-sm hover:shadow transition ${className}`}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</div>
          <div className="text-2xl font-extrabold text-slate-800 tracking-tight">{value}</div>
          {sub && <div className="text-xs text-slate-500 font-medium">{sub}</div>}
        </div>
        {icon && (
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 shadow-sm text-lg">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}


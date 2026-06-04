import React from "react";

export default function EmptyState({
  title = "No records found",
  description = "There are no entries matching your selection or criteria at the moment.",
  action,
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 bg-white border border-slate-200 rounded-2xl shadow-sm max-w-lg mx-auto my-8 text-center">
      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-slate-50 text-slate-400 border border-slate-100 text-2xl mb-4">
        📭
      </div>
      <h3 className="text-base font-semibold text-slate-800">{title}</h3>
      {description && (
        <p className="text-xs text-slate-500 mt-2 max-w-sm leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}


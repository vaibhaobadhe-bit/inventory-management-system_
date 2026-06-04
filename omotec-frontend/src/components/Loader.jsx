import React from "react";

export default function Loader({ label = "Loading..." }) {
  return (
    <div className="flex items-center gap-3 text-gray-600">
      <div
        className="h-5 w-5 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"
        aria-label={label}
      />
      <span className="text-sm">{label}</span>
    </div>
  );
}


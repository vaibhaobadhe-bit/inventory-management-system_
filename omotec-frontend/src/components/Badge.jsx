import React from "react";

export default function Badge({
  text,
  tone = "gray",
  className = "",
}) {
  const norm = String(text || "").toUpperCase().trim();
  
  let finalClasses = "bg-gray-50 text-gray-700 border-gray-200 border";
  
  if (norm === "PENDING") {
    finalClasses = "bg-amber-50 text-amber-800 border border-amber-200";
  } else if (norm === "APPROVED") {
    finalClasses = "bg-emerald-50 text-emerald-800 border border-emerald-200";
  } else if (norm === "ISSUED") {
    finalClasses = "bg-indigo-50 text-indigo-800 border border-indigo-200";
  } else if (norm === "RETURNED") {
    finalClasses = "bg-teal-50 text-teal-800 border border-teal-200";
  } else if (norm === "REJECTED" || norm === "INACTIVE") {
    finalClasses = "bg-red-50 text-red-800 border border-red-200";
  } else {
    const toneToClasses = {
      gray: "bg-gray-50 text-gray-700 border border-gray-200",
      green: "bg-emerald-50 text-emerald-800 border border-emerald-200",
      red: "bg-red-50 text-red-800 border border-red-200",
      blue: "bg-blue-50 text-blue-800 border border-blue-200",
      yellow: "bg-amber-50 text-amber-800 border border-amber-200",
      indigo: "bg-indigo-50 text-indigo-800 border border-indigo-200",
      purple: "bg-purple-50 text-purple-800 border border-purple-200",
    };
    finalClasses = toneToClasses[tone] ?? toneToClasses.gray;
  }

  return (
    <span
      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold inline-flex items-center tracking-wide shadow-sm ${finalClasses} ${className}`}
    >
      {text}
    </span>
  );
}


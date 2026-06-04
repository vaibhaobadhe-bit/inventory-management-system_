import React from "react";

export default function Modal({
  open,
  title,
  onClose,
  children,
  footer,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden
      />

      <div className="relative bg-white rounded-xl shadow-lg w-[90%] max-w-lg">
        {(title || onClose) && (
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <h3 className="font-semibold text-lg">{title}</h3>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 transition"
              >
                ✕
              </button>
            )}
          </div>
        )}

        <div className="px-6 py-4">{children}</div>

        {footer && <div className="px-6 py-4 border-t">{footer}</div>}
      </div>
    </div>
  );
}


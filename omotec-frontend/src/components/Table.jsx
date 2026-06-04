import React from "react";

/**
 * Modern, style-consistent wrapper around a table.
 * Supports both custom rows/columns layout or raw table rendering.
 */
export default function Table({
  className = "w-full border-collapse text-left text-sm",
  thead,
  children,
  columns,
  rows,
}) {
  if (columns && rows) {
    return (
      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        <table className="w-full border-collapse text-left text-xs bg-white">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
            <tr>
              {columns.map((c, idx) => (
                <th key={idx} className="p-3">{c.header}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-slate-700">
            {rows.map((row, rIdx) => (
              <tr key={rIdx} className="hover:bg-slate-50/50 transition">
                {columns.map((c, cIdx) => (
                  <td key={cIdx} className="p-3">
                    {row[c.accessor]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow overflow-x-auto border border-slate-200">
      <table className={className}>
        {thead}
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}


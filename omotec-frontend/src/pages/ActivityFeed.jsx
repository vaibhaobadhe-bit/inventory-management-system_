import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { apiFetch } from "../utils/api";

function formatRelative(isoLike) {
  if (!isoLike) return "";
  const t = new Date(isoLike);
  if (Number.isNaN(t.getTime())) return String(isoLike);

  const diffMs = Date.now() - t.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const abs = Math.abs(diffSec);

  const sign = diffMs >= 0 ? "ago" : "from now";

  if (abs < 60) return `${abs}s ${sign}`;
  const m = Math.floor(abs / 60);
  if (m < 60) return `${m}m ${sign}`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ${sign}`;
  const d = Math.floor(h / 24);
  return `${d}d ${sign}`;
}

function statusBadge(status) {
  const s = (status ?? "").toString().toUpperCase();
  if (s.includes("APPROVED")) return "bg-green-100 text-green-800";
  if (s.includes("REJECT")) return "bg-red-100 text-red-800";
  if (s.includes("ISSUED")) return "bg-blue-100 text-blue-800";
  if (s.includes("RETURN")) return "bg-purple-100 text-purple-800";
  if (s.includes("RESOL")) return "bg-teal-100 text-teal-800";
  if (s.includes("PEND")) return "bg-amber-100 text-amber-800";
  return "bg-gray-100 text-gray-800";
}

export default function ActivityFeed({
  title = "Recent Activity",
  pollMs = 20000,
  moduleHint,
  maxItems = 10,
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const endpoint = "/api/activity-feed";

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(endpoint);
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load activity feed");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(() => load(), pollMs);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    if (!moduleHint) return items;
    return items.filter((x) => (x.module ?? "").toString() === moduleHint);
  }, [items, moduleHint]);

  const shown = filtered.slice(0, maxItems);

  return (
    <div className="bg-white p-6 rounded-xl shadow mt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold">{title}</h2>
        <span className="text-xs text-gray-500">{loading ? "Loading..." : "Live"}</span>
      </div>

      {shown.length === 0 ? (
        <div className="text-sm text-gray-500">No activity records found</div>
      ) : (
        <div className="space-y-3">
          {shown.map((a, idx) => (
            <div
              key={`${a.timestamp ?? idx}-${idx}`}
              className="flex items-start gap-3 rounded-lg border border-gray-100 p-3"
            >
              <div className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold ${statusBadge(a.status)}`}>
                {(a.status ?? "UPDATED").toString()}
              </div>

              <div className="min-w-0 flex-1">
                <div className="text-sm text-gray-900 font-medium break-words">
                  {a.action ?? ""}
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  <span className="font-medium">{a.username ?? ""}</span>
                  {a.module ? ` • ${a.module}` : ""}
                  {a.timestamp ? ` • ${formatRelative(a.timestamp)}` : ""}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


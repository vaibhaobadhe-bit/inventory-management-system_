import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { apiFetch } from "../utils/api";
import Badge from "../components/Badge";
import EmptyState from "../components/EmptyState";
import StatsCard from "../components/StatsCard";

function statusToTone(status) {
  const s = (status ?? "").toString().toUpperCase();
  if (s.includes("PENDING")) return "amber";
  if (s.includes("REJECT")) return "red";
  if (s.includes("APPROVED")) return "green";
  if (s.includes("ISSUED")) return "blue";
  if (s.includes("RETURN_REQUESTED")) return "purple";
  if (s.includes("RETURNED")) return "teal";
  if (s.includes("RETURN")) return "purple";
  return "gray";
}

export default function TrainerDashboard() {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [issues, setIssues] = useState([]);

  const currentUserUsername = localStorage.getItem("username") || "trainer1";

  const load = async () => {
    setLoading(true);
    try {
      const [reqsRes, issuesRes] = await Promise.all([
        apiFetch("/api/kit-requests/my"),
        apiFetch("/api/issues")
      ]);

      const reqsData = await reqsRes.json();
      setRequests(Array.isArray(reqsData) ? reqsData : []);

      if (issuesRes.ok) {
        const issuesData = await issuesRes.json();
        setIssues(Array.isArray(issuesData) ? issuesData : []);
      }
    } catch {
      toast.error("Failed to load trainer dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 25000);
    return () => clearInterval(id);
  }, []);

  const stats = useMemo(() => {
    const s = (x) => (x ?? "").toString().toUpperCase();
    const pending = requests.filter((r) => s(r.status) === "PENDING").length;
    const approved = requests.filter((r) => s(r.status) === "APPROVED").length;
    const issued = requests.filter((r) => s(r.status) === "ISSUED").length;
    const returnPending = requests.filter((r) => s(r.status) === "RETURN_REQUESTED").length;
    const rejected = requests.filter((r) => s(r.status) === "REJECTED").length;

    return {
      total: requests.length,
      pending,
      approved,
      issued,
      returnPending,
      rejected,
    };
  }, [requests]);

  // Parse issues to extract issues created by this trainer
  const parsedTrainerIssues = useMemo(() => {
    const list = Array.isArray(issues) ? issues : [];
    return list.map((issue) => {
      try {
        const data = JSON.parse(issue.title);
        return {
          id: issue.id,
          title: data.title || issue.title,
          createdBy: data.createdBy || "trainer1",
          createdDate: data.createdDate || new Date().toISOString()
        };
      } catch {
        return {
          id: issue.id,
          title: issue.title,
          createdBy: "trainer1",
          createdDate: new Date().toISOString()
        };
      }
    }).filter((i) => i.createdBy === currentUserUsername);
  }, [issues, currentUserUsername]);

  // Merge requests and issues logs for Trainer Activity Feed
  const last5Activities = useMemo(() => {
    const activitiesList = [];

    // Map kit requests to activities
    requests.forEach((r) => {
      const date = r.requiredDate ? new Date(r.requiredDate) : new Date();
      const activityText = r.activityName || r.courseName || "Kit";
      const schoolText = r.schoolName || "School";

      if (r.status === "ISSUED") {
        activitiesList.push({
          text: `Issued ${activityText} Kit for ${schoolText}`,
          date,
          icon: "📤",
          tone: "indigo"
        });
      } else if (r.status === "PENDING") {
        activitiesList.push({
          text: `Requested ${activityText} Kit for ${schoolText}`,
          date,
          icon: "⏳",
          tone: "amber"
        });
      } else if (r.status === "RETURNED") {
        activitiesList.push({
          text: `Returned ${activityText} Kit from ${schoolText}`,
          date,
          icon: "📥",
          tone: "teal"
        });
      } else if (r.status === "APPROVED") {
        activitiesList.push({
          text: `Approved ${activityText} Kit for ${schoolText}`,
          date,
          icon: "✅",
          tone: "green"
        });
      } else if (r.status === "REJECTED") {
        activitiesList.push({
          text: `Rejected request for ${activityText} Kit`,
          date,
          icon: "❌",
          tone: "red"
        });
      }
    });

    // Map issues to activities
    parsedTrainerIssues.forEach((i) => {
      const date = new Date(i.createdDate);
      activitiesList.push({
        text: `Raised Issue: "${i.title}"`,
        date,
        icon: "🚨",
        tone: "rose"
      });
    });

    // Sort by date descending and take top 5
    return activitiesList
      .sort((a, b) => b.date - a.date)
      .slice(0, 5);
  }, [requests, parsedTrainerIssues]);

  return (
    <div className="space-y-6">
      {/* STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        <StatsCard title="Total Requests" value={stats.total} icon="📋" />
        <StatsCard title="Pending" value={stats.pending} icon="⏳" />
        <StatsCard title="Approved" value={stats.approved} icon="✅" />
        <StatsCard title="Issued" value={stats.issued} icon="📤" />
        <StatsCard title="Return Pending" value={stats.returnPending} icon="🔄" />
        <StatsCard title="Rejected" value={stats.rejected} icon="❌" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* RECENT REQUESTS TABLE */}
        <div className="bg-white p-6 rounded-xl shadow lg:col-span-2">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="font-semibold text-gray-800">Recent Requests Queue</h2>
            <div className="text-sm text-gray-500">
              {loading ? "Loading…" : `${requests.length} record(s)`}
            </div>
          </div>

          {loading ? (
            <div className="text-gray-500 text-sm py-4">Loading requests…</div>
          ) : requests.length === 0 ? (
            <div className="py-4">
              <EmptyState
                title="No requests yet"
                description="Create your first kit request using the Kit Request module."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border text-sm text-left">
                <thead className="bg-gray-50 text-gray-700 font-semibold border-b">
                  <tr>
                    <th className="p-3 border">Course / Activity</th>
                    <th className="p-3 border">School</th>
                    <th className="p-3 border w-20 text-center">Qty</th>
                    <th className="p-3 border w-28 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-gray-800">
                  {requests
                    .slice()
                    .sort((a, b) => (b.id ?? 0) - (a.id ?? 0))
                    .slice(0, 5)
                    .map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="p-3 border">
                          {(r.courseName ?? "") || (r.activityName ?? "")
                            ? `${r.courseName ?? ""}${r.activityName ? " • " + r.activityName : ""}`
                            : "-"}
                        </td>
                        <td className="p-3 border">{r.schoolName ?? "-"}</td>
                        <td className="p-3 border text-center font-semibold font-mono">{r.quantity ?? r.qty ?? "-"}</td>
                        <td className="p-3 border text-center">
                          <Badge text={r.status ?? "UNKNOWN"} tone={statusToTone(r.status)} />
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* PERSONAL ACTIVITY FEED */}
        <div className="bg-white p-6 rounded-xl shadow flex flex-col justify-between">
          <div>
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-1.5">
              <span>⚡</span> Last 5 Kit Activities
            </h3>
            
            <div className="space-y-3">
              {last5Activities.length === 0 ? (
                <p className="text-gray-400 text-xs italic py-6 text-center">No recent activities recorded.</p>
              ) : (
                last5Activities.map((act, idx) => (
                  <div key={idx} className="flex gap-3 text-xs items-start border-b pb-2.5 last:border-b-0">
                    <span className="text-base select-none">{act.icon}</span>
                    <div className="space-y-0.5">
                      <p className="font-semibold text-slate-800 leading-tight">{act.text}</p>
                      <span className="text-[10px] text-gray-400 font-mono">
                        {act.date.toLocaleDateString()} {act.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-4 border-t mt-4 text-[10px] text-gray-400 text-center font-medium">
            Live updates connected
          </div>
        </div>
      </div>
    </div>
  );
}

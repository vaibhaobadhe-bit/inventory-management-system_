import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend } from "recharts";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { apiFetch } from "../../utils/api";
import StatsCard from "../../components/StatsCard";
import Badge from "../../components/Badge";
import Table from "../../components/Table";
import EmptyState from "../../components/EmptyState";
import ActivityFeed from "../ActivityFeed";

function toneForStatus(status) {
  const s = (status ?? "").toString().toUpperCase();
  if (s.includes("PENDING")) return "amber";
  if (s.includes("APPROVED")) return "green";
  if (s.includes("REJECT")) return "red";
  if (s.includes("ISSUED")) return "blue";
  if (s.includes("RETURN_REQUESTED")) return "purple";
  if (s.includes("RETURNED")) return "teal";
  return "gray";
}

const COLORS = ["#7c3aed", "#ef4444", "#22c55e", "#3b82f6", "#a855f7", "#14b8a6"]; 

export function ManagerDashboard() {

  const [counts, setCounts] = useState({
    trainers: 0,
    schools: 0,
    kits: 0,
    issues: 0,
  });

  const [analytics, setAnalytics] = useState({
    totalRequests: 0,
    approvedRequests: 0,
    rejectedRequests: 0,
    issuedKits: 0,
    returnedKits: 0,
    monthlyRequestTrends: [],
    inventoryUsageTrends: [],
    mostRequestedCourses: [],
    mostActiveTrainers: [],
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAll = async () => {
      try {
        setLoading(true);

        const cRes = await apiFetch("/api/dashboard/counts");
        const cData = await cRes.json();
        setCounts({
          trainers: cData?.trainers ?? 0,
          schools: cData?.schools ?? 0,
          kits: cData?.kits ?? 0,
          issues: cData?.issues ?? 0,
        });

        const aRes = await apiFetch("/api/dashboard/analytics");
        const aData = await aRes.json();
        setAnalytics((prev) => ({ ...prev, ...aData }));
      } catch {
        toast.error("Failed to load manager dashboard");
      } finally {
        setLoading(false);
      }
    };

    loadAll();
    const interval = setInterval(loadAll, 15000);
    return () => clearInterval(interval);
  }, []);

  const statusDistribution = useMemo(() => {
    const total = (analytics.totalRequests ?? 0) || 0;
    const mk = (name, value) => ({ name, value: Number(value ?? 0) });
    const list = [
      mk("Approved", analytics.approvedRequests),
      mk("Rejected", analytics.rejectedRequests),
      mk("Issued", analytics.issuedKits),
      mk("Returned", analytics.returnedKits),
    ];
    return { total, list };
  }, [analytics]);

  const monthlyTrendsData = useMemo(() => {
    const list = Array.isArray(analytics.monthlyRequestTrends) ? analytics.monthlyRequestTrends : [];
    return list
      .slice()
      .reverse()
      .slice(0, 6)
      .reverse();
  }, [analytics]);

  const inventoryTrendsData = useMemo(() => {
    const list = Array.isArray(analytics.inventoryUsageTrends) ? analytics.inventoryUsageTrends : [];
    return list
      .slice()
      .reverse()
      .slice(0, 6)
      .reverse();
  }, [analytics]);

  const issueSummary = useMemo(() => {
    // Frontend expects a table; we use issues count from counts.
    // If backend provides issue list elsewhere, keep this minimal to avoid breaking.
    const openIssues = Number(counts.issues ?? 0);
    return {
      rows: openIssues > 0 ? [{ id: "issues_summary", title: "Open Issues", status: "Open", priority: "High" }] : [],
      openIssues,
    };
  }, [counts]);

  const downloadReport = async (path, filename) => {
    try {
      const token = localStorage.getItem("token");
      const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8081";
      const res = await fetch(`${API_BASE}${path}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Export failed (${res.status}): ${text}`);
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`Downloaded ${filename}`);
    } catch (err) {
      toast.error(err.message || "Export failed");
    }
  };

  const exportInventory = (fmt = "excel") =>
    downloadReport(
      `/api/reports/inventory/${fmt}`,
      fmt === "pdf" ? "inventory-report.pdf" : "inventory-report.xlsx"
    );

  const exportRequests = (fmt = "excel") =>
    downloadReport(
      `/api/reports/requests/${fmt}`,
      fmt === "pdf" ? "kit-request-report.pdf" : "kit-request-report.xlsx"
    );

  const exportAudit = (fmt = "excel") =>
    downloadReport(
      `/api/reports/audit/${fmt}`,
      fmt === "pdf" ? "audit-log-report.pdf" : "audit-log-report.xlsx"
    );

  return (
    <div className="space-y-8">
      <div>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Manager Dashboard</h2>
            <p className="text-sm text-gray-500">Executive analytics, operational monitoring & audit visibility</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="flex rounded-lg overflow-hidden shadow border border-indigo-700">
              <button
                onClick={() => exportInventory("excel")}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 transition text-sm font-semibold"
                title="Export Inventory as Excel"
              >
                📊 Inventory
              </button>
              <button
                onClick={() => exportInventory("pdf")}
                className="bg-indigo-800 hover:bg-indigo-900 text-white px-2 py-2 transition text-sm border-l border-indigo-500"
                title="Export Inventory as PDF"
              >
                PDF
              </button>
            </div>
            <div className="flex rounded-lg overflow-hidden shadow border border-teal-700">
              <button
                onClick={() => exportRequests("excel")}
                className="bg-teal-600 hover:bg-teal-700 text-white px-3 py-2 transition text-sm font-semibold"
                title="Export Requests as Excel"
              >
                📋 Requests
              </button>
              <button
                onClick={() => exportRequests("pdf")}
                className="bg-teal-800 hover:bg-teal-900 text-white px-2 py-2 transition text-sm border-l border-teal-500"
                title="Export Requests as PDF"
              >
                PDF
              </button>
            </div>
            <div className="flex rounded-lg overflow-hidden shadow border border-purple-700">
              <button
                onClick={() => exportAudit("excel")}
                className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 transition text-sm font-semibold"
                title="Export Audit Logs as Excel"
              >
                🔍 Audit
              </button>
              <button
                onClick={() => exportAudit("pdf")}
                className="bg-purple-800 hover:bg-purple-900 text-white px-2 py-2 transition text-sm border-l border-purple-500"
                title="Export Audit Logs as PDF"
              >
                PDF
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          <StatsCard title="Total Trainers" value={counts.trainers} sub="Trainers registered" icon="👨‍🏫" />
          <StatsCard title="Total Inventory" value={counts.kits} sub="Kits available" icon="📦" />
          <StatsCard title="Pending Requests" value={Math.max(0, analytics.totalRequests - (analytics.approvedRequests ?? 0))} sub="Derived from analytics" icon="📬" />
          <StatsCard title="Issued Kits" value={analytics.issuedKits} sub="Inventory issuance" icon="📤" />
          <StatsCard title="Returned Kits" value={analytics.returnedKits} sub="Return reconciled" icon="📥" />
          <StatsCard title="Open Issues" value={counts.issues} sub="Active tickets" icon="🚨" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Monthly Request Trends</h3>
            <Badge text="Realtime" tone="indigo" />
          </div>
          {loading ? (
            <div className="text-gray-500">Loading trends...</div>
          ) : monthlyTrendsData.length === 0 ? (
            <EmptyState title="No trends yet" description="Request history is not available." />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyTrendsData}>
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="approvedRequests" name="Approved" fill="#22c55e" />
                <Bar dataKey="rejectedRequests" name="Rejected" fill="#ef4444" />
                <Bar dataKey="issuedKits" name="Issued" fill="#3b82f6" />
                <Bar dataKey="returnedKits" name="Returned" fill="#14b8a6" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white p-6 rounded-xl shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Inventory Usage Trends</h3>
            <Badge text="Stock" tone="teal" />
          </div>
          {loading ? (
            <div className="text-gray-500">Loading stock usage...</div>
          ) : inventoryTrendsData.length === 0 ? (
            <EmptyState title="No inventory usage" description="Inventory history is not available." />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={inventoryTrendsData}>
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="issued" name="Issued" fill="#7c3aed" />
                <Bar dataKey="returned" name="Returned" fill="#14b8a6" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white p-6 rounded-xl shadow lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Request Status Distribution</h3>
            <Badge text="KPI" tone="purple" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            <div className="md:col-span-2 h-[320px]">
              {loading ? (
                <div className="text-gray-500">Loading distribution...</div>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie
                      data={statusDistribution.list}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={110}
                      label
                    >
                      {statusDistribution.list.map((_, idx) => (
                        <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="space-y-3">
              {statusDistribution.list.map((it, idx) => (
                <div key={it.name} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-3 h-3 rounded-full" style={{ background: COLORS[idx % COLORS.length] }} />
                    <span className="text-sm font-semibold text-gray-800">{it.name}</span>
                  </div>
                  <div className="text-sm font-bold text-gray-900">{it.value}</div>
                </div>
              ))}
              <div className="pt-3 text-xs text-gray-500">Total requests: {statusDistribution.total}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Top Requested Courses</h3>
            <Badge text="Insights" tone="indigo" />
          </div>
          {Array.isArray(analytics.mostRequestedCourses) && analytics.mostRequestedCourses.length > 0 ? (
            <div className="space-y-2">
              {analytics.mostRequestedCourses.map((c, idx) => (
                <div key={`${c.name}-${idx}`} className="flex items-center justify-between gap-3 border border-gray-100 rounded-lg p-3">
                  <div className="text-sm font-semibold text-gray-800">{c.name ?? "-"}</div>
                  <div className="text-sm font-bold text-gray-900">{c.value ?? 0}</div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No course ranking" description="Analytics data is not available." />
          )}
        </div>

        <div className="bg-white p-6 rounded-xl shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Most Active Trainers</h3>
            <Badge text="Operations" tone="teal" />
          </div>
          {Array.isArray(analytics.mostActiveTrainers) && analytics.mostActiveTrainers.length > 0 ? (
            <div className="space-y-2">
              {analytics.mostActiveTrainers.map((t, idx) => (
                <div key={`${t.name}-${idx}`} className="flex items-center justify-between gap-3 border border-gray-100 rounded-lg p-3">
                  <div className="text-sm font-semibold text-gray-800">{t.name ?? "-"}</div>
                  <div className="text-sm font-bold text-gray-900">{t.value ?? 0}</div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No trainer ranking" description="Analytics data is not available." />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Issue Monitoring</h3>
            <Badge text="Tickets" tone="red" />
          </div>

          {issueSummary.rows.length === 0 ? (
            <EmptyState title="No open issues" description="All tickets are currently resolved." />
          ) : (
            <Table
              columns={[
                { header: "Title", accessor: "title" },
                { header: "Status", accessor: "status" },
                { header: "Priority", accessor: "priority" },
              ]}
              rows={issueSummary.rows}
            />
          )}
        </div>

        <div className="bg-white p-6 rounded-xl shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Audit Logs (Quick View)</h3>
            <Badge text="Trace" tone="purple" />
          </div>
          <div className="text-xs text-gray-500 mb-3">Use the Audit Logs menu for full audit trails.</div>
          <ActivityFeed title="Recent Audit Activity" pollMs={20000} maxItems={6} moduleHint={null} />
        </div>
      </div>

      <div>
        <ActivityFeed title="System Activity Feed" pollMs={20000} maxItems={10} moduleHint={null} />
      </div>
    </div>
  );
}


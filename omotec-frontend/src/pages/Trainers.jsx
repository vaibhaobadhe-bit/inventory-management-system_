import { useState, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import { apiFetch } from "../utils/api";

export default function Trainers() {
  const [users, setUsers] = useState([]);
  const [kitRequests, setKitRequests] = useState([]);
  const [issues, setIssues] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);

  // ===== Detail Modals States =====
  const [selectedTrainer, setSelectedTrainer] = useState(null);
  const [modalType, setModalType] = useState(null); // 'profile' | 'requests' | 'schools' | 'issues'

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersRes, reqsRes, issuesRes, movsRes] = await Promise.all([
        apiFetch("/api/users"),
        apiFetch("/api/kit-requests"),
        apiFetch("/api/issues"),
        apiFetch("/api/components/movements")
      ]);

      if (usersRes.ok) setUsers(await usersRes.json());
      if (reqsRes.ok) setKitRequests(await reqsRes.json());
      if (issuesRes.ok) setIssues(await issuesRes.json());
      if (movsRes.ok) setMovements(await movsRes.json());
    } catch {
      toast.error("Failed to load trainer analytics data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter list of users to get registered trainers
  const trainersList = useMemo(() => {
    const list = Array.isArray(users) ? users : [];
    return list.filter((u) => u.role && u.role.toUpperCase() === "TRAINER");
  }, [users]);

  // Parse issues to extract creator
  const parsedIssuesList = useMemo(() => {
    const list = Array.isArray(issues) ? issues : [];
    return list.map((issue) => {
      try {
        const data = JSON.parse(issue.title);
        return {
          id: issue.id,
          status: issue.status,
          title: data.title || issue.title,
          category: data.category || "Other",
          priority: data.priority || "Low",
          createdBy: data.createdBy || "trainer1"
        };
      } catch {
        return {
          id: issue.id,
          status: issue.status,
          title: issue.title,
          category: "Other",
          priority: "Low",
          createdBy: "trainer1"
        };
      }
    });
  }, [issues]);

  // Trainer metrics calculations
  const trainerData = useMemo(() => {
    const reqs = Array.isArray(kitRequests) ? kitRequests : [];
    const movs = Array.isArray(movements) ? movements : [];

    return trainersList.map((t) => {
      const username = t.username;

      // Mapped schools
      const trainerReqs = reqs.filter((r) => r.trainerName === username);
      const uniqueSchools = [...new Set(trainerReqs.map((r) => r.schoolName).filter(Boolean))];

      // Pending and Issued counts
      const pendingCount = trainerReqs.filter((r) => r.status === "PENDING").length;
      const issuedCount = trainerReqs.filter((r) => r.status === "ISSUED" || r.status === "COMPLETED").length;

      // Last activity mapping
      const trainerMovs = movs.filter((m) => m.employeeName === username || m.performedBy === username);
      let lastActivityLabel = "None";
      if (trainerMovs.length > 0) {
        const sortedMovs = [...trainerMovs].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        const latest = sortedMovs[0];
        const latestDate = new Date(latest.timestamp).toLocaleDateString();
        lastActivityLabel = `${latest.movementType === "RETURN" || latest.movementType === "MANUAL_RETURN" ? "Returned" : "Issued"} ${latest.component?.name || latest.component?.componentName || "Kit"} (${latestDate})`;
      }

      // Mapped issues
      const trainerIssues = parsedIssuesList.filter((i) => i.createdBy === username);

      return {
        ...t,
        schools: uniqueSchools,
        pendingRequests: pendingCount,
        issuedKits: issuedCount,
        lastActivity: lastActivityLabel,
        issues: trainerIssues,
        allRequests: trainerReqs,
        isActive: trainerReqs.length > 0 || trainerMovs.length > 0
      };
    });
  }, [trainersList, kitRequests, movements, parsedIssuesList]);

  // Overall Manager Summary Cards values
  const summary = useMemo(() => {
    const total = trainerData.length;
    const active = trainerData.filter((t) => t.isActive).length;
    
    // Total distinct schools taught across all requests
    const allSchools = kitRequests.map((r) => r.schoolName).filter(Boolean);
    const totalSchools = new Set(allSchools).size;

    const totalPending = kitRequests.filter((r) => r.status === "PENDING").length;
    const totalIssues = parsedIssuesList.filter((i) => i.status !== "CLOSED").length;

    return {
      total,
      active,
      schools: totalSchools,
      pending: totalPending,
      issues: totalIssues
    };
  }, [trainerData, kitRequests, parsedIssuesList]);

  const handleOpenModal = (trainer, type) => {
    setSelectedTrainer(trainer);
    setModalType(type);
  };

  const handleCloseModal = () => {
    setSelectedTrainer(null);
    setModalType(null);
  };

  return (
    <div className="p-6 space-y-6">
      {/* HEADER */}
      <div>
        <h2 className="text-2xl font-extrabold text-gray-800 tracking-tight">Trainer Dashboard</h2>
        <p className="text-xs text-gray-400">Management-focused analytics, activity logs, and assigned assets control</p>
      </div>

      {/* KPI SUMMARY CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-150">
          <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Trainers</span>
          <span className="text-2xl font-black text-slate-800 mt-1 block">{summary.total}</span>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-150">
          <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Active Trainers</span>
          <span className="text-2xl font-black text-indigo-600 mt-1 block">{summary.active}</span>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-150">
          <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Assigned Schools</span>
          <span className="text-2xl font-black text-emerald-600 mt-1 block">{summary.schools}</span>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-150">
          <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Pending Requests</span>
          <span className="text-2xl font-black text-amber-600 mt-1 block">{summary.pending}</span>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-150">
          <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Issues Raised</span>
          <span className="text-2xl font-black text-rose-600 mt-1 block">{summary.issues}</span>
        </div>
      </div>

      {/* TRAINERS TABLE */}
      <div className="bg-white rounded-xl shadow overflow-hidden border border-gray-150">
        <div className="p-5 border-b border-gray-150 bg-gray-50 flex items-center justify-between">
          <h3 className="font-bold text-gray-800 text-sm">Registered Trainers Registry</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-3.5 font-bold text-gray-700 border-r min-w-[130px]">Trainer Name</th>
                <th className="p-3.5 font-bold text-gray-700 border-r text-center w-36">Assigned Schools</th>
                <th className="p-3.5 font-bold text-gray-700 border-r text-center w-36">Pending Requests</th>
                <th className="p-3.5 font-bold text-gray-700 border-r text-center w-32">Issued Kits</th>
                <th className="p-3.5 font-bold text-gray-700 border-r min-w-[180px]">Last Activity</th>
                <th className="p-3.5 font-bold text-gray-700 border-r w-24 text-center">Status</th>
                <th className="p-3.5 font-bold text-gray-700 text-center w-72">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-150">
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center p-12 text-gray-400 italic">
                    Loading trainers list...
                  </td>
                </tr>
              ) : trainerData.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center p-12 text-gray-400 italic">
                    No registered trainers found.
                  </td>
                </tr>
              ) : (
                trainerData.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                    {/* Name */}
                    <td className="p-3.5 border-r font-semibold text-gray-900">
                      {t.fullName ? `${t.fullName} (${t.username})` : t.username}
                    </td>

                    {/* Assigned Schools count */}
                    <td className="p-3.5 border-r text-center font-mono font-bold text-gray-700">
                      {t.schools.length}
                    </td>

                    {/* Pending Requests count */}
                    <td className="p-3.5 border-r text-center font-mono font-bold text-amber-600 bg-amber-50/20">
                      {t.pendingRequests}
                    </td>

                    {/* Issued Kits count */}
                    <td className="p-3.5 border-r text-center font-mono font-bold text-indigo-600 bg-indigo-50/20">
                      {t.issuedKits}
                    </td>

                    {/* Last Activity */}
                    <td className="p-3.5 border-r text-xs font-semibold text-gray-600">
                      {t.lastActivity}
                    </td>

                    {/* Status */}
                    <td className="p-3.5 border-r text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        t.isActive
                          ? "bg-green-50 text-green-700 border-green-200"
                          : "bg-zinc-100 text-zinc-500 border-zinc-200"
                      }`}>
                        {t.isActive ? "Active" : "Idle"}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="p-3.5 text-center">
                      <div className="flex gap-1 justify-center flex-wrap">
                        <button
                          onClick={() => handleOpenModal(t, "profile")}
                          className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 px-2 py-1 rounded text-xs font-bold transition"
                        >
                          Profile
                        </button>
                        <button
                          onClick={() => handleOpenModal(t, "requests")}
                          className="bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 text-indigo-700 px-2 py-1 rounded text-xs font-bold transition"
                        >
                          Requests
                        </button>
                        <button
                          onClick={() => handleOpenModal(t, "schools")}
                          className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs font-bold transition"
                        >
                          Schools
                        </button>
                        <button
                          onClick={() => handleOpenModal(t, "issues")}
                          className="bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-700 px-2 py-1 rounded text-xs font-bold transition"
                        >
                          Issues
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAIL MODAL DRAWER */}
      {modalType && selectedTrainer && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow w-full max-w-lg p-6 animate-in fade-in-50 duration-200">
            {/* Header */}
            <div className="flex justify-between items-center border-b pb-3 mb-4">
              <div>
                <h4 className="text-lg font-bold text-gray-800">
                  {modalType === "profile" && `Trainer Profile: ${selectedTrainer.fullName || selectedTrainer.username}`}
                  {modalType === "requests" && `Kit Requests: ${selectedTrainer.fullName || selectedTrainer.username}`}
                  {modalType === "schools" && `Assigned Schools: ${selectedTrainer.fullName || selectedTrainer.username}`}
                  {modalType === "issues" && `Issues Logged: ${selectedTrainer.fullName || selectedTrainer.username}`}
                </h4>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5">Trainer Portal Audit</p>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 font-black text-lg"
              >
                ×
              </button>
            </div>

            {/* Modal Contents based on Selection */}
            <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
              {/* 1. PROFILE MODAL */}
              {modalType === "profile" && (
                <div className="space-y-3">
                  <div className="bg-slate-50 border p-4 rounded-lg flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-lg font-black shadow-sm">
                      {(selectedTrainer.fullName || selectedTrainer.username).substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h5 className="font-extrabold text-slate-800">{selectedTrainer.fullName || selectedTrainer.username}</h5>
                      <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-mono font-bold">
                        Username: {selectedTrainer.username}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-slate-50 border p-3 rounded-lg">
                      <span className="block text-gray-400 font-bold uppercase">Total requests</span>
                      <span className="text-lg font-black text-indigo-600">{selectedTrainer.allRequests.length}</span>
                    </div>
                    <div className="bg-slate-50 border p-3 rounded-lg">
                      <span className="block text-gray-400 font-bold uppercase">Issues raised</span>
                      <span className="text-lg font-black text-rose-600">{selectedTrainer.issues.length}</span>
                    </div>
                    <div className="col-span-2 bg-slate-50 border p-3 rounded-lg text-slate-700">
                      <span className="block text-gray-400 font-bold uppercase mb-1">Last activity note</span>
                      <p className="font-semibold text-xs italic">{selectedTrainer.lastActivity}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. REQUESTS MODAL */}
              {modalType === "requests" && (
                <div className="space-y-2">
                  {selectedTrainer.allRequests.length === 0 ? (
                    <p className="text-gray-400 text-xs italic text-center py-4">No kit requests found for this trainer.</p>
                  ) : (
                    selectedTrainer.allRequests.map((r) => (
                      <div key={r.id} className="border rounded-lg p-3 text-xs bg-slate-50/50 flex justify-between items-center">
                        <div className="space-y-0.5">
                          <span className="font-mono font-bold text-indigo-600">KR-{String(r.id).padStart(4, "0")}</span>
                          <h6 className="font-bold text-slate-800">{r.courseName} • <span className="font-normal text-slate-500">{r.activityName}</span></h6>
                          <p className="text-[10px] text-gray-400">School: {r.schoolName || "-"}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          r.status === "PENDING" ? "bg-amber-100 text-amber-800" :
                          r.status === "APPROVED" ? "bg-green-100 text-green-800" :
                          r.status === "ISSUED" ? "bg-blue-100 text-blue-800" :
                          r.status === "RETURNED" ? "bg-teal-100 text-teal-800" :
                          "bg-rose-100 text-rose-800"
                        }`}>
                          {r.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* 3. ASSIGNED SCHOOLS MODAL */}
              {modalType === "schools" && (
                <div className="space-y-2">
                  {selectedTrainer.schools.length === 0 ? (
                    <p className="text-gray-400 text-xs italic text-center py-4">No schools assigned to this trainer yet.</p>
                  ) : (
                    selectedTrainer.schools.map((school, idx) => (
                      <div key={idx} className="bg-slate-50 border border-slate-150 p-3 rounded-lg text-xs font-semibold text-slate-700 flex items-center gap-2">
                        <span>🏫</span> {school}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* 4. ISSUES MODAL */}
              {modalType === "issues" && (
                <div className="space-y-2">
                  {selectedTrainer.issues.length === 0 ? (
                    <p className="text-gray-400 text-xs italic text-center py-4">No support issues raised by this trainer.</p>
                  ) : (
                    selectedTrainer.issues.map((i) => (
                      <div key={i.id} className="border rounded-lg p-3 text-xs bg-slate-50/50 flex justify-between items-center">
                        <div className="space-y-0.5 max-w-[70%]">
                          <span className="font-mono font-bold text-rose-600">#Ticket {i.id}</span>
                          <h6 className="font-bold text-slate-800 truncate">{i.title}</h6>
                          <p className="text-[10px] text-gray-400">Category: {i.category}</p>
                        </div>
                        <div className="text-right space-y-1">
                          <span className="block text-[10px] font-bold text-rose-500 uppercase">{i.priority} Priority</span>
                          <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-200 text-slate-700">
                            {i.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Footer buttons */}
            <div className="flex justify-end mt-6 pt-3 border-t">
              <button
                type="button"
                onClick={handleCloseModal}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2.5 rounded-lg text-xs transition shadow-sm"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

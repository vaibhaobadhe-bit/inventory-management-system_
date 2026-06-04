import { useState, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import { apiFetch } from "../utils/api";

// ===== Formatting helpers =====
const formatDate = (d) => {
  if (!d || isNaN(d.getTime())) return "-";
  return `${String(d.getDate()).padStart(2,"0")}-${String(d.getMonth()+1).padStart(2,"0")}-${d.getFullYear()}`;
};
const formatTime = (d) => {
  if (!d || isNaN(d.getTime())) return "-";
  return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
};

// Human-readable action label
const getActionLabel = (type) => {
  switch (type) {
    case "ISSUE":            return "Issue Kit";
    case "RETURN":           return "Return Kit";
    case "MANUAL_REDUCTION": return "Manual Reduction";
    case "MANUAL_RETURN":    return "Manual Return";
    default:                 return "Stock Adjustment";
  }
};

// Format KR-XXXX
const fmtKrId = (id) => id ? `KR-${String(id).padStart(4,"0")}` : "";

// Extract kit request ID from notes text as a last-resort fallback
// e.g. "Issued via Kit Request ID: 3" → 3
const parseKitReqIdFromNotes = (notes) => {
  if (!notes) return null;
  const match = notes.match(/Kit Request ID:\s*(\d+)/i);
  return match ? Number(match[1]) : null;
};

// Get actual user reason from manual movement notes
const getManualReason = (notes) => {
  if (!notes) return "-";
  if (notes.startsWith("Manual stock reduction. Reason: "))
    return notes.replace("Manual stock reduction. Reason: ", "");
  if (notes.startsWith("Manual stock return. Reason: "))
    return notes.replace("Manual stock return. Reason: ", "");
  return notes;
};

export default function AuditLogs() {
  const [movements,    setMovements]    = useState([]);
  const [kitRequests,  setKitRequests]  = useState([]);
  const [users,        setUsers]        = useState([]);
  const [loading,      setLoading]      = useState(true);

  // ===== Filters =====
  const [searchEmployee, setSearchEmployee] = useState("");
  const [filterType,     setFilterType]     = useState("");
  const [dateFrom,       setDateFrom]       = useState("");
  const [dateTo,         setDateTo]         = useState("");

  // ===== Detail modal =====
  const [selectedGroup,    setSelectedGroup]    = useState(null);
  const [detailModalOpen,  setDetailModalOpen]  = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [movsRes, reqsRes, usersRes] = await Promise.all([
        apiFetch("/api/components/movements"),
        apiFetch("/api/kit-requests"),
        apiFetch("/api/users"),
      ]);
      if (movsRes.ok)  { const d = await movsRes.json();  setMovements(   Array.isArray(d) ? d : []); }
      if (reqsRes.ok)  { const d = await reqsRes.json();  setKitRequests( Array.isArray(d) ? d : []); }
      if (usersRes.ok) { const d = await usersRes.json(); setUsers(        Array.isArray(d) ? d : []); }
    } catch {
      toast.error("Failed to load audit movements");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const usersMap = useMemo(() => {
    const m = {};
    users.forEach((u) => { m[u.username] = u.fullName || u.username; });
    return m;
  }, [users]);

  const kitRequestsMap = useMemo(() => {
    const m = {};
    kitRequests.forEach((r) => { m[r.id] = r; });
    return m;
  }, [kitRequests]);

  // ===== Resolve trainer from all available sources =====
  const resolveTrainer = (movement, kitReq) => {
    // Priority 1: employee_name stored directly on the movement
    if (movement.employeeName) return movement.employeeName;
    // Priority 2: kit request's trainerName field
    if (kitReq?.trainerName)   return kitReq.trainerName;
    return null;
  };

  const resolveTrainerForGroup = (g, kitReq) => {
    // Try first item's employee_name, then kit request
    for (const item of g.items) {
      const t = resolveTrainer(item, kitReq);
      if (t) return t;
    }
    return null;
  };

  // ===== Filtered movements =====
  const filteredMovements = useMemo(() => {
    return movements.filter((m) => {
      const kitReqId = m.kitRequestId || parseKitReqIdFromNotes(m.notes);
      const kitReq   = kitReqId ? kitRequestsMap[kitReqId] : null;

      if (searchEmployee.trim()) {
        const term       = searchEmployee.trim().toLowerCase();
        const emp        = (m.employeeName          || "").toLowerCase();
        const trRaw      = (kitReq?.trainerName     || "").toLowerCase();
        const empFull    = (usersMap[m.employeeName] || "").toLowerCase();
        const trFull     = (usersMap[kitReq?.trainerName] || "").toLowerCase();
        if (!emp.includes(term) && !trRaw.includes(term) && !empFull.includes(term) && !trFull.includes(term)) return false;
      }

      if (filterType && m.movementType !== filterType) return false;

      if (m.timestamp) {
        const d = new Date(m.timestamp);
        if (dateFrom) { const f = new Date(dateFrom); f.setHours(0,0,0,0); if (d < f) return false; }
        if (dateTo)   { const t = new Date(dateTo);   t.setHours(23,59,59,999); if (d > t) return false; }
      } else if (dateFrom || dateTo) return false;

      return true;
    });
  }, [movements, searchEmployee, filterType, dateFrom, dateTo, kitRequestsMap, usersMap]);

  // ===== Group movements that belong to same transaction (≤5s window) =====
  const groupedMovements = useMemo(() => {
    const groups = [];
    const sorted = [...filteredMovements].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    sorted.forEach((m) => {
      const mTime = m.timestamp ? new Date(m.timestamp).getTime() : 0;
      // Resolve kit request ID from the movement itself or from notes
      const kitReqId = m.kitRequestId || parseKitReqIdFromNotes(m.notes);

      const matchedGroup = groups.find((g) => {
        if (g.performedBy    !== m.performedBy)    return false;
        if (g.movementType   !== m.movementType)   return false;
        // For kit movements, group by same kit request
        if (kitReqId && g.kitReqId && g.kitReqId !== kitReqId) return false;
        const gTime = g.timestamp ? new Date(g.timestamp).getTime() : 0;
        return Math.abs(gTime - mTime) <= 5000;
      });

      if (matchedGroup) {
        matchedGroup.items.push(m);
      } else {
        groups.push({
          id: m.id,
          kitReqId,
          performedBy:  m.performedBy,
          movementType: m.movementType,
          notes:        m.notes,
          activityName: m.activityName,
          timestamp:    m.timestamp,
          items:        [m],
        });
      }
    });

    return groups;
  }, [filteredMovements]);

  // ===== Summary stats =====
  const stats = useMemo(() => {
    let total = 0, reductions = 0, returns = 0, issued = 0, returned = 0;
    // Count unique transactions
    const seen = new Set();
    movements.forEach((m) => {
      const key = `${m.performedBy}-${m.movementType}-${m.kitRequestId || m.notes}-${Math.floor(new Date(m.timestamp||0).getTime()/5000)}`;
      if (!seen.has(key)) {
        seen.add(key);
        total++;
        if (m.movementType === "MANUAL_REDUCTION") reductions++;
        else if (m.movementType === "MANUAL_RETURN")    returns++;
        else if (m.movementType === "ISSUE")             issued++;
        else if (m.movementType === "RETURN")            returned++;
      }
    });
    return { total, reductions, returns, issued, returned };
  }, [movements]);

  // ===== CSV Export =====
  const handleExportCSV = () => {
    const headers = ["Date","Time","Trainer","School","Course","Activity","Components","Quantity","Action","Processed By"];
    const rows = groupedMovements.map((g) => {
      const kitReq   = g.kitReqId ? kitRequestsMap[g.kitReqId] : null;
      const isManual = g.movementType === "MANUAL_REDUCTION" || g.movementType === "MANUAL_RETURN";
      const d        = new Date(g.timestamp);
      const rawTrainer = resolveTrainerForGroup(g, kitReq);
      const trainer  = rawTrainer ? (usersMap[rawTrainer] || rawTrainer) : "-";
      const school   = isManual ? "-" : (kitReq?.schoolName   || "-");
      const course   = isManual ? "-" : (kitReq?.courseName   || "-");
      const activity = isManual ? "-" : (g.activityName || kitReq?.activityName || "-");
      const isReturn = g.movementType === "RETURN" || g.movementType === "MANUAL_RETURN";
      const comps = g.items.map((item) => {
        const name = item.component?.componentName || item.component?.name || "Unknown";
        return `${name} (${isReturn ? "+" : "-"}${item.quantityChanged})`;
      }).join("; ");
      const qty    = g.items.reduce((s, i) => s + (i.quantityChanged || 0), 0);
      const action = isManual ? getManualReason(g.notes) : getActionLabel(g.movementType);
      return [formatDate(d), formatTime(d), trainer, school, course, activity, comps, qty, action, usersMap[g.performedBy] || g.performedBy || "-"];
    });
    const csv = "data:text/csv;charset=utf-8," + [
      headers.join(","),
      ...rows.map((r) => r.map((v) => `"${String(v).replace(/"/g,'""')}"`).join(","))
    ].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csv));
    link.setAttribute("download", `stock-movements-${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Exported successfully!");
  };

  // ===== Action badge =====
  const getActionBadge = (type) => {
    const cfg = {
      ISSUE:            { cls: "bg-blue-100 text-blue-800 border-blue-200",      label: "Issue Kit" },
      RETURN:           { cls: "bg-purple-100 text-purple-800 border-purple-200", label: "Return Kit" },
      MANUAL_REDUCTION: { cls: "bg-rose-100 text-rose-800 border-rose-200",      label: "Manual Reduction" },
      MANUAL_RETURN:    { cls: "bg-emerald-100 text-emerald-800 border-emerald-200", label: "Manual Return" },
    }[type] || { cls: "bg-gray-100 text-gray-700 border-gray-200", label: "Stock Adjustment" };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${cfg.cls}`}>
        {cfg.label}
      </span>
    );
  };

  return (
    <div className="p-6 space-y-6">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-800 tracking-tight">Stock Movement Log</h2>
          <p className="text-xs text-gray-400 mt-0.5">Complete record of all stock issues, returns, and manual adjustments</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadData}
            className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold px-4 py-2 rounded-lg text-xs shadow-sm transition">
            🔄 Refresh
          </button>
          <button onClick={handleExportCSV} disabled={groupedMovements.length === 0}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold px-4 py-2 rounded-lg text-xs shadow-sm transition flex items-center gap-1.5">
            📥 Export CSV
          </button>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Total Movements",   value: stats.total,      color: "text-slate-800" },
          { label: "Manual Reductions", value: stats.reductions, color: "text-rose-600" },
          { label: "Manual Returns",    value: stats.returns,    color: "text-emerald-600" },
          { label: "Issued Kits",       value: stats.issued,     color: "text-blue-600" },
          { label: "Returned Kits",     value: stats.returned,   color: "text-purple-600" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</span>
            <span className={`text-2xl font-black mt-1 block ${color}`}>{value}</span>
          </div>
        ))}
      </div>

      {/* FILTERS */}
      <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Search Trainer</label>
            <input type="text" placeholder="Type name or username..."
              className="w-full border border-gray-300 p-2.5 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
              value={searchEmployee} onChange={(e) => setSearchEmployee(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Action Type</label>
            <select className="w-full border border-gray-300 p-2.5 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
              value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="">All Types</option>
              <option value="ISSUE">Issue Kit</option>
              <option value="RETURN">Return Kit</option>
              <option value="MANUAL_REDUCTION">Manual Reduction</option>
              <option value="MANUAL_RETURN">Manual Return</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">From Date</label>
            <input type="date" className="w-full border border-gray-300 p-2.5 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
              value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">To Date</label>
            <input type="date" className="w-full border border-gray-300 p-2.5 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
              value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end">
          <button onClick={() => { setSearchEmployee(""); setFilterType(""); setDateFrom(""); setDateTo(""); }}
            className="bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold px-5 py-2 rounded-lg text-xs uppercase tracking-wider transition shadow-sm">
            Clear Filters
          </button>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl shadow overflow-hidden border border-gray-200">
        <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <h3 className="font-bold text-gray-700 text-sm">Movement Records</h3>
          <span className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-100 font-bold px-2.5 py-0.5 rounded-full">
            {groupedMovements.length} record{groupedMovements.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="p-3.5 font-bold text-gray-600 border-r border-gray-200 min-w-[130px]">Trainer</th>
                <th className="p-3.5 font-bold text-gray-600 border-r border-gray-200 min-w-[130px]">School</th>
                <th className="p-3.5 font-bold text-gray-600 border-r border-gray-200 min-w-[130px]">Course</th>
                <th className="p-3.5 font-bold text-gray-600 border-r border-gray-200 min-w-[120px]">Activity</th>
                <th className="p-3.5 font-bold text-gray-600 border-r border-gray-200 min-w-[200px]">Components</th>
                <th className="p-3.5 font-bold text-gray-600 border-r border-gray-200 w-20 text-center">Qty</th>
                <th className="p-3.5 font-bold text-gray-600 border-r border-gray-200 min-w-[140px]">Action</th>
                <th className="p-3.5 font-bold text-gray-600 border-r border-gray-200 min-w-[120px]">Processed By</th>
                <th className="p-3.5 font-bold text-gray-600 border-r border-gray-200 w-28">Date</th>
                <th className="p-3.5 font-bold text-gray-600 w-18">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan="10" className="text-center p-12 text-gray-400 italic">Loading movements...</td></tr>
              ) : groupedMovements.length === 0 ? (
                <tr><td colSpan="10" className="text-center p-12 text-gray-400 italic">No movement records found.</td></tr>
              ) : (
                groupedMovements.map((g) => {
                  const kitReq   = g.kitReqId ? kitRequestsMap[g.kitReqId] : null;
                  const isManual = g.movementType === "MANUAL_REDUCTION" || g.movementType === "MANUAL_RETURN";
                  const isReturn = g.movementType === "RETURN" || g.movementType === "MANUAL_RETURN";

                  const d = new Date(g.timestamp);

                  // === Trainer resolution: 3 layers ===
                  const rawTrainer    = resolveTrainerForGroup(g, kitReq);
                  const trainerDisplay = rawTrainer ? (usersMap[rawTrainer] || rawTrainer) : "-";
                  const trainerSub     = rawTrainer && usersMap[rawTrainer] && usersMap[rawTrainer] !== rawTrainer
                    ? rawTrainer : null;

                  const school   = isManual ? "-" : (kitReq?.schoolName   || "-");
                  const course   = isManual ? "-" : (kitReq?.courseName   || "-");
                  const activity = isManual ? "-" : (g.activityName || kitReq?.activityName || "-");

                  const totalQty = g.items.reduce((s, i) => s + (i.quantityChanged || 0), 0);

                  // Action: kit movements → clean label; manual → actual reason
                  const actionText = isManual
                    ? getManualReason(g.notes)
                    : getActionLabel(g.movementType);

                  return (
                    <tr
                      key={g.id}
                      onClick={() => { setSelectedGroup({ g, kitReq, isManual, isReturn }); setDetailModalOpen(true); }}
                      className="hover:bg-indigo-50/30 transition-colors cursor-pointer"
                    >
                      {/* Trainer */}
                      <td className="p-3.5 border-r border-gray-100">
                        {rawTrainer ? (
                          <>
                            <div className="font-semibold text-gray-900">{trainerDisplay}</div>
                            {trainerSub && <div className="text-[10px] text-gray-400 font-mono mt-0.5">{trainerSub}</div>}
                          </>
                        ) : (
                          <span className="text-gray-400 italic text-xs">—</span>
                        )}
                      </td>

                      {/* School */}
                      <td className="p-3.5 border-r border-gray-100 text-gray-700 font-medium text-xs">
                        {school !== "-" ? school : <span className="text-gray-300">—</span>}
                      </td>

                      {/* Course */}
                      <td className="p-3.5 border-r border-gray-100 text-gray-700 text-xs font-semibold">
                        {course !== "-" ? course : <span className="text-gray-300">—</span>}
                      </td>

                      {/* Activity */}
                      <td className="p-3.5 border-r border-gray-100 text-gray-700 font-semibold text-xs">
                        {activity !== "-" ? (
                          <div>
                            <div>{activity}</div>
                            {g.kitReqId && (
                              <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                {fmtKrId(g.kitReqId)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>

                      {/* Components */}
                      <td className="p-3.5 border-r border-gray-100">
                        <div className="space-y-1">
                          {g.items.map((item, idx) => {
                            const name = item.component?.componentName || item.component?.name || "Unknown";
                            const qty  = item.quantityChanged;
                            return (
                              <div key={idx} className="flex justify-between items-center bg-gray-50 px-2 py-0.5 rounded border border-gray-100 text-xs">
                                <span className="font-medium text-gray-800">{name}</span>
                                <span className={`font-bold font-mono ml-2 ${isReturn ? "text-emerald-600" : "text-rose-600"}`}>
                                  {isReturn ? `+${qty}` : `-${qty}`}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </td>

                      {/* Quantity */}
                      <td className="p-3.5 border-r border-gray-100 text-center font-bold font-mono text-gray-900">
                        {totalQty}
                      </td>

                      {/* Action */}
                      <td className="p-3.5 border-r border-gray-100">
                        {getActionBadge(g.movementType)}
                        {isManual && actionText && actionText !== "-" && (
                          <div className="text-[10px] text-gray-500 mt-1 italic">{actionText}</div>
                        )}
                      </td>

                      {/* Processed By */}
                      <td className="p-3.5 border-r border-gray-100">
                        <div className="font-medium text-gray-700">{usersMap[g.performedBy] || g.performedBy || "-"}</div>
                        {g.performedBy && usersMap[g.performedBy] && usersMap[g.performedBy] !== g.performedBy && (
                          <div className="text-[10px] text-gray-400 font-mono mt-0.5">{g.performedBy}</div>
                        )}
                      </td>

                      {/* Date */}
                      <td className="p-3.5 border-r border-gray-100 font-mono text-xs font-medium text-gray-600">
                        {formatDate(d)}
                      </td>

                      {/* Time */}
                      <td className="p-3.5 font-mono text-xs font-medium text-gray-500">
                        {formatTime(d)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== DETAIL MODAL ===== */}
      {detailModalOpen && selectedGroup && (() => {
        const { g, kitReq, isManual, isReturn } = selectedGroup;
        const rawTrainer    = resolveTrainerForGroup(g, kitReq);
        const trainerDisplay = rawTrainer ? (usersMap[rawTrainer] || rawTrainer) : "-";
        const school   = isManual ? "-" : (kitReq?.schoolName   || "-");
        const course   = isManual ? "-" : (kitReq?.courseName   || "-");
        const activity = isManual ? "-" : (g.activityName || kitReq?.activityName || "-");
        const d = new Date(g.timestamp);
        const totalQty = g.items.reduce((s, i) => s + (i.quantityChanged || 0), 0);

        return (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
              {/* Header */}
              <div className="flex justify-between items-center border-b border-gray-200 p-5">
                <div>
                  <div className="flex items-center gap-2">
                    {getActionBadge(g.movementType)}
                    {g.kitReqId && (
                      <span className="text-xs font-bold font-mono text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                        {fmtKrId(g.kitReqId)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{formatDate(d)} at {formatTime(d)}</p>
                </div>
                <button onClick={() => setDetailModalOpen(false)} className="text-gray-400 hover:text-gray-700 font-black text-2xl">×</button>
              </div>

              {/* Detail Grid */}
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {[
                    { label: "Trainer",      value: trainerDisplay },
                    { label: "School",       value: school   },
                    { label: "Course",       value: course   },
                    { label: "Activity",     value: activity },
                    { label: "Processed By", value: usersMap[g.performedBy] || g.performedBy || "-" },
                    { label: "Total Qty",    value: String(totalQty) },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                      <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">{label}</span>
                      <span className={`font-semibold ${value === "-" ? "text-gray-400 italic" : "text-gray-900"}`}>{value}</span>
                    </div>
                  ))}
                </div>

                {/* Action / Reason */}
                {isManual && (
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                    <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Reason</span>
                    <span className="font-semibold text-gray-900">{getManualReason(g.notes)}</span>
                  </div>
                )}

                {/* Components breakdown */}
                <div>
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Components</h4>
                  <div className="space-y-1.5">
                    {g.items.map((item, idx) => {
                      const name = item.component?.componentName || item.component?.name || "Unknown";
                      const qty  = item.quantityChanged;
                      return (
                        <div key={idx} className="flex justify-between items-center bg-white border border-gray-200 rounded-lg px-3 py-2">
                          <span className="font-semibold text-gray-800 text-sm">{name}</span>
                          <span className={`font-bold font-mono text-sm ${isReturn ? "text-emerald-600" : "text-rose-600"}`}>
                            {isReturn ? `+${qty}` : `-${qty}`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-100 px-5 py-3 flex justify-end">
                <button onClick={() => setDetailModalOpen(false)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2 rounded-lg text-sm transition">
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}

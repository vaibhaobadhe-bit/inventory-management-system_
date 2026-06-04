import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { apiFetch } from "../utils/api";

export default function MyKits() {
  const [kits, setKits] = useState([]);
  const [loading, setLoading] = useState(true);

  // ===== Modals Control =====
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedKit, setSelectedKit] = useState(null);
  const [mappedComponents, setMappedComponents] = useState([]);
  const [loadingComponents, setLoadingComponents] = useState(false);

  // Quick Issue Modal Control
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [issueTitle, setIssueTitle] = useState("");
  const [issueDesc, setIssueDesc] = useState("");
  const [submittingIssue, setSubmittingIssue] = useState(false);

  const currentUserUsername = localStorage.getItem("username") || "anonymous";

  const loadKits = () => {
    setLoading(true);
    apiFetch("/api/kit-requests/my")
      .then((res) => res.json())
      .then((data) => {
        setKits(Array.isArray(data) ? data : []);
      })
      .catch(() => toast.error("Failed to load your kits"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadKits();
  }, []);

  // Fetch components mapped to an activity
  const handleOpenDetails = (kit) => {
    setSelectedKit(kit);
    setDetailsModalOpen(true);

    const activityId = kit.activity?.id;
    if (!activityId) {
      setMappedComponents([]);
      return;
    }

    setLoadingComponents(true);
    apiFetch(`/api/components/mappings/activity/${activityId}`)
      .then((res) => res.json())
      .then((data) => {
        setMappedComponents(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        setMappedComponents([]);
        toast.error("Failed to load component mapping details");
      })
      .finally(() => setLoadingComponents(false));
  };

  // Request kit return
  const handleRequestReturn = async (id) => {
    try {
      const res = await apiFetch(`/api/kit-requests/return/${id}`, {
        method: "PUT",
      });

      if (res.ok) {
        toast.success("Return request submitted successfully!");
        loadKits();
      } else {
        const text = await res.text();
        toast.error(text || "Failed to request return.");
      }
    } catch {
      toast.error("Connection error. Please try again.");
    }
  };

  // Submit quick issue from kit
  const handleRaiseIssue = (kit) => {
    setSelectedKit(kit);
    setIssueTitle(`Issue with ${kit.activityName || "Kit"} at ${kit.schoolName}`);
    setIssueDesc("");
    setIssueModalOpen(true);
  };

  const handleSubmittingIssue = async (e) => {
    e.preventDefault();
    if (!issueTitle.trim() || !issueDesc.trim() || !selectedKit) return;

    setSubmittingIssue(true);
    try {
      const payload = {
        title: JSON.stringify({
          title: issueTitle.trim(),
          category: "Kit Issue",
          priority: "Medium",
          description: issueDesc.trim(),
          course: selectedKit.courseName || "",
          activity: selectedKit.activityName || "",
          component: "",
          createdBy: currentUserUsername,
          createdDate: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
          assignedTo: "",
          comments: [
            {
              timestamp: new Date().toISOString(),
              user: "System Log",
              text: `Issue raised from My Kits portal by trainer ${currentUserUsername}`
            }
          ]
        }),
        status: "OPEN"
      };

      const res = await apiFetch("/api/issues", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success("Issue ticket reported successfully!");
        setIssueModalOpen(false);
      } else {
        toast.error("Failed to raise issue ticket.");
      }
    } catch {
      toast.error("Connection error reporting issue.");
    } finally {
      setSubmittingIssue(false);
    }
  };

  const getStatusBadge = (status) => {
    const s = (status ?? "").toUpperCase();
    switch (s) {
      case "PENDING":
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">Pending</span>;
      case "APPROVED":
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">Approved</span>;
      case "ISSUED":
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">Issued</span>;
      case "RETURN_REQUESTED":
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">Return Requested</span>;
      case "RETURNED":
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-800 border border-teal-200">Returned</span>;
      case "REJECTED":
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">Rejected</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 border border-gray-200">{status}</span>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-800 tracking-tight">My Kits Tracker</h2>
          <p className="text-xs text-gray-400">Complete traceability of your requested course assets and training items</p>
        </div>
        <button
          onClick={loadKits}
          className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold px-4 py-2 rounded-lg text-xs shadow-sm transition"
        >
          🔄 Refresh
        </button>
      </div>

      {/* ASSET TRACKING TABLE */}
      <div className="bg-white rounded-xl shadow overflow-hidden border border-gray-150">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-3.5 font-bold text-gray-700 border-r min-w-[150px]">School</th>
                <th className="p-3.5 font-bold text-gray-700 border-r min-w-[150px]">Course</th>
                <th className="p-3.5 font-bold text-gray-700 border-r min-w-[130px]">Activity</th>
                <th className="p-3.5 font-bold text-gray-700 border-r w-32">Request Date</th>
                <th className="p-3.5 font-bold text-gray-700 border-r w-32">Issue Date</th>
                <th className="p-3.5 font-bold text-gray-700 border-r w-28 text-center">Status</th>
                <th className="p-3.5 font-bold text-gray-700 w-80 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-150">
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center p-12 text-gray-400 italic">
                    Loading your kit requests...
                  </td>
                </tr>
              ) : kits.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center p-12 text-gray-400 italic">
                    No kit requests logged under your profile.
                  </td>
                </tr>
              ) : (
                kits.map((k) => {
                  const hasIssueDate = k.status === "ISSUED" || k.status === "RETURNED" || k.status === "RETURN_REQUESTED";
                  return (
                    <tr key={k.id} className="hover:bg-gray-50/50 transition-colors text-xs">
                      {/* School */}
                      <td className="p-3.5 border-r font-bold text-gray-800">
                        {k.schoolName || "-"}
                      </td>

                      {/* Course */}
                      <td className="p-3.5 border-r font-medium text-gray-700">
                        {k.courseName || "-"}
                      </td>

                      {/* Activity */}
                      <td className="p-3.5 border-r font-semibold text-indigo-950">
                        {k.activityName || "-"}
                      </td>

                      {/* Request Date */}
                      <td className="p-3.5 border-r font-mono text-gray-500">
                        {k.requiredDate || "-"}
                      </td>

                      {/* Issue Date */}
                      <td className="p-3.5 border-r font-mono text-gray-500">
                        {hasIssueDate ? k.requiredDate : "-"}
                      </td>

                      {/* Status */}
                      <td className="p-3.5 border-r text-center">
                        {getStatusBadge(k.status)}
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-center">
                        <div className="flex gap-2 justify-center flex-wrap">
                          <button
                            onClick={() => handleOpenDetails(k)}
                            className="bg-indigo-50 hover:bg-indigo-100 border border-indigo-150 text-indigo-700 font-bold px-3 py-1.5 rounded transition text-[11px]"
                          >
                            View Details
                          </button>
                          
                          <button
                            onClick={() => handleRaiseIssue(k)}
                            className="bg-rose-50 hover:bg-rose-100 border border-rose-150 text-rose-700 font-bold px-3 py-1.5 rounded transition text-[11px]"
                          >
                            Raise Issue
                          </button>

                          {k.status === "ISSUED" && (
                            <button
                              onClick={() => handleRequestReturn(k.id)}
                              className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-3 py-1.5 rounded transition text-[11px] shadow-sm"
                            >
                              Request Return
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* VIEW DETAILS MODAL DRAWER */}
      {detailsModalOpen && selectedKit && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow w-full max-w-lg p-6 animate-in fade-in-50 duration-200">
            <div className="flex justify-between items-center border-b pb-3 mb-4">
              <div>
                <h4 className="text-lg font-bold text-gray-800">Kit Components Details</h4>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5">Asset Mappings Audit</p>
              </div>
              <button
                type="button"
                onClick={() => setDetailsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-black text-lg"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              {/* Context description grid */}
              <div className="bg-slate-50 border p-3.5 rounded-lg text-xs grid grid-cols-2 gap-y-2 gap-x-4">
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase">School</span>
                  <span className="font-semibold text-slate-800">{selectedKit.schoolName || "-"}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase">Status</span>
                  <div>{getStatusBadge(selectedKit.status)}</div>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase">Course</span>
                  <span className="font-semibold text-slate-800">{selectedKit.courseName || "-"}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase">Activity</span>
                  <span className="font-semibold text-slate-800">{selectedKit.activityName || "-"}</span>
                </div>
              </div>

              {/* Mapped Components List */}
              <div className="space-y-2">
                <span className="block text-xs font-bold text-gray-600 uppercase tracking-wider">Required Kit Parts</span>
                <div className="border rounded-lg divide-y bg-white max-h-[180px] overflow-y-auto pr-1">
                  {loadingComponents ? (
                    <p className="text-gray-400 text-xs italic text-center py-6">Loading mapped components...</p>
                  ) : mappedComponents.length === 0 ? (
                    <p className="text-gray-400 text-xs italic text-center py-6">No specific components mapped to this activity.</p>
                  ) : (
                    mappedComponents.map((ac) => {
                      const name = ac.component?.name || ac.component?.componentName || "Unknown Component";
                      return (
                        <div key={ac.id} className="p-3 text-xs flex justify-between items-center hover:bg-slate-50/50">
                          <span className="font-semibold text-slate-800">{name}</span>
                          <span className="bg-slate-100 border text-slate-700 px-2 py-0.5 rounded font-mono font-bold">
                            Qty Mapped: {ac.quantityRequired || 1}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-6 pt-3 border-t">
              <button
                type="button"
                onClick={() => setDetailsModalOpen(false)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2.5 rounded-lg text-xs transition shadow-sm"
              >
                Close details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK TICKET / RAISE ISSUE MODAL */}
      {issueModalOpen && selectedKit && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow w-full max-w-lg p-6 animate-in fade-in-50 duration-200">
            <div className="flex justify-between items-center border-b pb-3 mb-4">
              <div>
                <h4 className="text-lg font-bold text-gray-800">Report Support Issue</h4>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5">Quick Ticket Creation</p>
              </div>
              <button
                type="button"
                onClick={() => setIssueModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-black text-lg"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmittingIssue} className="space-y-4">
              {/* Prepopulated contexts */}
              <div className="bg-slate-50 border p-3 rounded-lg text-[10px] space-y-1 text-slate-600">
                <p><span className="font-bold">Linked Course:</span> {selectedKit.courseName}</p>
                <p><span className="font-bold">Linked Activity:</span> {selectedKit.activityName}</p>
                <p><span className="font-bold">Support Category:</span> Kit Issue (Default)</p>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Issue Summary *</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 p-2.5 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 font-medium"
                  value={issueTitle}
                  onChange={(e) => setIssueTitle(e.target.value)}
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Description *</label>
                <textarea
                  className="w-full border border-gray-300 p-2.5 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 font-medium"
                  rows={4}
                  placeholder="Detail the problem (e.g. buzzer damaged, wire missing)..."
                  value={issueDesc}
                  onChange={(e) => setIssueDesc(e.target.value)}
                  required
                />
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIssueModalOpen(false)}
                  disabled={submittingIssue}
                  className="border px-4 py-2.5 rounded-lg hover:bg-gray-50 transition text-xs font-semibold text-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingIssue}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg transition text-xs font-bold shadow-sm"
                >
                  {submittingIssue ? "Reporting..." : "Submit Ticket"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

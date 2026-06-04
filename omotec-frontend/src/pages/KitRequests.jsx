import { useState, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import { apiFetch } from "../utils/api";
import Badge from "../components/Badge";

function statusToTone(status) {
  const s = (status ?? "").toUpperCase();
  if (s === "PENDING") return "amber";
  if (s === "APPROVED") return "green";
  if (s === "ISSUED") return "blue";
  if (s === "RETURN_REQUESTED") return "purple";
  if (s === "RETURNED") return "teal";
  if (s === "REJECTED") return "red";
  return "gray";
}

function normalizeRole(r) {
  const x = String(r ?? "").trim().toLowerCase(); 
  if (x === "trainer") return "TRAINER";
  if (x === "inventory") return "INVENTORY";
  if (x === "manager") return "MANAGER";
  if (x === "trainers") return "TRAINER";
  return "";
}


export default function KitRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");

  const [users, setUsers] = useState([]);

  const loadRequests = () => {
    setLoading(true);
    Promise.all([
      apiFetch("/api/kit-requests"),
      apiFetch("/api/users")
    ])
      .then(async ([reqsRes, usersRes]) => {
        const reqsData = await reqsRes.json();
        const usersData = await usersRes.json();

        setRequests(Array.isArray(reqsData) ? reqsData : []);
        setUsers(Array.isArray(usersData) ? usersData : []);
      })
      .catch(() => toast.error("Failed to load kit requests or users list"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const usersMap = useMemo(() => {
    const map = {};
    users.forEach((u) => {
      map[u.username] = u.fullName || u.username;
    });
    return map;
  }, [users]);

  const handleAction = async (id, action) => {
    try {
      const res = await apiFetch(`/api/kit-requests/${id}?action=${action}`, {
        method: "PUT",
      });


      if (res.ok) {
        toast.success(`Request ${action}d successfully!`);
        loadRequests();
      } else {
        const errorText = await res.text();
        toast.error(errorText || `Failed to ${action} request.`);
      }
    } catch {
      toast.error("Connection error. Please try again.");
    }
  };

  const filteredRequests = requests.filter((r) => {
    if (filter === "ALL") return true;
    return r.status === filter;
  });

  return (
    <div className="p-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Kit Requests</h2>
          <p className="text-gray-500 text-sm">Review, approve, reject, or issue trainer kit requests</p>
        </div>

        <button
          onClick={loadRequests}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition text-sm font-semibold shadow"
        >
          Refresh Data
        </button>
      </div>

      {/* FILTER TABS */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-6 border-b">
        {["ALL", "PENDING", "APPROVED", "ISSUED", "RETURNED", "REJECTED"].map((tab) => (

          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition ${
              filter === tab
                ? "bg-indigo-100 text-indigo-800"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* DATA TABLE */}
      <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 overflow-x-auto">
        {loading ? (
          <p className="text-gray-500 text-center py-6">Loading requests...</p>
        ) : filteredRequests.length === 0 ? (
          <p className="text-gray-500 text-center py-6">No requests found matching your filter</p>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-700 uppercase text-xs font-semibold border-b">
                <th className="p-3 text-left">Trainer</th>
                <th className="p-3 text-left">School</th>
                <th className="p-3 text-left">Course / Activity</th>
                <th className="p-3 text-left">Qty</th>
                <th className="p-3 text-left">Required Date</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map((r) => (
                <tr key={r.id} className="border-b hover:bg-gray-50 transition text-sm text-gray-800">
                  <td className="p-3 font-semibold">{usersMap[r.trainerName] || r.trainerName || "Unknown"}</td>
                  <td className="p-3">{r.schoolName || "-"}</td>
                  <td className="p-3 font-medium">
                    {r.courseName} <span className="text-xs text-gray-500 font-normal">({r.activityName})</span>
                  </td>
                  <td className="p-3 font-bold">{r.quantity}</td>
                  <td className="p-3">{r.requiredDate || "-"}</td>
                  <td className="p-3">
                    <Badge text={r.status} tone={statusToTone(r.status)} />
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex gap-2 justify-end">
                      {r.status === "PENDING" && (
                        <>
                          <button
                            onClick={() => handleAction(r.id, "approve")}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleAction(r.id, "reject")}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {r.status === "APPROVED" && (
                        <button
                          onClick={() => handleAction(r.id, "issue")}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                        >
                          Issue Kit
                        </button>
                      )}
                      {r.status === "ISSUED" && (
                        <button
                          onClick={() => handleAction(r.id, "confirmReturn")}
                          className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                        >
                          Return
                        </button>
                      )}


                      {r.status === "ISSUED" && (
                        <span className="text-xs text-gray-400 italic">Awaiting return request approval</span>
                      )}



                      {!["PENDING", "APPROVED", "RETURN_REQUESTED", "ISSUED"].includes(r.status) && (
                        <span className="text-gray-400 text-xs italic">No actions pending</span>
                      )}

                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

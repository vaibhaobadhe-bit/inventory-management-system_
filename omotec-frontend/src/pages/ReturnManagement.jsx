import { useState, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import { apiFetch } from "../utils/api";
import Badge from "../components/Badge";

export default function ReturnManagement() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const [users, setUsers] = useState([]);

  const loadReturns = () => {
    setLoading(true);
    Promise.all([
      apiFetch("/api/kit-requests"),
      apiFetch("/api/users")
    ])
      .then(async ([reqsRes, usersRes]) => {
        const reqsData = await reqsRes.json();
        const usersData = await usersRes.json();

        if (Array.isArray(reqsData)) {
          setRequests(reqsData.filter((r) => ["RETURN_REQUESTED", "RETURNED"].includes(r.status)));
        } else {
          setRequests([]);
        }
        if (Array.isArray(usersData)) {
          setUsers(usersData);
        }
      })
      .catch(() => toast.error("Failed to load return requests or users list"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadReturns();
  }, []);

  const usersMap = useMemo(() => {
    const map = {};
    users.forEach((u) => {
      map[u.username] = u.fullName || u.username;
    });
    return map;
  }, [users]);

  const handleConfirmReturn = async (id) => {
    try {
      const res = await apiFetch(`/api/kit-requests/${id}?action=confirmReturn`, {
        method: "PUT",
      });

      if (res.ok) {
        toast.success("Return confirmed and inventory inventory reconciled!");
        loadReturns();
      } else {
        const errorText = await res.text();
        toast.error(errorText || "Failed to confirm return.");
      }
    } catch {
      toast.error("Connection error. Please try again.");
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Return Management</h2>
          <p className="text-gray-500 text-sm">Process kit returns and reconcile system stocks automatically</p>
        </div>

        <button
          onClick={loadReturns}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition text-sm font-semibold shadow"
        >
          Refresh
        </button>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 overflow-x-auto">
        {loading ? (
          <p className="text-gray-500 text-center py-6">Loading returns...</p>
        ) : requests.length === 0 ? (
          <p className="text-gray-500 text-center py-6">No return records found</p>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-700 uppercase text-xs font-semibold border-b">
                <th className="p-3 text-left">Trainer</th>
                <th className="p-3 text-left">School</th>
                <th className="p-3 text-left">Kit / Course</th>
                <th className="p-3 text-left">Return Qty</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} className="border-b hover:bg-gray-50 transition text-sm text-gray-800">
                  <td className="p-3 font-semibold">{usersMap[r.trainerName] || r.trainerName || "Unknown"}</td>
                  <td className="p-3">{r.schoolName || "-"}</td>
                  <td className="p-3 font-medium">
                    {r.courseName} <span className="text-xs text-gray-500 font-normal">({r.activityName})</span>
                  </td>
                  <td className="p-3 font-bold">{r.quantity}</td>
                  <td className="p-3">
                    <Badge
                      text={r.status === "RETURN_REQUESTED" ? "RETURN PENDING" : "RETURNED"}
                      tone={r.status === "RETURN_REQUESTED" ? "purple" : "teal"}
                    />
                  </td>
                  <td className="p-3 text-right">
                    {r.status === "RETURN_REQUESTED" ? (
                      <button
                        onClick={() => handleConfirmReturn(r.id)}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-xs font-semibold transition shadow hover:shadow-md"
                      >
                        Confirm Return
                      </button>
                    ) : (
                      <span className="text-green-600 text-xs font-semibold">✓ Complete</span>
                    )}
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

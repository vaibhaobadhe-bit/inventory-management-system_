import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { apiFetch } from "../utils/api";

const ROLE_OPTIONS = ["MANAGER", "INVENTORY", "TRAINER"];

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState("create"); // create | edit

  const [editingId, setEditingId] = useState(null);

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("MANAGER");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/users");
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load users");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const full = (u.fullName ?? "").toString().toLowerCase();
      const uname = (u.username ?? "").toString().toLowerCase();
      const mail = (u.email ?? "").toString().toLowerCase();
      const phoneText = (u.phone ?? "").toString().toLowerCase();
      const r = (u.role ?? "").toString().toLowerCase();
      return (
        full.includes(q) ||
        uname.includes(q) ||
        mail.includes(q) ||
        phoneText.includes(q) ||
        r.includes(q)
      );
    });
  }, [users, search]);

  const resetForm = () => {
    setEditingId(null);
    setFormMode("create");
    setFullName("");
    setUsername("");
    setPassword("");
    setRole("MANAGER");
    setEmail("");
    setPhone("");
  };

  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (u) => {
    setEditingId(u.id);
    setFormMode("edit");
    setFullName(u.fullName ?? "");
    setUsername(u.username ?? "");
    setPassword(""); // optional on update
    setRole(u.role ?? "MANAGER");
    setEmail(u.email ?? "");
    setPhone(u.phone ?? "");
    setShowForm(true);
  };

  const validate = () => {
    const uname = username.trim();
    if (!uname) return "Username is required";

    if (formMode === "create") {
      if (!password.trim()) return "Password is required";
    }

    const r = (role ?? "").toString().trim().toUpperCase();
    if (!ROLE_OPTIONS.includes(r)) return "Invalid role";

    if (!fullName.trim()) return "Full Name is required";

    const emailVal = email.trim();
    if (!emailVal) return "Email is required";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailVal)) return "Invalid email format";

    const phoneVal = phone.trim();
    if (!phoneVal) return "Phone number is required";
    const phoneRegex = /^\+?[0-9]{10,15}$/;
    if (!phoneRegex.test(phoneVal)) return "Phone number must be between 10 and 15 digits";

    return null;
  };

  const saveUser = async () => {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }

    try {
      let res;
      if (formMode === "create") {
        res = await apiFetch("/api/users", {
          method: "POST",
          body: JSON.stringify({
            fullName,
            username,
            password,
            role,
            email,
            phone,
          }),
        });
      } else {
        res = await apiFetch(`/api/users/${editingId}`, {
          method: "PUT",
          body: JSON.stringify({
            fullName,
            username,
            // password optional; only send when provided
            ...(password.trim() ? { password } : {}),
            role,
            email,
            phone,
          }),
        });
      }

      if (res.ok) {
        toast.success(formMode === "create" ? "User created" : "User updated");
        setShowForm(false);
        resetForm();
        loadUsers();
      } else {
        const errorText = await res.text();
        toast.error(errorText || "Save failed");
      }
    } catch {
      toast.error("Save failed");
    }
  };

  const deleteUser = async (id) => {
    if (!window.confirm("Delete this user?")) return;
    try {
      const res = await apiFetch(`/api/users/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("User deleted");
        loadUsers();
      } else {
        const text = await res.text();
        toast.error(text || "Delete failed");
      }
    } catch {
      toast.error("Delete failed");
    }
  };

  const toggleActive = async (id, active) => {
    try {
      const res = await apiFetch(`/api/users/toggle/${id}?active=${active}`, { method: "PUT" });
      if (res.ok) {
        toast.success(active ? "User activated" : "User deactivated");
        loadUsers();
      } else {
        const text = await res.text();
        toast.error(text || "Toggle failed");
      }
    } catch {
      toast.error("Toggle failed");
    }
  };

  const getStatusLabel = (u) => {
    const active = u.isActive;
    if (active === undefined || active === null) return "Active";
    return active ? "Active" : "Inactive";
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold">Users</h2>
          <p className="text-sm text-gray-500">Manage enterprise users</p>
        </div>

        <button onClick={openCreate} className="bg-indigo-600 text-white px-4 py-2 rounded">
          Add User
        </button>
      </div>

      <div className="mb-4">
        <input
          placeholder="Search users..."
          className="border p-2 rounded w-full"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {showForm && (
        <div className="bg-gray-100 p-4 rounded mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              placeholder="Full Name"
              className="border p-2 rounded"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
            <input
              placeholder="Username"
              className="border p-2 rounded"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />

            <select
              className="border p-2 rounded"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>

            <input
              placeholder="Email"
              className="border p-2 rounded"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <input
              placeholder="Phone"
              className="border p-2 rounded"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />

            {formMode === "create" ? (
              <input
                type="password"
                placeholder="Password"
                className="border p-2 rounded"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            ) : (
              <input
                type="password"
                placeholder="New password (optional)"
                className="border p-2 rounded"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            )}
          </div>

          <div className="mt-4 flex gap-2">
            <button onClick={saveUser} className="bg-green-600 text-white px-4 py-2 rounded">
              {formMode === "create" ? "Save" : "Update"}
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              className="bg-gray-400 text-white px-4 py-2 rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-xl shadow">
        <h3 className="font-semibold mb-4">User List</h3>

        {loading ? (
          <div className="text-gray-500">Loading...</div>
        ) : (
          <table className="w-full border">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 border text-left">Full Name</th>
                <th className="p-3 border text-left">Username</th>
                <th className="p-3 border text-left">Role</th>
                <th className="p-3 border text-left">Email</th>
                <th className="p-3 border text-left">Phone</th>
                <th className="p-3 border text-left">Status</th>
                <th className="p-3 border text-left">Action</th>
              </tr>
            </thead>

            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center p-6 text-gray-500">
                    No users found
                  </td>
                </tr>
              ) : (
                filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="p-3 border">{u.fullName ?? "-"}</td>
                    <td className="p-3 border">{u.username ?? "-"}</td>
                    <td className="p-3 border">{u.role ?? "-"}</td>
                    <td className="p-3 border">{u.email ?? "-"}</td>
                    <td className="p-3 border">{u.phone ?? "-"}</td>
                    <td className="p-3 border">{getStatusLabel(u)}</td>
                    <td className="p-3 border">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => toggleActive(u.id, !(u.isActive ?? true))}
                          className="px-2 py-1 rounded text-white bg-purple-600"
                        >
                          {(u.isActive ?? true) ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          onClick={() => openEdit(u)}
                          className="px-2 py-1 rounded text-white bg-yellow-500"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteUser(u.id)}
                          className="px-2 py-1 rounded text-white bg-red-600"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}


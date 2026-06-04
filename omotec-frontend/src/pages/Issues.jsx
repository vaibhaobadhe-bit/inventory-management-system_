import { useState, useEffect, useMemo } from "react";
import { apiFetch } from "../utils/api";
import toast from "react-hot-toast";

// Simplified status/category/priority lists
const STATUSES   = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];
const CATEGORIES = [
  "Inventory Issue",
  "Kit Issue",
  "Component Missing",
  "Component Damaged",
  "School Issue",
  "Technical Issue",
  "Other",
];
const PRIORITIES = ["Low", "Medium", "High", "Critical"];

// Format issue ID as TKT-0001
const formatTicketId = (id) => `TKT-${String(id).padStart(4, "0")}`;

// Human-readable status label
const STATUS_LABELS = {
  OPEN:        "Open",
  IN_PROGRESS: "In Progress",
  RESOLVED:    "Resolved",
  CLOSED:      "Closed",
  // Legacy value – keep rendering gracefully
  WAITING_FOR_RESPONSE: "Waiting",
};

export default function Issues() {
  // ===== Auth =====
  const currentUserUsername = localStorage.getItem("username") || "anonymous";
  const currentUserRoleRaw  = localStorage.getItem("role")     || "Manager";

  const normalizeRole = (r) => {
    if (!r) return "Manager";
    const x = String(r).trim().toLowerCase();
    if (x === "trainer")   return "Trainer";
    if (x === "inventory") return "Inventory";
    if (x === "manager")   return "Manager";
    if (x === "trainers")  return "Trainer";
    return "Manager";
  };
  const role = normalizeRole(currentUserRoleRaw);

  // ===== State =====
  const [issues,         setIssues]         = useState([]);
  const [trainers,       setTrainers]       = useState([]);
  const [inventoryUsers, setInventoryUsers] = useState([]);
  const [courses,        setCourses]        = useState([]);
  const [activities,     setActivities]     = useState([]);
  const [components,     setComponents]     = useState([]);
  const [usersMap,       setUsersMap]       = useState({});

  // ===== Filter State =====
  const [search,          setSearch]          = useState("");
  const [filterStatus,    setFilterStatus]    = useState("");
  const [filterPriority,  setFilterPriority]  = useState("");
  const [filterCategory,  setFilterCategory]  = useState("");
  const [filterAssignedTo,setFilterAssignedTo]= useState("");
  const [filterDateFrom,  setFilterDateFrom]  = useState("");
  const [filterDateTo,    setFilterDateTo]    = useState("");
  const [activeTab,       setActiveTab]       = useState("ALL");

  // ===== Modal State =====
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedIssue,   setSelectedIssue]   = useState(null);

  // ===== Create Form =====
  const [formTitle,       setFormTitle]       = useState("");
  const [formCategory,    setFormCategory]    = useState("Other");
  const [formPriority,    setFormPriority]    = useState("Low");
  const [formDescription, setFormDescription] = useState("");
  const [formCourse,      setFormCourse]      = useState("");
  const [formActivity,    setFormActivity]    = useState("");
  const [formComponent,   setFormComponent]   = useState("");
  const [formSubmitting,  setFormSubmitting]  = useState(false);

  // ===== Action State =====
  const [newComment,       setNewComment]       = useState("");
  const [actionSubmitting, setActionSubmitting] = useState(false);

  // ===== Load Data =====
  const loadIssues = async () => {
    try {
      const res = await apiFetch("/api/issues");
      if (res.ok) {
        const data = await res.json();
        setIssues((Array.isArray(data) ? data : []).map(parseIssue));
      }
    } catch (err) {
      console.error("Error loading issues", err);
    }
  };

  const loadMasters = () => {
    apiFetch("/api/courses")
      .then((r) => r.json())
      .then((d) => setCourses(Array.isArray(d) ? d : []))
      .catch(() => {});

    apiFetch("/api/components")
      .then((r) => r.json())
      .then((d) => setComponents(Array.isArray(d) ? d : []))
      .catch(() => {});

    apiFetch("/api/users")
      .then((r) => r.json())
      .then((d) => {
        const list = Array.isArray(d) ? d : [];
        setTrainers(list.filter((u) => u.role?.toUpperCase() === "TRAINER"));
        setInventoryUsers(list.filter((u) => u.role?.toUpperCase() === "INVENTORY"));
        const map = {};
        list.forEach((u) => { map[u.username] = u.fullName || u.username; });
        setUsersMap(map);
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadIssues();
    loadMasters();
  }, []);

  const handleCourseChange = (courseId) => {
    setFormCourse(courseId);
    setFormActivity("");
    if (!courseId) { setActivities([]); return; }
    apiFetch(`/api/activities/by-course/${courseId}`)
      .then((r) => r.json())
      .then((d) => setActivities(Array.isArray(d) ? d : []))
      .catch(() => {});
  };

  // ===== Parse issue from backend =====
  const parseIssue = (raw) => {
    let title       = raw.title       || "";
    let category    = raw.category    || "Other";
    let priority    = raw.priority    || "Low";
    let description = raw.description || "";
    let status      = raw.status      || "OPEN";
    const id        = raw.id;
    let course = "", activity = "", component = "";
    let createdBy   = currentUserUsername;
    let createdDate = new Date().toISOString();
    let lastUpdated = new Date().toISOString();
    let assignedTo  = "";
    let comments    = [];

    // Support old format where JSON was stored in title
    try {
      const old = JSON.parse(raw.title);
      if (old && typeof old === "object" && !Array.isArray(old)) {
        title       = old.title       || title;
        category    = old.category    || category;
        priority    = old.priority    || priority;
        description = old.description || description;
        course      = old.course      || "";
        activity    = old.activity    || "";
        component   = old.component   || "";
        createdBy   = old.createdBy   || createdBy;
        createdDate = old.createdDate || createdDate;
        lastUpdated = old.lastUpdated || lastUpdated;
        assignedTo  = old.assignedTo  || "";
        comments    = old.comments    || [];
      }
    } catch {
      // title is plain string – check description for JSON
      try {
        const d = JSON.parse(raw.description);
        if (d && typeof d === "object" && !Array.isArray(d)) {
          description = d.description || "";
          course      = d.course      || "";
          activity    = d.activity    || "";
          component   = d.component   || "";
          createdBy   = d.createdBy   || createdBy;
          createdDate = d.createdDate || createdDate;
          lastUpdated = d.lastUpdated || lastUpdated;
          assignedTo  = d.assignedTo  || "";
          comments    = d.comments    || [];
        }
      } catch { /* plain text – use defaults */ }
    }

    return { id, status, title, category, priority, description, course, activity, component, createdBy, createdDate, lastUpdated, assignedTo, comments };
  };

  // ===== Serialise issue back to backend format =====
  const serialise = (issue, overrides = {}) => ({
    id:       issue.id,
    title:    overrides.title    ?? issue.title,
    category: overrides.category ?? issue.category,
    priority: overrides.priority ?? issue.priority,
    status:   overrides.status   ?? issue.status,
    description: JSON.stringify({
      description: issue.description,
      course:      issue.course,
      activity:    issue.activity,
      component:   issue.component,
      createdBy:   issue.createdBy,
      createdDate: issue.createdDate,
      lastUpdated: new Date().toISOString(),
      assignedTo:  overrides.assignedTo ?? issue.assignedTo,
      comments:    overrides.comments   ?? issue.comments,
    }),
  });

  // ===== Create Issue =====
  const handleCreateIssue = async (e) => {
    e.preventDefault();
    if (!formTitle.trim())       { toast.error("Title is required.");       return; }
    if (!formDescription.trim()) { toast.error("Description is required."); return; }

    setFormSubmitting(true);
    try {
      const courseObj  = courses.find((c)    => String(c.id) === String(formCourse));
      const actObj     = activities.find((a) => String(a.id) === String(formActivity));
      const compObj    = components.find((c) => String(c.id) === String(formComponent));

      const payload = {
        title:    formTitle.trim(),
        category: formCategory,
        priority: formPriority,
        status:   "OPEN",
        description: JSON.stringify({
          description: formDescription.trim(),
          course:      courseObj ? (courseObj.courseName || courseObj.name || "") : "",
          activity:    actObj    ? (actObj.activityName  || actObj.name   || "") : "",
          component:   compObj   ? (compObj.componentName || compObj.name || "") : "",
          createdBy:   currentUserUsername,
          createdDate: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
          assignedTo:  "",
          comments: [{
            timestamp: new Date().toISOString(),
            user: "System",
            text: `Issue reported by ${usersMap[currentUserUsername] || currentUserUsername} — Category: ${formCategory}, Priority: ${formPriority}`,
          }],
        }),
      };

      const res = await apiFetch("/api/issues", { method: "POST", body: JSON.stringify(payload) });
      if (res.ok) {
        toast.success("Issue submitted successfully!");
        setCreateModalOpen(false);
        setFormTitle(""); setFormCategory("Other"); setFormPriority("Low");
        setFormDescription(""); setFormCourse(""); setFormActivity(""); setFormComponent("");
        loadIssues();
      } else {
        const text = await res.text();
        toast.error(text || "Failed to submit issue.");
      }
    } catch {
      toast.error("Network error submitting issue.");
    } finally {
      setFormSubmitting(false);
    }
  };

  // ===== Comment =====
  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !selectedIssue) return;
    setActionSubmitting(true);
    try {
      const updatedComments = [
        ...selectedIssue.comments,
        { timestamp: new Date().toISOString(), user: currentUserUsername, text: newComment.trim() },
      ];
      const res = await apiFetch(`/api/issues/${selectedIssue.id}`, {
        method: "PUT",
        body: JSON.stringify(serialise(selectedIssue, { comments: updatedComments })),
      });
      if (res.ok) {
        const updated = parseIssue(await res.json());
        setSelectedIssue(updated);
        setNewComment("");
        toast.success("Comment added.");
        loadIssues();
      } else { toast.error("Failed to add comment."); }
    } catch { toast.error("Connection error."); }
    finally { setActionSubmitting(false); }
  };

  // ===== Status Update =====
  const handleUpdateStatus = async (newStatus) => {
    if (!selectedIssue) return;
    setActionSubmitting(true);
    try {
      const updatedComments = [
        ...selectedIssue.comments,
        {
          timestamp: new Date().toISOString(),
          user: "System",
          text: `Status changed to "${STATUS_LABELS[newStatus] || newStatus}" by ${usersMap[currentUserUsername] || currentUserUsername}`,
        },
      ];
      const res = await apiFetch(`/api/issues/${selectedIssue.id}`, {
        method: "PUT",
        body: JSON.stringify(serialise(selectedIssue, { status: newStatus, comments: updatedComments })),
      });
      if (res.ok) {
        const updated = parseIssue(await res.json());
        setSelectedIssue(updated);
        toast.success(`Status updated to "${STATUS_LABELS[newStatus] || newStatus}"`);
        loadIssues();
      } else { toast.error("Failed to update status."); }
    } catch { toast.error("Connection error."); }
    finally { setActionSubmitting(false); }
  };

  // ===== Reassign =====
  const handleReassign = async (newAssignee) => {
    if (!selectedIssue) return;
    setActionSubmitting(true);
    try {
      const text = newAssignee
        ? `Assigned to ${usersMap[newAssignee] || newAssignee} by ${usersMap[currentUserUsername] || currentUserUsername}`
        : `Unassigned by ${usersMap[currentUserUsername] || currentUserUsername}`;

      const updatedComments = [
        ...selectedIssue.comments,
        { timestamp: new Date().toISOString(), user: "System", text },
      ];
      const res = await apiFetch(`/api/issues/${selectedIssue.id}`, {
        method: "PUT",
        body: JSON.stringify(serialise(selectedIssue, { assignedTo: newAssignee, comments: updatedComments })),
      });
      if (res.ok) {
        const updated = parseIssue(await res.json());
        setSelectedIssue(updated);
        toast.success(newAssignee ? `Assigned to ${usersMap[newAssignee] || newAssignee}` : "Ticket unassigned");
        loadIssues();
      } else { toast.error("Failed to reassign."); }
    } catch { toast.error("Connection error."); }
    finally { setActionSubmitting(false); }
  };

  // ===== Delete =====
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this issue permanently?")) return;
    try {
      const res = await apiFetch(`/api/issues/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Issue deleted.");
        setDetailModalOpen(false);
        loadIssues();
      } else { toast.error("Failed to delete."); }
    } catch { toast.error("Connection error."); }
  };

  // ===== Filters =====
  const filteredIssues = useMemo(() => {
    return issues.filter((i) => {
      if (search.trim()) {
        const t = search.toLowerCase();
        if (
          !i.title.toLowerCase().includes(t) &&
          !i.description.toLowerCase().includes(t) &&
          !(usersMap[i.createdBy] || i.createdBy).toLowerCase().includes(t)
        ) return false;
      }
      if (filterStatus    && i.status    !== filterStatus)    return false;
      if (filterPriority  && i.priority  !== filterPriority)  return false;
      if (filterCategory  && i.category  !== filterCategory)  return false;
      if (filterAssignedTo && i.assignedTo !== filterAssignedTo) return false;
      if (i.createdDate) {
        const d = new Date(i.createdDate);
        if (filterDateFrom) { const f = new Date(filterDateFrom); f.setHours(0,0,0,0); if (d < f) return false; }
        if (filterDateTo)   { const t = new Date(filterDateTo);   t.setHours(23,59,59,999); if (d > t) return false; }
      }
      if (activeTab === "MY_ISSUES"   && i.createdBy !== currentUserUsername) return false;
      if (activeTab === "OPEN"        && i.status    !== "OPEN")              return false;
      if (activeTab === "IN_PROGRESS" && i.status    !== "IN_PROGRESS")       return false;
      if (activeTab === "RESOLVED"    && i.status    !== "RESOLVED")          return false;
      if (activeTab === "CRITICAL"    && i.priority  !== "Critical")          return false;
      return true;
    });
  }, [issues, search, filterStatus, filterPriority, filterCategory, filterAssignedTo, filterDateFrom, filterDateTo, activeTab, usersMap]);

  const stats = useMemo(() => {
    const s = { open: 0, inProgress: 0, resolved: 0, critical: 0, mine: 0 };
    issues.forEach((i) => {
      if (i.status    === "OPEN")        s.open++;
      if (i.status    === "IN_PROGRESS") s.inProgress++;
      if (i.status    === "RESOLVED")    s.resolved++;
      if (i.priority  === "Critical")    s.critical++;
      if (i.createdBy === currentUserUsername) s.mine++;
    });
    return s;
  }, [issues]);

  // ===== Badge Helpers =====
  const getPriorityBadge = (p) => {
    const cls = {
      Critical: "bg-red-100 text-red-800 border-red-200",
      High:     "bg-orange-100 text-orange-800 border-orange-200",
      Medium:   "bg-yellow-100 text-yellow-800 border-yellow-200",
      Low:      "bg-blue-100 text-blue-800 border-blue-200",
    }[p] || "bg-gray-100 text-gray-700 border-gray-200";
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${cls}`}>
        {p}
      </span>
    );
  };

  const getStatusBadge = (s) => {
    const cfg = {
      OPEN:                 { cls: "bg-amber-100 text-amber-800 border-amber-200",   dot: "bg-amber-500",   label: "Open" },
      IN_PROGRESS:          { cls: "bg-indigo-100 text-indigo-800 border-indigo-200", dot: "bg-indigo-500",  label: "In Progress" },
      WAITING_FOR_RESPONSE: { cls: "bg-purple-100 text-purple-800 border-purple-200",dot: "bg-purple-500",  label: "Waiting" },
      RESOLVED:             { cls: "bg-green-100 text-green-800 border-green-200",   dot: "bg-green-500",   label: "Resolved" },
      CLOSED:               { cls: "bg-zinc-200 text-zinc-700 border-zinc-300",      dot: "bg-zinc-500",    label: "Closed" },
    }[s] || { cls: "bg-gray-100 text-gray-700 border-gray-200", dot: "bg-gray-400", label: s };
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.cls}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`}></span>
        {cfg.label}
      </span>
    );
  };

  const formatDate = (iso) => {
    if (!iso) return "-";
    try {
      const d = new Date(iso);
      return `${String(d.getDate()).padStart(2,"0")}-${String(d.getMonth()+1).padStart(2,"0")}-${d.getFullYear()}`;
    } catch { return "-"; }
  };

  return (
    <div className="p-6 space-y-6">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-800 tracking-tight">Issues</h2>
          <p className="text-xs text-gray-400 mt-0.5">Track and manage support issues raised by trainers</p>
        </div>
        {role === "Trainer" && (
          <button
            onClick={() => setCreateModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-lg shadow-sm transition flex items-center gap-2"
          >
            ➕ Report Issue
          </button>
        )}
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { tab: "ALL",         label: "Total Issues", value: issues.length,    color: "text-slate-800" },
          { tab: "OPEN",        label: "Open",         value: stats.open,       color: "text-amber-600" },
          { tab: "IN_PROGRESS", label: "In Progress",  value: stats.inProgress, color: "text-indigo-600" },
          { tab: "CRITICAL",    label: "Critical",     value: stats.critical,   color: "text-red-600" },
          { tab: "MY_ISSUES",   label: "My Issues",    value: stats.mine,       color: "text-teal-600", extra: "col-span-2 md:col-span-1" },
        ].map(({ tab, label, value, color, extra = "" }) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`p-4 rounded-xl shadow-sm border transition flex flex-col items-start ${extra} ${
              activeTab === tab ? "bg-indigo-50 border-indigo-300 ring-1 ring-indigo-300" : "bg-white border-gray-200 hover:border-indigo-200"
            }`}
          >
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</span>
            <span className={`text-2xl font-black ${color}`}>{value}</span>
          </button>
        ))}
      </div>

      {/* FILTERS */}
      <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Search</label>
            <input
              type="text"
              placeholder="Search by title, description, raised by..."
              className="w-full border border-gray-300 p-2.5 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Status</label>
            <select
              className="w-full border border-gray-300 p-2.5 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s] || s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Priority</label>
            <select
              className="w-full border border-gray-300 p-2.5 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
            >
              <option value="">All Priorities</option>
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Category</label>
            <select
              className="w-full border border-gray-300 p-2.5 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Assigned To</label>
            <select
              className="w-full border border-gray-300 p-2.5 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
              value={filterAssignedTo}
              onChange={(e) => setFilterAssignedTo(e.target.value)}
            >
              <option value="">All Assignees</option>
              {inventoryUsers.map((u) => (
                <option key={u.id} value={u.username}>
                  {u.fullName ? `${u.fullName} (${u.username})` : u.username}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">From Date</label>
            <input type="date" className="w-full border border-gray-300 p-2.5 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
              value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">To Date</label>
            <input type="date" className="w-full border border-gray-300 p-2.5 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
              value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={() => {
              setSearch(""); setFilterStatus(""); setFilterPriority(""); setFilterCategory("");
              setFilterAssignedTo(""); setFilterDateFrom(""); setFilterDateTo(""); setActiveTab("ALL");
            }}
            className="bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold px-5 py-2 rounded-lg text-xs uppercase tracking-wider transition shadow-sm"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* ISSUES TABLE */}
      <div className="bg-white rounded-xl shadow overflow-hidden border border-gray-200">
        <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <h3 className="font-bold text-gray-700 text-sm">Issues List</h3>
          <span className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-100 font-bold px-2.5 py-0.5 rounded-full">
            {filteredIssues.length} issue{filteredIssues.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="p-3.5 font-bold text-gray-600 border-r border-gray-200 w-24">Issue ID</th>
                <th className="p-3.5 font-bold text-gray-600 border-r border-gray-200 min-w-[220px]">Title</th>
                <th className="p-3.5 font-bold text-gray-600 border-r border-gray-200">Category</th>
                <th className="p-3.5 font-bold text-gray-600 border-r border-gray-200 w-24">Priority</th>
                <th className="p-3.5 font-bold text-gray-600 border-r border-gray-200 w-28">Status</th>
                <th className="p-3.5 font-bold text-gray-600 border-r border-gray-200">Raised By</th>
                <th className="p-3.5 font-bold text-gray-600 border-r border-gray-200">Assigned To</th>
                <th className="p-3.5 font-bold text-gray-600 border-r border-gray-200 w-28">Created Date</th>
                <th className="p-3.5 font-bold text-gray-600 w-20 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredIssues.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center p-12 text-gray-400 italic text-sm">
                    No issues found matching the current filters.
                  </td>
                </tr>
              ) : (
                filteredIssues.map((i) => (
                  <tr key={i.id} className="hover:bg-gray-50/60 transition-colors">

                    {/* Issue ID */}
                    <td className="p-3.5 border-r border-gray-100">
                      <span className="font-mono font-bold text-indigo-600 text-xs bg-indigo-50 px-2 py-1 rounded border border-indigo-100">
                        {formatTicketId(i.id)}
                      </span>
                    </td>

                    {/* Title */}
                    <td className="p-3.5 border-r border-gray-100">
                      <div className="font-semibold text-gray-900 line-clamp-1">{i.title}</div>
                      {i.description && (
                        <div className="text-xs text-gray-400 line-clamp-1 mt-0.5">{i.description}</div>
                      )}
                    </td>

                    {/* Category */}
                    <td className="p-3.5 border-r border-gray-100 text-gray-700 font-medium text-xs">
                      {i.category}
                    </td>

                    {/* Priority */}
                    <td className="p-3.5 border-r border-gray-100 text-center">
                      {getPriorityBadge(i.priority)}
                    </td>

                    {/* Status */}
                    <td className="p-3.5 border-r border-gray-100 text-center">
                      {getStatusBadge(i.status)}
                    </td>

                    {/* Raised By */}
                    <td className="p-3.5 border-r border-gray-100">
                      <div className="font-semibold text-gray-800 text-sm">
                        {usersMap[i.createdBy] || i.createdBy}
                      </div>
                      {usersMap[i.createdBy] && usersMap[i.createdBy] !== i.createdBy && (
                        <div className="text-[10px] text-gray-400 font-mono">{i.createdBy}</div>
                      )}
                    </td>

                    {/* Assigned To */}
                    <td className="p-3.5 border-r border-gray-100">
                      {i.assignedTo ? (
                        <span className="text-xs font-semibold text-indigo-800 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded">
                          {usersMap[i.assignedTo] || i.assignedTo}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Unassigned</span>
                      )}
                    </td>

                    {/* Created Date */}
                    <td className="p-3.5 border-r border-gray-100 text-xs font-medium text-gray-500 font-mono">
                      {formatDate(i.createdDate)}
                    </td>

                    {/* Action */}
                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => { setSelectedIssue(i); setDetailModalOpen(true); }}
                        className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold border border-indigo-200 px-3 py-1.5 rounded-lg text-xs transition"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== CREATE MODAL ===== */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 my-8">
            <div className="flex justify-between items-center border-b pb-3 mb-5">
              <h4 className="text-lg font-bold text-gray-800">Report New Issue</h4>
              <button onClick={() => setCreateModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl font-black">×</button>
            </div>

            <form onSubmit={handleCreateIssue} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Issue Title *</label>
                <input
                  className="w-full border border-gray-300 p-2.5 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  placeholder="Brief description of the problem"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  disabled={formSubmitting}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Category *</label>
                  <select
                    className="w-full border border-gray-300 p-2.5 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    disabled={formSubmitting}
                  >
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Priority *</label>
                  <select
                    className="w-full border border-gray-300 p-2.5 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value)}
                    disabled={formSubmitting}
                  >
                    {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Related Course (Optional)</label>
                  <select
                    className="w-full border border-gray-300 p-2.5 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    value={formCourse}
                    onChange={(e) => handleCourseChange(e.target.value)}
                    disabled={formSubmitting}
                  >
                    <option value="">-- Select Course --</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>{c.courseName || c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Related Activity (Optional)</label>
                  <select
                    className="w-full border border-gray-300 p-2.5 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    value={formActivity}
                    onChange={(e) => setFormActivity(e.target.value)}
                    disabled={formSubmitting || !formCourse}
                  >
                    <option value="">-- Select Activity --</option>
                    {activities.map((a) => (
                      <option key={a.id} value={a.id}>{a.activityName || a.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Related Component (Optional)</label>
                <select
                  className="w-full border border-gray-300 p-2.5 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  value={formComponent}
                  onChange={(e) => setFormComponent(e.target.value)}
                  disabled={formSubmitting}
                >
                  <option value="">-- Select Component --</option>
                  {components.map((c) => (
                    <option key={c.id} value={c.id}>{c.componentName || c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Description *</label>
                <textarea
                  className="w-full border border-gray-300 p-2.5 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  rows={4}
                  placeholder="Explain the issue in detail..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  disabled={formSubmitting}
                  required
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setCreateModalOpen(false)} disabled={formSubmitting}
                  className="border px-4 py-2.5 rounded-lg hover:bg-gray-50 transition text-sm font-semibold text-gray-600">
                  Cancel
                </button>
                <button type="submit" disabled={formSubmitting}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg transition text-sm font-bold shadow-sm">
                  {formSubmitting ? "Submitting..." : "Submit Issue"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== DETAIL DRAWER ===== */}
      {detailModalOpen && selectedIssue && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-end z-50">
          <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col">

            {/* Drawer Header */}
            <div className="flex justify-between items-start border-b border-gray-200 p-5">
              <div>
                <span className="text-xs font-bold font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                  {formatTicketId(selectedIssue.id)}
                </span>
                <h3 className="text-xl font-extrabold text-gray-900 mt-2 leading-tight">{selectedIssue.title}</h3>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="text-xs text-gray-500">
                    Raised by: <strong>{usersMap[selectedIssue.createdBy] || selectedIssue.createdBy}</strong>
                  </span>
                  <span className="text-gray-300">•</span>
                  <span className="text-xs text-gray-400">{formatDate(selectedIssue.createdDate)}</span>
                </div>
              </div>
              <button onClick={() => setDetailModalOpen(false)} className="text-gray-400 hover:text-gray-700 font-black text-2xl">×</button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">

              {/* Details Grid */}
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="block text-gray-400 uppercase font-bold tracking-wider mb-1">Category</span>
                  <span className="font-semibold text-gray-800">{selectedIssue.category}</span>
                </div>
                <div>
                  <span className="block text-gray-400 uppercase font-bold tracking-wider mb-1">Priority</span>
                  {getPriorityBadge(selectedIssue.priority)}
                </div>
                <div>
                  <span className="block text-gray-400 uppercase font-bold tracking-wider mb-1">Status</span>
                  {getStatusBadge(selectedIssue.status)}
                </div>
                <div>
                  <span className="block text-gray-400 uppercase font-bold tracking-wider mb-1">Assigned To</span>
                  {role === "Manager" ? (
                    <select
                      className="border border-gray-300 rounded-lg p-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400 font-semibold"
                      value={selectedIssue.assignedTo}
                      onChange={(e) => handleReassign(e.target.value)}
                      disabled={actionSubmitting}
                    >
                      <option value="">Unassigned</option>
                      {inventoryUsers.map((u) => (
                        <option key={u.id} value={u.username}>
                          {u.fullName ? `${u.fullName} (${u.username})` : u.username}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="font-semibold text-gray-800">
                      {selectedIssue.assignedTo ? (usersMap[selectedIssue.assignedTo] || selectedIssue.assignedTo) : "Unassigned"}
                    </span>
                  )}
                </div>

                {/* Linked context */}
                {(selectedIssue.course || selectedIssue.activity) && (
                  <div className="col-span-2 border-t border-gray-200 pt-3 grid grid-cols-2 gap-3">
                    <div>
                      <span className="block text-gray-400 uppercase font-bold tracking-wider mb-1">Course</span>
                      <span className="font-semibold text-gray-800">{selectedIssue.course || "-"}</span>
                    </div>
                    <div>
                      <span className="block text-gray-400 uppercase font-bold tracking-wider mb-1">Activity</span>
                      <span className="font-semibold text-gray-800">{selectedIssue.activity || "-"}</span>
                    </div>
                  </div>
                )}
                {selectedIssue.component && (
                  <div className="col-span-2 border-t border-gray-200 pt-3">
                    <span className="block text-gray-400 uppercase font-bold tracking-wider mb-1">Component</span>
                    <span className="inline-flex font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded text-xs">
                      {selectedIssue.component}
                    </span>
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Description</h4>
                <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-line bg-white border border-gray-200 rounded-lg p-3">
                  {selectedIssue.description || "No description provided."}
                </p>
              </div>

              {/* Status Actions */}
              <div className="flex gap-2 flex-wrap border-b border-gray-100 pb-4">
                {role === "Inventory" && (
                  <>
                    {selectedIssue.status === "OPEN" && (
                      <button onClick={() => handleUpdateStatus("IN_PROGRESS")} disabled={actionSubmitting}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 px-4 rounded-lg transition">
                        Mark In Progress
                      </button>
                    )}
                    {(selectedIssue.status === "OPEN" || selectedIssue.status === "IN_PROGRESS") && (
                      <button onClick={() => handleUpdateStatus("RESOLVED")} disabled={actionSubmitting}
                        className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-2 px-4 rounded-lg transition">
                        Mark Resolved
                      </button>
                    )}
                  </>
                )}
                {role === "Trainer" && selectedIssue.status === "RESOLVED" && (
                  <button onClick={() => handleUpdateStatus("CLOSED")} disabled={actionSubmitting}
                    className="bg-zinc-700 hover:bg-zinc-800 text-white text-xs font-bold py-2 px-4 rounded-lg transition">
                    Close Issue
                  </button>
                )}
                {role === "Manager" && selectedIssue.status !== "CLOSED" && (
                  <button onClick={() => handleUpdateStatus("CLOSED")} disabled={actionSubmitting}
                    className="bg-zinc-700 hover:bg-zinc-800 text-white text-xs font-bold py-2 px-4 rounded-lg transition">
                    Close Issue
                  </button>
                )}
                {role === "Manager" && (
                  <button onClick={() => handleDelete(selectedIssue.id)}
                    className="bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs font-bold py-2 px-4 rounded-lg transition ml-auto">
                    Delete
                  </button>
                )}
              </div>

              {/* Activity Timeline */}
              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Activity</h4>
                <div className="relative border-l border-gray-200 pl-4 space-y-3">
                  {(selectedIssue.comments || []).map((c, idx) => {
                    const isSystem = c.user === "System" || c.user === "System Log";
                    return (
                      <div key={idx} className="relative">
                        <div className={`absolute -left-[21px] mt-1 rounded-full w-2.5 h-2.5 border ${
                          isSystem ? "bg-indigo-100 border-indigo-300" : "bg-white border-gray-400"
                        }`} />
                        <div className={`p-3 rounded-lg border text-xs ${
                          isSystem ? "bg-indigo-50/40 border-indigo-100 text-indigo-900" : "bg-gray-50 border-gray-200 text-gray-800"
                        }`}>
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-bold">
                              {isSystem ? "System" : (usersMap[c.user] || c.user)}
                            </span>
                            <span className="text-[10px] text-gray-400 font-mono">
                              {new Date(c.timestamp).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                            </span>
                          </div>
                          <p className="whitespace-pre-line leading-relaxed">{c.text}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Comment Box */}
                {selectedIssue.status !== "CLOSED" && (
                  <form onSubmit={handlePostComment} className="flex gap-2 pt-4 items-end">
                    <textarea
                      className="border border-gray-300 p-2.5 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 flex-1"
                      rows={2}
                      placeholder="Add a comment or update..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      disabled={actionSubmitting}
                      required
                    />
                    <button type="submit" disabled={actionSubmitting}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-lg text-xs transition">
                      Comment
                    </button>
                  </form>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../utils/api";
import toast from "react-hot-toast";

export default function Inventory() {
  // ===== Kits (existing behavior) =====
  const [kits, setKits] = useState([]);
  const [search, setSearch] = useState("");
  const [showKitForm, setShowKitForm] = useState(false);
  const [kitName, setKitName] = useState("");
  const [kitTotal, setKitTotal] = useState(0);

  const loadKits = () => {
    apiFetch("/api/inventory")
      .then((res) => res.json())
      .then((data) => setKits(data))
      .catch((err) => console.error("Error loading kits", err));
  };

  useEffect(() => {
    loadKits();
  }, []);

  const handleAddKit = async () => {
    if (!kitName || kitTotal <= 0) return;

    try {
      await apiFetch("/api/inventory", {
        method: "POST",
        body: JSON.stringify({ name: kitName, total: Number(kitTotal), issued: 0 }),
      });
      setKitName("");
      setKitTotal(0);
      setShowKitForm(false);
      loadKits();
      toast.success("Kit added successfully!");
    } catch {
      toast.error("Failed to add kit.");
    }
  };

  const issueKit = async (kit) => {
    if (kit.issued >= kit.total) {
      toast.error("No kits left!");
      return;
    }

    try {
      const res = await apiFetch(`/api/inventory/${kit.id}`, {
        method: "PUT",
        body: JSON.stringify({
          ...kit,
          issued: kit.issued + 1,
        }),
      });
      if (res.ok) {
        loadKits();
        toast.success("Kit issued successfully!");
      } else {
        const text = await res.text();
        toast.error(text || "Failed to issue kit.");
      }
    } catch {
      toast.error("Failed to issue kit.");
    }
  };

  const filteredKits = useMemo(() => {
    return kits.filter((k) =>
      (k?.name || "").toLowerCase().includes(search.toLowerCase())
    );
  }, [kits, search]);

  // ===== ERP Master Data: Courses + Activities =====
  const [courses, setCourses] = useState([]);
  const [activities, setActivities] = useState([]);

  const [courseSearch, setCourseSearch] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState("");

  const [courseFormOpen, setCourseFormOpen] = useState(false);
  const [courseEditId, setCourseEditId] = useState(null);
  const [courseName, setCourseName] = useState("");

  const [activityFormOpen, setActivityFormOpen] = useState(false);
  const [activityEditId, setActivityEditId] = useState(null);
  const [activityName, setActivityName] = useState("");

  // ===== Components State & Methods =====
  const [components, setComponents] = useState([]);
  const [componentsList, setComponentsList] = useState([]);
  const [showComponentForm, setShowComponentForm] = useState(false);
  const [compEditId, setCompEditId] = useState(null);
  const [compName, setCompName] = useState("");
  const [compTotal, setCompTotal] = useState(0);
  const [compThreshold, setCompThreshold] = useState(5);

  const [activityMappings, setActivityMappings] = useState({});
  const [componentMappingModalOpen, setComponentMappingModalOpen] = useState(false);
  const [mappingActivity, setMappingActivity] = useState(null);
  const [selectedComponents, setSelectedComponents] = useState([]);
  const [selectedCompIdToAdd, setSelectedCompIdToAdd] = useState("");
  const [compQtyToAdd, setCompQtyToAdd] = useState(1);

  const loadComponents = () => {
    apiFetch("/api/components")
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setComponents(list);
        setComponentsList(list);
      })
      .catch((err) => console.error("Error loading components", err));
  };

  const loadMappingsForActivities = async (acts) => {
    const mappingsObj = {};
    for (const act of acts) {
      try {
        const res = await apiFetch(`/api/components/mappings/activity/${act.id}`);
        if (res.ok) {
          const data = await res.json();
          mappingsObj[act.id] = data;
        }
      } catch (err) {
        console.error("Error loading mappings for activity " + act.id, err);
      }
    }
    setActivityMappings(mappingsObj);
  };

  const loadCourses = () => {
    apiFetch("/api/courses")
      .then((res) => res.json())
      .then((data) => setCourses(data))
      .catch((err) => console.error("Error loading courses", err));
  };

  const loadActivitiesForCourse = (courseId) => {
    if (!courseId) {
      setActivities([]);
      return;
    }

    apiFetch(`/api/activities/by-course/${courseId}`)
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setActivities(list);
        loadMappingsForActivities(list);
      })
      .catch((err) => console.error("Error loading activities", err));
  };

  useEffect(() => {
    loadCourses();
    loadComponents();
  }, []);

  useEffect(() => {
    if (selectedCourseId) loadActivitiesForCourse(selectedCourseId);
    else setActivities([]);
  }, [selectedCourseId]);

  const filteredCourses = useMemo(() => {
    return courses.filter((c) =>
      (c?.name || "").toLowerCase().includes(courseSearch.toLowerCase())
    );
  }, [courses, courseSearch]);

  const openCreateCourse = () => {
    setCourseEditId(null);
    setCourseName("");
    setCourseFormOpen(true);
  };

  const openEditCourse = (course) => {
    setCourseEditId(course.id);
    setCourseName(course.name || "");
    setCourseFormOpen(true);
  };

  const saveCourse = async () => {
    if (!courseName.trim()) return;

    try {
      if (courseEditId) {
        await apiFetch(`/api/courses/${courseEditId}`, {
          method: "PUT",
          body: JSON.stringify({ id: courseEditId, name: courseName.trim() }),
        });
      } else {
        await apiFetch(`/api/courses`, {
          method: "POST",
          body: JSON.stringify({ name: courseName.trim() }),
        });
      }
      setCourseFormOpen(false);
      loadCourses();
      toast.success("Course saved successfully!");
    } catch {
      toast.error("Failed to save course.");
    }
  };

  const deleteCourse = async (courseId) => {
    if (!window.confirm("Delete this course?")) return;
    try {
      const res = await apiFetch(`/api/courses/${courseId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Course deleted successfully!");
        loadCourses();
        // keep selection consistent
        setSelectedCourseId((prev) => {
          const stillExists = courses.some((c) => String(c.id) === String(prev));
          if (!stillExists || String(prev) === String(courseId)) return "";
          return prev;
        });
      } else {
        const text = await res.text();
        toast.error(text || "Failed to delete course.");
      }
    } catch {
      toast.error("Failed to delete course.");
    }
  };

  const openCreateActivity = () => {
    if (!selectedCourseId) {
      toast.error("Select a course first");
      return;
    }
    setActivityEditId(null);
    setActivityName("");
    setActivityFormOpen(true);
  };

  const openEditActivity = (activity) => {
    setActivityEditId(activity.id);
    setActivityName(activity.name || "");
    setActivityFormOpen(true);
  };

  const saveActivity = async () => {
    if (!activityName.trim()) return;
    if (!selectedCourseId) return;

    try {
      if (activityEditId) {
        await apiFetch(`/api/activities/${activityEditId}?courseId=${selectedCourseId}`, {
          method: "PUT",
          body: JSON.stringify({ id: activityEditId, name: activityName.trim() }),
        });
      } else {
        await apiFetch(`/api/activities?courseId=${selectedCourseId}`, {
          method: "POST",
          body: JSON.stringify({ name: activityName.trim() }),
        });
      }
      setActivityFormOpen(false);
      loadActivitiesForCourse(selectedCourseId);
      toast.success("Activity saved successfully!");
    } catch {
      toast.error("Failed to save activity.");
    }
  };

  const deleteActivity = async (activityId) => {
    if (!window.confirm("Delete this activity?")) return;
    try {
      const res = await apiFetch(`/api/activities/${activityId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Activity deleted successfully!");
        loadActivitiesForCourse(selectedCourseId);
      } else {
        const text = await res.text();
        toast.error(text || "Failed to delete activity.");
      }
    } catch {
      toast.error("Failed to delete activity.");
    }
  };

  const openCreateComponent = () => {
    setCompEditId(null);
    setCompName("");
    setCompTotal(0);
    setCompThreshold(5);
    setShowComponentForm(true);
  };

  const openEditComponent = (comp) => {
    setCompEditId(comp.id);
    setCompName(comp.name || comp.componentName || "");
    setCompTotal(comp.totalStock ?? 0);
    setCompThreshold(comp.lowStockThreshold ?? 5);
    setShowComponentForm(true);
  };

  const saveComponent = async () => {
    if (!compName.trim()) {
      toast.error("Component name is required");
      return;
    }

    try {
      let res;
      if (compEditId) {
        res = await apiFetch(`/api/components/${compEditId}`, {
          method: "PUT",
          body: JSON.stringify({
            id: compEditId,
            name: compName.trim(),
            totalStock: Number(compTotal),
            lowStockThreshold: Number(compThreshold),
          }),
        });
      } else {
        res = await apiFetch("/api/components", {
          method: "POST",
          body: JSON.stringify({
            name: compName.trim(),
            totalStock: Number(compTotal),
            lowStockThreshold: Number(compThreshold),
          }),
        });
      }

      if (res.ok) {
        setShowComponentForm(false);
        loadComponents();
        toast.success("Component saved successfully!");
      } else {
        const text = await res.text();
        toast.error(text || "Failed to save component.");
      }
    } catch {
      toast.error("Failed to save component.");
    }
  };

  const deleteComponent = async (compId) => {
    if (!window.confirm("Are you sure you want to delete this component?")) return;
    try {
      const res = await apiFetch(`/api/components/${compId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Component deleted successfully!");
        loadComponents();
      } else {
        const text = await res.text();
        toast.error(text || "Failed to delete component.");
      }
    } catch {
      toast.error("Failed to delete component.");
    }
  };

  const openManageComponents = (activity) => {
    setMappingActivity(activity);
    const existing = activityMappings[activity.id] || [];
    setSelectedComponents(
      existing
        .map((m) => ({
          componentId: m.component?.id,
          quantityRequired: m.quantityRequired || 1,
        }))
        .filter((item) => item.componentId)
    );
    setSelectedCompIdToAdd("");
    setCompQtyToAdd(1);
    setComponentMappingModalOpen(true);
  };

  const handleAddRow = () => {
    if (!selectedCompIdToAdd) {
      toast.error("Please select a component");
      return;
    }
    const qty = parseInt(compQtyToAdd, 10);
    if (!qty || qty <= 0) {
      toast.error("Quantity must be greater than 0");
      return;
    }
    const compId = Number(selectedCompIdToAdd);

    if (selectedComponents.some((item) => item.componentId === compId)) {
      toast.error("Component already added. Remove it first to update quantity.");
      return;
    }

    setSelectedComponents([
      ...selectedComponents,
      { componentId: compId, quantityRequired: qty },
    ]);
    setSelectedCompIdToAdd("");
    setCompQtyToAdd(1);
  };

  const saveComponentMappings = async () => {
    if (!mappingActivity) return;

    const payload = selectedComponents.map((item) => ({
      componentId: item.componentId,
      quantityRequired: item.quantityRequired,
    }));

    try {
      const res = await apiFetch(`/api/components/mappings/bulk?activityId=${mappingActivity.id}`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setComponentMappingModalOpen(false);
        loadActivitiesForCourse(selectedCourseId);
        toast.success("Component mappings updated successfully!");
      } else {
        const text = await res.text();
        toast.error(text || "Failed to save component mappings.");
      }
    } catch {
      toast.error("Failed to save component mappings.");
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* ERP MASTER DATA: COURSES */}
      <div className="bg-white p-6 rounded-xl shadow overflow-x-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Courses</h3>
          <div className="flex gap-3 w-full md:w-auto">
            <input
              type="text"
              placeholder="Search course..."
              className="border p-2 rounded w-full md:w-64 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              value={courseSearch}
              onChange={(e) => setCourseSearch(e.target.value)}
            />
            <button
              onClick={openCreateCourse}
              className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition"
            >
              Add Course
            </button>
          </div>
        </div>

        <div className="flex gap-3 flex-wrap mb-4">
          <select
            className="border p-2 rounded min-w-[260px]"
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
          >
            <option value="">Select a course</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <table className="w-full border">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 border text-left">Course</th>
              <th className="p-3 border text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredCourses.length === 0 ? (
              <tr>
                <td colSpan="2" className="text-center p-6 text-gray-500">
                  No courses found
                </td>
              </tr>
            ) : (
              filteredCourses.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="p-3 border">{c.name}</td>
                  <td className="p-3 border">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditCourse(c)}
                        className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteCourse(c.id)}
                        className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-600 transition"
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
      </div>

      {/* ERP MASTER DATA: ACTIVITIES */}
      <div className="bg-white p-6 rounded-xl shadow overflow-x-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Activities</h3>
          <button
            onClick={openCreateActivity}
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition"
          >
            Add Activity
          </button>
        </div>

        {!selectedCourseId ? (
          <div className="text-center p-6 text-gray-500">
            Select a course to manage its activities.
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center p-6 text-gray-500">
            No activities found for this course.
          </div>
        ) : (
          <table className="w-full border">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 border text-left">Activity</th>
                <th className="p-3 border text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {activities.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="p-3 border">
                    <div>
                      <div className="font-semibold text-gray-800">{a.name}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Components Used:{" "}
                        {activityMappings[a.id] && activityMappings[a.id].length > 0 ? (
                          <span className="font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                            {activityMappings[a.id].map((m) => `${m.component?.name || m.component?.componentName} (${m.quantityRequired})`).join(", ")}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">None</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-3 border">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openManageComponents(a)}
                        className="bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700 transition"
                      >
                        Add Stock
                      </button>
                      <button
                        onClick={() => openEditActivity(a)}
                        className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteActivity(a.id)}
                        className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-600 transition"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* COURSE FORM MODAL (inline) */}
      {courseFormOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow w-full max-w-lg p-5">
            <h4 className="text-lg font-semibold mb-3">
              {courseEditId ? "Edit Course" : "Add Course"}
            </h4>
            <input
              className="border p-2 rounded w-full"
              placeholder="Course name"
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
            />
            <div className="flex gap-3 mt-4 justify-end">
              <button
                onClick={() => setCourseFormOpen(false)}
                className="border px-4 py-2 rounded hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={saveCourse}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ACTIVITY FORM MODAL (inline) */}
      {activityFormOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow w-full max-w-lg p-5">
            <h4 className="text-lg font-semibold mb-3">
              {activityEditId ? "Edit Activity" : "Add Activity"}
            </h4>
            <input
              className="border p-2 rounded w-full"
              placeholder="Activity name"
              value={activityName}
              onChange={(e) => setActivityName(e.target.value)}
            />
            <div className="flex gap-3 mt-4 justify-end">
              <button
                onClick={() => setActivityFormOpen(false)}
                className="border px-4 py-2 rounded hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={saveActivity}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}



      {/* MANAGE COMPONENTS (CHECKBOXES) MODAL */}
      {componentMappingModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow w-full max-w-lg p-5">
            <h4 className="text-lg font-semibold mb-1 text-gray-800">
              Components Used in: {mappingActivity?.name || mappingActivity?.activityName}
            </h4>
            <p className="text-xs text-gray-400 mb-4">
              Add components and their quantities required for this activity. Kit issuance automatically reduces stock.
            </p>

            {/* ADD ROW CONTROLS */}
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 mb-4 space-y-2">
              <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Add Component Row</div>
              <div className="flex gap-2">
                <select
                  className="border p-2 rounded text-sm flex-1 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  value={selectedCompIdToAdd}
                  onChange={(e) => setSelectedCompIdToAdd(e.target.value)}
                >
                  <option value="">Select Component...</option>
                  {componentsList.map((comp) => (
                    <option key={comp.id} value={comp.id}>
                      {comp.name || comp.componentName} (Avail: {comp.totalStock - comp.issuedStock})
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  className="border p-2 rounded text-sm w-20 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  placeholder="Qty"
                  value={compQtyToAdd}
                  onChange={(e) => setCompQtyToAdd(e.target.value)}
                />
                <button
                  type="button"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded text-sm font-semibold transition"
                  onClick={handleAddRow}
                >
                  Add
                </button>
              </div>
            </div>

            {/* MAPPED ROWS LIST */}
            <div className="max-h-60 overflow-y-auto border rounded bg-white mb-4">
              {selectedComponents.length === 0 ? (
                <div className="text-center text-xs text-gray-500 py-6 italic">
                  No components mapped yet. Add a component above.
                </div>
              ) : (
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="bg-gray-50 border-b sticky top-0">
                    <tr>
                      <th className="p-2.5 font-semibold text-gray-700">Component Name</th>
                      <th className="p-2.5 font-semibold text-gray-700 w-24 text-center">Qty Required</th>
                      <th className="p-2.5 font-semibold text-gray-700 w-24 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-150">
                    {selectedComponents.map((item) => {
                      const comp = componentsList.find((c) => c.id === item.componentId);
                      return (
                        <tr key={item.componentId} className="hover:bg-gray-50 transition-colors">
                          <td className="p-2.5">
                            <div className="font-semibold text-gray-800">
                              {comp?.name || comp?.componentName || `Component #${item.componentId}`}
                            </div>
                            <div className="text-xs text-gray-400">
                              Available: {(comp?.totalStock ?? 0) - (comp?.issuedStock ?? 0)} units
                            </div>
                          </td>
                          <td className="p-2.5 text-center">
                            <input
                              type="number"
                              min="1"
                              className="border p-1 rounded text-sm w-16 text-center focus:ring-2 focus:ring-indigo-400 focus:outline-none bg-white font-medium"
                              value={item.quantityRequired}
                              onChange={(e) => {
                                const newQty = Math.max(1, parseInt(e.target.value, 10) || 1);
                                setSelectedComponents(
                                  selectedComponents.map((sc) =>
                                    sc.componentId === item.componentId
                                      ? { ...sc, quantityRequired: newQty }
                                      : sc
                                  )
                                );
                              }}
                            />
                          </td>
                          <td className="p-2.5 text-center">
                            <button
                              type="button"
                              className="text-red-500 hover:text-red-700 text-xs font-semibold px-2 py-1 rounded hover:bg-red-50 transition border border-transparent hover:border-red-100"
                              onClick={() => {
                                setSelectedComponents(
                                  selectedComponents.filter((sc) => sc.componentId !== item.componentId)
                                );
                              }}
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setComponentMappingModalOpen(false)}
                className="border px-4 py-2 rounded hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={saveComponentMappings}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition font-semibold"
              >
                Save Mappings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

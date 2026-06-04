import { useState, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import { apiFetch } from "../utils/api";

export default function School() {
  const [schools, setSchools] = useState([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [editId, setEditId] = useState(null);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [trainer, setTrainer] = useState("");
  const [trainers, setTrainers] = useState([]);

  const [courses, setCourses] = useState([]);
  const [allActivities, setAllActivities] = useState([]);
  const [selectedCourseIds, setSelectedCourseIds] = useState([]);

  const loadCourses = () =>
    apiFetch("/api/courses")
      .then((res) => res.json())
      .then((data) => setCourses(Array.isArray(data) ? data : []))
      .catch(() => toast.error("Failed to load courses"));

  const loadActivities = () =>
    apiFetch("/api/activities")
      .then((res) => res.json())
      .then((data) => setAllActivities(Array.isArray(data) ? data : []))
      .catch(() => toast.error("Failed to load activities"));

  const loadSchools = () => {
    apiFetch("/api/schools")
      .then((res) => res.json())
      .then((data) => setSchools(data));
  };

  const loadTrainers = () => {
    apiFetch("/api/users/trainers")
      .then((res) => res.json())
      .then((data) => setTrainers(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Error loading trainers", err));
  };

  useEffect(() => {
    loadSchools();
    loadCourses();
    loadActivities();
    loadTrainers();
  }, []);

  const trainersMap = useMemo(() => {
    const map = {};
    trainers.forEach((t) => {
      map[t.username] = t.fullName || t.username;
    });
    return map;
  }, [trainers]);

  const openAddForm = () => {
    setEditId(null);
    setName("");
    setCity("");
    setTrainer("");
    setSelectedCourseIds([]);
    setShowForm(true);
  };

  const openEditForm = (school) => {
    setEditId(school.id);
    setName(school.name || "");
    setCity(school.city || "");
    setTrainer(school.trainer || "");
    const cIds = (school.allowedCourses || []).map(c => Number(c.id));
    setSelectedCourseIds(cIds);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!name || !city || !trainer) {
      toast.error("Please fill name, city and trainer.");
      return;
    }

    const payload = {
      name,
      city,
      trainer,
      allowedCourses: selectedCourseIds.map(id => ({ id })),
    };

    if (editId) {
      await apiFetch(`/api/schools/${editId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      toast.success("School updated");
    } else {
      await apiFetch("/api/schools", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      toast.success("School created");
    }

    setShowForm(false);
    loadSchools();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this school?")) return;
    try {
      await apiFetch(`/api/schools/${id}`, { method: "DELETE" });
      toast.success("School deleted");
      loadSchools();
    } catch {
      toast.error("Failed to delete school");
    }
  };

  const handleCourseToggle = (courseId) => {
    setSelectedCourseIds((prev) => 
      prev.includes(courseId) ? prev.filter(id => id !== courseId) : [...prev, courseId]
    );
  };

  const filteredSchools = schools.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.city.toLowerCase().includes(search.toLowerCase()) ||
      s.trainer.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">Schools</h2>
          <p className="text-gray-500 text-sm mt-1">Manage schools, trainers, and course assignments</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <input
            type="text"
            placeholder="Search school..."
            className="border border-gray-300 p-2.5 rounded-lg w-full md:w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button
            onClick={openAddForm}
            className="bg-indigo-600 text-white font-medium px-5 py-2.5 rounded-lg hover:bg-indigo-700 transition shadow-sm flex items-center justify-center gap-2"
          >
            <span className="text-xl leading-none">+</span> Add School
          </button>
        </div>
      </div>

      {/* CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSchools.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500 bg-white rounded-2xl border border-dashed border-gray-300">
            No schools found. Click "Add School" to create one.
          </div>
        ) : (
          filteredSchools.map((s) => (
            <div key={s.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition group relative overflow-hidden">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-800">{s.name}</h3>
                  <p className="text-gray-500 text-sm flex items-center gap-1 mt-1 font-medium">
                    📍 {s.city}
                  </p>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition absolute top-4 right-4">
                  <button onClick={() => openEditForm(s)} className="text-gray-500 hover:text-indigo-600 p-2 bg-gray-50 hover:bg-indigo-50 rounded-lg transition" title="Configure">
                    ✎
                  </button>
                  <button onClick={() => handleDelete(s.id)} className="text-gray-500 hover:text-red-600 p-2 bg-gray-50 hover:bg-red-50 rounded-lg transition" title="Delete">
                    🗑
                  </button>
                </div>
              </div>
              
              <div className="mb-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Assigned Trainer</span>
                <p className="text-indigo-700 font-semibold">{trainersMap[s.trainer] ? `${trainersMap[s.trainer]} (${s.trainer})` : (s.trainer || "None")}</p>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between text-sm text-gray-500 mb-3">
                  <span className="flex items-center gap-1">📚 Courses: <strong className="text-gray-800">{(s.allowedCourses || []).length}</strong></span>
                  <span className="flex items-center gap-1">⚡ Activities: <strong className="text-gray-800">{(s.allowedActivities || []).length}</strong></span>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {(s.allowedCourses || []).slice(0, 3).map(c => (
                    <span key={c.id} className="bg-indigo-50 text-indigo-700 border border-indigo-100 text-xs px-2.5 py-1 rounded-md font-medium">
                      {c.name}
                    </span>
                  ))}
                  {(s.allowedCourses || []).length > 3 && (
                    <span className="bg-gray-50 text-gray-600 border border-gray-200 text-xs px-2.5 py-1 rounded-md font-medium">
                      +{(s.allowedCourses.length - 3)} more
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b flex justify-between items-center bg-gray-50/50">
              <h3 className="text-xl font-bold text-gray-800">{editId ? "Configure School" : "Add New School"}</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-700 text-2xl font-bold transition rounded-full w-8 h-8 flex items-center justify-center hover:bg-gray-200">×</button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-white">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">School Name *</label>
                  <input
                    className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition shadow-sm"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter school name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">City *</label>
                  <input
                    className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition shadow-sm"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Enter city"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Trainer *</label>
                  <select
                    className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition shadow-sm bg-white font-medium"
                    value={trainer}
                    onChange={(e) => setTrainer(e.target.value)}
                  >
                    <option value="">-- Select Trainer --</option>
                    {trainers.map((t) => (
                      <option key={t.id} value={t.username}>
                        {t.fullName ? `${t.fullName} (${t.username})` : t.username}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="border-t pt-6">
                <div className="mb-4">
                  <h4 className="text-lg font-bold text-gray-800">Course & Activity Assignment</h4>
                  <p className="text-sm text-gray-500 mt-0.5">Select courses to assign to this school. Associated activities will be mapped automatically.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                  {courses.length === 0 ? (
                    <div className="col-span-full text-center text-sm text-gray-500 p-6 border border-dashed rounded-xl bg-gray-50">
                      No courses available. Add courses in Inventory first.
                    </div>
                  ) : (
                    courses.map((c) => {
                      const isSelected = selectedCourseIds.includes(c.id);
                      const courseActivities = allActivities.filter(a => a.course?.id === c.id);
                      return (
                        <div key={c.id} className={`border rounded-xl p-4 transition duration-200 shadow-sm ${isSelected ? 'border-indigo-500 bg-indigo-50/40 ring-1 ring-indigo-500' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                          <label className="flex items-start gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              className="mt-1 form-checkbox h-5 w-5 text-indigo-600 rounded focus:ring-indigo-500 transition"
                              checked={isSelected}
                              onChange={() => handleCourseToggle(c.id)}
                            />
                            <div>
                              <h5 className={`font-bold text-[15px] leading-tight ${isSelected ? 'text-indigo-900' : 'text-gray-800'}`}>{c.name}</h5>
                              <div className="text-xs text-gray-500 mt-1 font-medium">
                                {courseActivities.length} activities
                              </div>
                            </div>
                          </label>
                          {isSelected && courseActivities.length > 0 && (
                            <div className="mt-3.5 pl-8">
                              <div className="flex flex-wrap gap-1.5">
                                {courseActivities.map(a => (
                                  <span key={a.id} className="inline-block bg-white border border-indigo-200 text-indigo-700 text-[11px] font-semibold px-2 py-0.5 rounded shadow-sm">
                                    {a.name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t bg-gray-50/80 flex justify-end gap-3 backdrop-blur-sm">
              <button
                onClick={() => setShowForm(false)}
                className="px-5 py-2.5 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="bg-indigo-600 text-white font-semibold px-6 py-2.5 rounded-lg hover:bg-indigo-700 transition shadow-md hover:shadow-lg"
              >
                {editId ? "Save Changes" : "Create School"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { apiFetch } from "../utils/api";

export default function KitRequest() {
  const [courses, setCourses] = useState([]);
  const [activities, setActivities] = useState([]);
  const [schools, setSchools] = useState([]);
  const [allowedCourses, setAllowedCourses] = useState([]);


  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedActivity, setSelectedActivity] = useState("");

  const [selectedSchool, setSelectedSchool] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [requiredDate, setRequiredDate] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        // Trainer-only: load assigned schools via trainer identity derived from auth.
        // Endpoint: GET /api/schools/by-trainer/{trainerId}
        // Fallback: GET /api/schools/by-trainer-username/{username}

        const token = localStorage.getItem("token");
        // Trainer identity is no longer used to filter schools in the simplified flow.
        const trainerId = localStorage.getItem("trainerId");
        const userIdFallback = localStorage.getItem("userId");


        // Temporary debug logs for JWT + identity extraction.
        try {
          const user = {
            tokenPresent: Boolean(token),
            trainerIdPresent: Boolean(trainerId),
            userIdFallbackPresent: Boolean(userIdFallback),
            storedUsername: localStorage.getItem("username"),
          };

        // Decode JWT payload without verifying (debug only).
        // Note: school filtering is global now; this is only for troubleshooting.
        const decoded = token
          ? (() => {
              const payload = token.split(".")[1];
              const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
              return JSON.parse(decodeURIComponent(escape(json)));
            })()
          : null;


        console.log("[KitRequest debug] user:", user);
        console.log("[KitRequest debug] token:", token);
        console.log("[KitRequest debug] decodedJwt:", decoded);

        } catch (e) {
          console.log("[KitRequest debug] JWT decode failed", e);
        }

        // Simplified global-school flow: always load all schools.
        const schoolsRes = await apiFetch("/api/schools");
        if (!schoolsRes.ok) {
          const text = await schoolsRes.text().catch(() => "");
          console.log(
            "[KitRequest debug] /api/schools endpoint failed",
            {
              url: schoolsRes.url,
              status: schoolsRes.status,
              statusText: schoolsRes.statusText,
              body: text,
            }
          );
          throw new Error(`schools endpoint failed: ${schoolsRes.status}`);
        }

        const schoolsData = await schoolsRes.json();
        setSchools(Array.isArray(schoolsData) ? schoolsData : []);


        // Load courses once; filter by selected school allowedCourses.
        const coursesRes = await apiFetch("/api/courses");
        if (!coursesRes.ok) {
          const text = await coursesRes.text().catch(() => "");
          console.log(
            "[KitRequest debug] courses endpoint failed",
            {
              url: coursesRes.url,
              status: coursesRes.status,
              statusText: coursesRes.statusText,
              body: text,
            }
          );
          throw new Error(`courses endpoint failed: ${coursesRes.status}`);
        }
        const coursesData = await coursesRes.json();
        setCourses(Array.isArray(coursesData) ? coursesData : []);
      } catch (err) {
        console.log("[KitRequest debug] init error", err);
        toast.error("Failed to initialize trainer request form");
      }
    };

    void init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When school changes, auto-filter allowed courses & reset course/activity.
  useEffect(() => {
    const selectedSchoolObj = schools.find((s) => s.name === selectedSchool);

    // Reset course/activity always when school changes.
    setSelectedCourse("");
    setSelectedActivity("");
    setActivities([]);

    if (!selectedSchoolObj) {
      setAllowedCourses([]);
      return;
    }

    const allowedCoursesRaw = selectedSchoolObj.allowedCourses;
    const allowedCoursesArr = Array.isArray(allowedCoursesRaw)
      ? allowedCoursesRaw
      : [];

    // Support shapes:
    // - [{id,name}]
    // - [{id,...}] with optional name
    // - [ids]
    const normalized = allowedCoursesArr
      .map((c) => {
        if (typeof c === "number") return { id: c, name: String(c) };
        if (c && typeof c === "object") {
          const id = c.id ?? c.courseId ?? c.courseID;
          return {
            id: id != null ? Number(id) : null,
            name: c.name ?? c.courseName ?? String(id ?? ""),
          };
        }
        return null;
      })
      .filter(Boolean);

    // Keep only courses that exist in global courses list if possible.
    const allowedIds = new Set(normalized.map((c) => c.id).filter((id) => id != null));
    const resolved = courses.filter((gc) => allowedIds.has(Number(gc.id)));

    setAllowedCourses(resolved.length > 0 ? resolved : normalized);
  }, [selectedSchool, schools, courses]);


  // When course changes, auto-filter allowed activities from selected school's allowedActivities.
  useEffect(() => {
    if (!selectedCourse || !selectedSchool) {
      setActivities([]);
      setSelectedActivity("");
      return;
    }

    const selectedSchoolObj = schools.find((s) => s.name === selectedSchool);
    if (!selectedSchoolObj) {
      setActivities([]);
      setSelectedActivity("");
      return;
    }

    // Expected shape (from manager config):
    // - selectedSchoolObj.allowedCourses: [{id,name}] or [ids]
    // - selectedSchoolObj.allowedActivities: [{id,name,courseId}] or [{id,name}]
    // We support multiple shapes defensively.
    const allowedActivitiesRaw = selectedSchoolObj.allowedActivities;
    const allowedActivitiesArr = Array.isArray(allowedActivitiesRaw)
      ? allowedActivitiesRaw
      : [];

    // Filter activities by courseId when available; otherwise fallback to previous API call.
    const filtered = allowedActivitiesArr.filter((a) => {
      const aCourseId = a?.course?.id ?? a?.courseId ?? a?.courseID ?? a?.course_id;
      if (aCourseId != null) return Number(aCourseId) === Number(selectedCourse);
      // if no course linkage exists in payload, keep it as-is and rely on backend validation.
      return true;
    });

    setActivities(filtered);
    setSelectedActivity("");
  }, [selectedCourse, selectedSchool]);


  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCourse || !selectedActivity || !selectedSchool || quantity <= 0 || !requiredDate) {
      toast.error("Please fill all required fields correctly.");
      return;
    }

    setSubmitting(true);
    const courseObj = courses.find((c) => c.id === Number(selectedCourse));
    const activityObj = activities.find((a) => a.id === Number(selectedActivity));

    try {
      const res = await apiFetch("/api/kit-requests", {
        method: "POST",
        body: JSON.stringify({
          schoolName: selectedSchool,
          courseName: courseObj?.name || "",
          activityName: activityObj?.name || "",
          quantity: Number(quantity),
          requiredDate: requiredDate,
          description: description,
          course: { id: Number(selectedCourse) },
          activity: { id: Number(selectedActivity) }
        })
      });

      if (res.ok) {
        toast.success("Kit request submitted successfully!");
        setSelectedCourse("");
        setSelectedActivity("");
        setSelectedSchool("");
        setQuantity(1);
        setRequiredDate("");
        setDescription("");
      } else {
        const msg = await res.text();
        toast.error(msg || "Failed to submit kit request.");
      }
    } catch {
      toast.error("Error connecting to server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Request New Kit</h2>
      <p className="text-gray-500 text-sm mb-6">Create a kit request for your school activities. It will be reviewed by the inventory team.</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Select School *</label>
          <select
            className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition bg-gray-50"
            value={selectedSchool}
            onChange={(e) => setSelectedSchool(e.target.value)}
            required
          >
            <option value="">-- Choose School --</option>
            {schools.map((s) => (
              <option key={s.id ?? s.name} value={s.name}>
                {s.name} ({s.city})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Select Course *</label>
            <select
              className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition bg-gray-50"
              value={selectedCourse}
              onChange={(e) => {
                setSelectedCourse(e.target.value);
                setSelectedActivity("");
              }}
              required
            >
              <option value="">-- Choose Course --</option>
              {allowedCourses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Select Activity *</label>
            <select
              className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition bg-gray-50 disabled:opacity-50"
              value={selectedActivity}
              onChange={(e) => setSelectedActivity(e.target.value)}
              disabled={!selectedCourse}
              required
            >
              <option value="">-- Choose Activity --</option>
              {activities.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Quantity *</label>
            <input
              type="number"
              min="1"
              className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition bg-gray-50"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Required Date *</label>
            <input
              type="date"
              className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition bg-gray-50"
              value={requiredDate}
              onChange={(e) => setRequiredDate(e.target.value)}
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Description / Notes</label>
          <textarea
            rows="3"
            placeholder="Provide any additional details or requirements..."
            className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition bg-gray-50"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition shadow-md hover:shadow-lg disabled:opacity-50"
        >
          {submitting ? "Submitting..." : "Submit Kit Request"}
        </button>
      </form>
    </div>
  );
}

import { useEffect, useState } from "react";
import { apiFetch } from "../utils/api";

export default function MySchools() {
  const [schools, setSchools] = useState([]);
  const trainer = localStorage.getItem("username") || "trainer1";

  useEffect(() => {
    apiFetch("/api/schools")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setSchools(data.filter(s => s.trainer === trainer));
        } else {
          setSchools([]);
        }
      })
      .catch(() => setSchools([]));
  }, [trainer]);


  return (
    <div className="bg-white p-6 rounded-xl shadow">
      <h2 className="text-xl font-semibold mb-4">My Schools</h2>

      <ul className="list-disc pl-5">
        {schools.map((s, i) => (
          <li key={i}>{s.name} – {s.city}</li>
        ))}
      </ul>
    </div>
  );
}

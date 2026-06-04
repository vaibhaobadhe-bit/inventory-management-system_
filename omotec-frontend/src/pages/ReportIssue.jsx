import { useState } from "react";
import { apiFetch } from "../utils/api";

export default function ReportIssue() {
  const [kit, setKit] = useState("");
  const [type, setType] = useState("Missing");
  const [note, setNote] = useState("");

  const trainer = "Trainer A"; // later from JWT

  const submitIssue = () => {
    if (!kit) {
      alert("Enter kit name");
      return;
    }

    apiFetch("/api/issues/report", {
      method: "POST",
      body: JSON.stringify({ trainer, kit, type, note }),
    })
      .then((res) => res.text())
      .then(alert);
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow max-w-lg">
      <h2 className="text-xl font-semibold mb-4">Report Issue</h2>

      <input
        placeholder="Kit Name"
        className="border p-2 w-full mb-3"
        onChange={(e) => setKit(e.target.value)}
      />

      <select
        className="border p-2 w-full mb-3"
        onChange={(e) => setType(e.target.value)}
      >
        <option>Missing</option>
        <option>Damaged</option>
      </select>

      <textarea
        placeholder="Notes"
        className="border p-2 w-full mb-3"
        onChange={(e) => setNote(e.target.value)}
      />

      <button
        onClick={submitIssue}
        className="bg-indigo-600 text-white px-4 py-2 rounded"
      >
        Submit Issue
      </button>
    </div>
  );
}

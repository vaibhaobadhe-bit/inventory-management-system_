import { useState } from "react";
import { Toaster } from "react-hot-toast";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";

export default function App() {
  const [role, setRole] = useState(localStorage.getItem("role"));

  const handleLogin = (userRole) => {
    setRole(userRole);
  };

  const handleLogout = () => {
    localStorage.clear();
    setRole(null);
  };

  return (
    <>
      <Toaster position="top-right" />
      {!role ? (
        <Login onLogin={handleLogin} />
      ) : (
        <Dashboard role={role} onLogout={handleLogout} />
      )}
    </>
  );
}

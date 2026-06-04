import { useState } from "react";
import { apiFetch } from "../utils/api";
import toast from "react-hot-toast";

export default function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!username.trim() || !password.trim()) {
      setErrorMsg("Please enter username and password.");
      toast.error("Credentials required");
      return;
    }

    setLoading(true);

    try {
      const res = await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim()
        })
      });

      const data = await res.json();

      if (data.success && data.token) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("username", data.username);
        localStorage.setItem("role", data.role);
        localStorage.setItem("fullName", data.fullName || "");
        toast.success("Successfully logged in!");
        onLogin(data.role);
      } else {
        const msg = data.message || "Invalid username, password or role selection.";
        setErrorMsg(msg);
        toast.error(msg);
      }
    } catch (err) {
      setErrorMsg("Unable to connect to server. Please try again later.");
      toast.error("Network or server connection failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-50 font-sans">
      {/* LEFT SIDE PANEL - Enterprise Illustration/ERP Information (Hidden on small screens) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 justify-center items-center text-white p-12 relative overflow-hidden">
        {/* Subtle branding grid/decoration */}
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500 rounded-full filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-teal-500 rounded-full filter blur-3xl opacity-20"></div>

        <div className="relative max-w-lg space-y-8 z-10">
          <div>
            <span className="bg-indigo-700/50 border border-indigo-500/30 text-indigo-300 text-xs uppercase px-3 py-1.5 rounded-full font-bold tracking-wider">
              Omotec Portal v2.0
            </span>
          </div>

          <div className="space-y-3">
            <h1 className="text-4xl font-extrabold tracking-tight">OMOTEC Management System</h1>
            <p className="text-indigo-200 text-lg">
              Unified resource platform for inventory control, course training, and audit-safe supply tracking.
            </p>
          </div>

          <hr className="border-indigo-700/50" />

          {/* ERP Bullet points */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 flex items-center justify-center bg-indigo-700 text-white rounded-full w-6 h-6 text-sm font-semibold">
                ✓
              </span>
              <div>
                <h4 className="font-bold text-white text-sm">Components Inventory Management</h4>
                <p className="text-indigo-200 text-xs mt-0.5">Track components, low-stock alerts, and manual adjustments.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 flex items-center justify-center bg-indigo-700 text-white rounded-full w-6 h-6 text-sm font-semibold">
                ✓
              </span>
              <div>
                <h4 className="font-bold text-white text-sm">Course &amp; Activity Association</h4>
                <p className="text-indigo-200 text-xs mt-0.5">Pre-map kits dynamically for trainers and simplify issue requests.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 flex items-center justify-center bg-indigo-700 text-white rounded-full w-6 h-6 text-sm font-semibold">
                ✓
              </span>
              <div>
                <h4 className="font-bold text-white text-sm">Detailed Audit Trails</h4>
                <p className="text-indigo-200 text-xs mt-0.5">Log every issue, return, manual deduction, and user action.</p>
              </div>
            </div>
          </div>

          <div className="pt-6">
            <p className="text-xs text-indigo-400">
              © 2026 OMOTEC Management System. Authorized access only.
            </p>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE PANEL - Centered Login Card */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-6 sm:p-12">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-8 space-y-6">
          {/* Card Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-100 text-indigo-700 font-bold text-xl shadow-sm mb-2">
              Ω
            </div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Welcome Back</h2>
            <p className="text-sm text-gray-500">Sign in to continue to your dashboard</p>
          </div>

          {/* Error Message Display */}
          {errorMsg && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-start gap-2.5">
              <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="text-xs font-semibold text-red-800 leading-relaxed">{errorMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {/* Username Field */}
            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">
                Username
              </label>
              <div className="relative">
                <svg className="w-5 h-5 text-gray-400 absolute left-[-25px] top-2">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <input
                  type="text"
                  placeholder="Enter your username"
                  aria-label="Username"
                  className="w-full border border-gray-300 pl-10 pr-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">
                Password
              </label>
              <div className="relative">
              <svg
  className="w-5 h-5 text-gray-400 absolute left-[-25px] top-2"
  fill="none"
  viewBox="0 0 24 24"
  stroke="currentColor"
>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  aria-label="Password"
                  className="w-full border border-gray-300 pl-10 pr-10 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
                {/* Toggle Show/Hide Password */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  disabled={loading}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5 text-gray-400 hover:text-gray-600 cursor-pointer" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-gray-400 hover:text-gray-600 cursor-pointer" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>



            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full flex justify-center items-center gap-2 text-white font-bold py-3 px-4 rounded-lg shadow-md transition duration-200 ${
                loading
                  ? "bg-indigo-400 cursor-not-allowed"
                  : "bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg active:bg-indigo-800"
              }`}
            >
              {loading && (
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {loading ? "Signing in..." : "Login"}
            </button>
          </form>

          {/* Footnote */}
          <div className="text-center pt-4 lg:hidden">
            <p className="text-xs text-gray-400">
              © 2026 OMOTEC Management System. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

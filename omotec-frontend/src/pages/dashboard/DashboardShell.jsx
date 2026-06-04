import { useState, useEffect } from "react";

import Users from "../Users";
import ActivityFeed from "../ActivityFeed";
import EmptyState from "../../components/EmptyState";
import { ManagerDashboard } from "./ManagerDashboard";
import TrainerDashboard from "../TrainerDashboard";
import Schools from "../Schools";
import Trainers from "../Trainers";
import Inventory from "../Inventory";
import Issues from "../Issues";
import MyKits from "../MyKits";
import KitRequest from "../KitRequest";
import KitRequests from "../KitRequests";
import ReturnManagement from "../ReturnManagement";
import AuditLogs from "../AuditLogs";
import ComponentDashboard from "./ComponentDashboard";

export default function DashboardShell({ role = "Manager", onLogout = () => {} }) {
  const normalizeRole = (r) => {
    if (!r) return "Manager";
    const x = String(r).trim().toLowerCase();
    if (x === "trainer")   return "Trainer";
    if (x === "inventory") return "Inventory";
    if (x === "manager")   return "Manager";
    if (x === "trainers")  return "Trainer";
    return "Manager";
  };

  const normalizedRole = normalizeRole(role);

  const getLandingPage = (r) => {
    return "Dashboard";
  };

  const [activePage,     setActivePage]     = useState(() => getLandingPage(normalizedRole));
  const [backendStatus,  setBackendStatus]  = useState("Checking backend...");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme,          setTheme]          = useState(() => localStorage.getItem("theme") || "light");

  const username = localStorage.getItem("username") || "";
  const fullName = localStorage.getItem("fullName") || username || role;

  useEffect(() => {
    apiHealthCheck(setBackendStatus);
  }, []);

  useEffect(() => {
    setActivePage(getLandingPage(normalizedRole));
  }, [role]);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  // ===== MENUS — ORIGINAL, UNCHANGED =====
  const menus = {
    Manager:   ["Dashboard", "Schools", "Trainers", "Inventory Monitoring", "Audit Logs", "Issues Monitoring", "Users"],
    Inventory: ["Dashboard", "Inventory", "Kit Requests", "Return Management", "Issues"],
    Trainer:   ["Dashboard", "My Kits", "Schools", "Kit Request", "Issues"],
  };

  const currentMenu = menus[normalizedRole] ?? menus.Manager;

  const openPage = (page) => {
    setActivePage(page);
    setMobileMenuOpen(false);
  };

  // ===== PAGE RENDERER — ORIGINAL, UNCHANGED =====
  const renderPage = () => {
    switch (activePage) {
      case "Dashboard":
        if (normalizedRole === "Trainer")   return <TrainerDashboard />;
        if (normalizedRole === "Inventory") return <ComponentDashboard />;
        return <ManagerDashboard />;
      case "Schools":              return <Schools />;
      case "Inventory":            return <Inventory />;
      case "Issues":               return <Issues />;
      case "Stock Dashboard":      return <ComponentDashboard />;
      case "Trainers":             return <Trainers />;
      case "My Kits":              return <MyKits />;
      case "Users":                return <Users />;
      case "Inventory Monitoring": return <ComponentDashboard />;
      case "Issues Monitoring":    return <Issues />;
      case "Kit Request":          return <KitRequest />;
      case "Kit Requests":         return <KitRequests />;
      case "Audit Logs":           return <AuditLogs />;
      case "Return Management":    return <ReturnManagement />;
      default:
        return <EmptyState title="Page unavailable" description="Select another option from the menu." />;
    }
  };

  // ===== EMOJI ICONS — ORIGINAL SET =====
  const menuIcons = {
    "Dashboard":            "📊",
    "Schools":              "🏫",
    "Trainers":             "👨‍🏫",
    "Inventory":            "📦",
    "Inventory Monitoring": "🔍",
    "Audit Logs":           "📜",
    "Issues":               "⚠️",
    "Issues Monitoring":    "🚨",
    "Users":                "👥",
    "Stock Dashboard":      "📈",
    "Kit Request":          "📥",
    "Kit Requests":         "📬",
    "Return Management":    "🔄",
    "My Kits":              "🧰",
  };

  const roleLabel = {
    Manager:   "System Manager",
    Inventory: "Inventory Officer",
    Trainer:   "Field Trainer",
  };

  // Sidebar font applied inline (only sidebar uses this, rest of app unchanged)
  const sidebarFont = { fontFamily: "'Inter', 'Poppins', system-ui, sans-serif" };

  return (
    <div className="min-h-screen bg-slate-50 md:flex">

      {/* ========== DESKTOP SIDEBAR — original structure, polished typography ========== */}
      <aside
        className="hidden w-64 bg-slate-900 text-white md:flex md:flex-col border-r border-slate-800 flex-shrink-0"
        style={sidebarFont}
      >
        {/* ── Brand ── */}
        <div className="px-5 pt-6 pb-5 border-b border-slate-800">
          <h2 className="flex items-center gap-2 font-bold text-white tracking-tight"
              style={{ fontSize: 20 }}>
            <span>⚙️</span> Resource Portal
          </h2>
          <p className="mt-1.5" style={{ fontSize: 12, color: "rgba(148,163,184,0.85)" }}>
            Resource Management Portal
          </p>
          <span className="inline-block mt-2 text-indigo-400 bg-indigo-950/50 border border-indigo-900/50 rounded px-2 py-0.5 font-bold uppercase tracking-wider"
                style={{ fontSize: 10 }}>
            {normalizedRole} Portal
          </span>
        </div>

        {/* ── Navigation ── */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-0.5">
            {currentMenu.map((item) => {
              const isActive = activePage === item;
              return (
                <li key={item}>
                  <button
                    onClick={() => openPage(item)}
                    className={`w-full flex items-center gap-3 cursor-pointer rounded-lg px-3 py-2.5 font-medium transition-all duration-150 text-left ${
                      isActive
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-900/30"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    }`}
                    style={{ fontSize: 14, border: "none", position: "relative" }}
                  >
                    {/* Left accent bar for active item */}
                    {isActive && (
                      <span
                        className="absolute left-0 top-1/4 rounded-r"
                        style={{ width: 3, height: "50%", background: "#a5b4fc" }}
                      />
                    )}
                    <span style={{ fontSize: 16, lineHeight: 1 }}>{menuIcons[item] || "🔹"}</span>
                    <span style={{ letterSpacing: "-0.01em" }}>{item}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* ── User Profile (bottom) ── */}
        <div className="px-4 py-4 border-t border-slate-800">
          <div className="flex items-center gap-3 bg-slate-800/60 rounded-xl px-3 py-3 border border-slate-700/50">
            {/* Avatar */}
            <div
              className="flex-shrink-0 flex items-center justify-center rounded-full font-bold text-white"
              style={{
                width: 36,
                height: 36,
                fontSize: 14,
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                boxShadow: "0 0 0 2px rgba(99,102,241,0.25)",
              }}
            >
              {(fullName || "U").charAt(0).toUpperCase()}
            </div>

            <div className="flex-1 min-w-0">
              <div
                className="text-white font-semibold truncate"
                style={{ fontSize: 13 }}
              >
                {fullName}
              </div>
              <div
                className="text-slate-400 font-medium mt-0.5"
                style={{ fontSize: 11 }}
              >
                {roleLabel[normalizedRole] || normalizedRole}
              </div>
            </div>

            {/* Online dot */}
            <span
              className="flex-shrink-0 rounded-full"
              style={{
                width: 8,
                height: 8,
                background: "#22c55e",
                boxShadow: "0 0 0 2px rgba(34,197,94,0.2)",
              }}
            />
          </div>
        </div>
      </aside>

      {/* ========== MAIN CONTENT AREA ========== */}
      <div className="flex flex-1 flex-col min-w-0">

        {/* ── Header — ORIGINAL layout: dark mode + sign out in header ── */}
        <header className="flex items-center justify-between bg-white border-b border-gray-200 px-6 py-4 shadow-sm flex-shrink-0">
          <div className="flex items-center gap-4 min-w-0">
            {/* Mobile menu toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((open) => !open)}
              className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white md:hidden transition hover:bg-slate-800"
              aria-label="Toggle menu"
            >
              ☰ Menu
            </button>

            <div className="min-w-0">
              <h1 className="text-base font-bold text-slate-800 tracking-tight truncate">
                {activePage}
              </h1>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                <span className="text-[11px] text-slate-400">Logged in as:</span>
                <span className="text-[11px] font-semibold text-slate-700 truncate">
                  {localStorage.getItem("fullName") || localStorage.getItem("username") || role}
                </span>
                <span className="text-[11px] text-slate-400">({role})</span>
                <span className="text-slate-300 text-[11px]">•</span>
                <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {backendStatus}
                </span>
              </div>
            </div>
          </div>

          {/* Dark Mode + Sign Out — ORIGINAL POSITION in header */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-3 py-2 text-xs font-semibold transition-all border border-slate-200 dark:border-slate-700 shadow-sm"
              title="Toggle theme mode"
            >
              {theme === "light" ? "🌙 Dark Mode" : "☀️ Light Mode"}
            </button>
            <button
              onClick={onLogout}
              className="rounded-lg bg-rose-600 hover:bg-rose-700 active:bg-rose-800 px-4 py-2 text-xs font-semibold text-white transition-all shadow-sm shadow-rose-600/10"
            >
              Sign Out
            </button>
          </div>
        </header>

        {/* ── Mobile Menu ── */}
        {mobileMenuOpen && (
          <div className="border-b border-slate-800 bg-slate-900 px-4 py-4 text-white md:hidden">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {currentMenu.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => openPage(item)}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium transition ${
                    activePage === item
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  <span>{menuIcons[item] || "🔹"}</span>
                  <span className="truncate">{item}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Page Content ── */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto bg-slate-50">
          <div className="max-w-7xl mx-auto">
            {renderPage()}
          </div>
        </main>

        {/* ── Footer ── */}
        <footer className="py-4 text-center text-[11px] text-slate-400 border-t border-slate-100 bg-white">
          © 2026 Resource Management Portal • All Rights Reserved
        </footer>
      </div>
    </div>
  );
}

async function apiHealthCheck(setBackendStatus) {
  try {
    const { apiFetch } = await import("../../utils/api");
    const res  = await apiFetch("/api/health");
    const data = await res.text();
    setBackendStatus(data);
  } catch {
    setBackendStatus("❌ Backend not reachable");
  }
}

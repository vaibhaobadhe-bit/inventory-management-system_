import DashboardShell from "./dashboard/DashboardShell";

export default function Dashboard({ role = "Manager", onLogout = () => {} }) {
  return <DashboardShell role={role} onLogout={onLogout} />;
}


import { redirect } from "next/navigation";
import { CoordinatorSidebar } from "@/components/coordinator-sidebar";
import { requireUser } from "@/lib/auth";

export default async function CoordinatorDashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (user.role === "ADMIN" || user.role === "SUPER_ADMIN") redirect("/admin/solicitudes");
  const roleLabel = user.role === "COORDINATOR" ? "Control de asignación de salones" : "Auxiliar de coordinación";
  return <div className="dashboard-shell"><CoordinatorSidebar userName={user.name} roleLabel={roleLabel} /><main className="dashboard-main">{children}</main></div>;
}

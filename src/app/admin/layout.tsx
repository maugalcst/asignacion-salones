import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { requireUser } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") redirect("/dashboard");
  return <div className="dashboard-shell"><Sidebar userName={user.name} career={user.career?.acronym} /><main className="dashboard-main">{children}</main></div>;
}

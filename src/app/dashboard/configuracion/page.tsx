import { DashboardHeader } from "@/components/dashboard-header";
import { UserSettingsForm } from "@/components/user-settings-form";
import { requireUser } from "@/lib/auth";

export default async function CoordinatorSettingsPage() {
  const user = await requireUser();

  return (
    <>
      <DashboardHeader
        title="Configuración"
        subtitle="Administración de perfil y credenciales"
      />
      <div className="content-wrap">
        <UserSettingsForm
          user={{
            id: user.id,
            name: user.name,
            username: user.username,
            email: user.email,
            role: user.role,
            employeeNumber: user.employeeNumber,
            career: user.career ? { acronym: user.career.acronym, name: user.career.name } : null
          }}
        />
      </div>
    </>
  );
}

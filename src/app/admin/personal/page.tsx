import { DashboardHeader } from "@/components/dashboard-header";
import { PersonnelManager } from "@/components/personnel-manager";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function PersonalPage() {
  const current = await requireUser();

  // La cuenta de Super Admin sólo es visible para ella misma. El filtro va en la
  // consulta y no en el componente porque todo lo que se le pasa al cliente
  // viaja al navegador: esconderla con JavaScript la dejaría igual de expuesta
  // en el HTML de la página.
  const canSeeSuperAdmin = current.role === "SUPER_ADMIN";

  const [people, careers] = await Promise.all([
    prisma.user.findMany({
      where: canSeeSuperAdmin ? undefined : { role: { not: "SUPER_ADMIN" } },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        employeeNumber: true,
        role: true,
        careerId: true,
        career: { select: { id: true, acronym: true, name: true } }
      },
      orderBy: { name: "asc" }
    }),
    prisma.career.findMany({
      select: { id: true, acronym: true, name: true },
      orderBy: { acronym: "asc" }
    })
  ]);

  return (
    <>
      <DashboardHeader title="Personal" subtitle="Roles de personal" />
      <div className="content-wrap">
        <PersonnelManager
          people={people}
          careers={careers}
          currentUserId={current.id}
          canSeeSuperAdmin={canSeeSuperAdmin}
        />
      </div>
    </>
  );
}

import { DashboardHeader } from "@/components/dashboard-header";
import { SubjectsManager } from "@/components/subjects-manager";
import { prisma } from "@/lib/prisma";
export default async function MateriasPage() {
    const [subjects, careers, coordinators] = await Promise.all([
        prisma.subject.findMany({
            select: {
                id: true,
                code: true,
                name: true,
                type: true,
                semester: true,
                duracion: true,
                cantidad: true,
                coordinator: { select: { id: true, name: true } },
                careers: { select: { id: true, acronym: true, name: true } }
            },
            orderBy: [{ semester: "asc" }, { name: "asc" }],
        }),
        prisma.career.findMany({ select: { id: true, acronym: true, name: true }, orderBy: { acronym: "asc" } }),
        prisma.user.findMany({
            where: { role: "COORDINATOR" },
            select: { id: true, name: true },
            orderBy: { name: "asc" }
        }),
    ]);
    return (
        <>
            <DashboardHeader title="Lista de materias" subtitle="Listado de las materias registradas, puede agregar o quitar materias" />
            <div className="content-wrap">
                <SubjectsManager subjects={subjects} careers={careers} coordinators={coordinators} />
            </div>
        </>
    );
}

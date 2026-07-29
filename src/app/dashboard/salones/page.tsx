import { DashboardHeader } from "@/components/dashboard-header";
import { AvailableClassroomsTable } from "@/components/available-classrooms-table";
import { prisma } from "@/lib/prisma";

export default async function AvailableClassroomsPage() {
  const classrooms = await prisma.classroom.findMany({
    include: {
      requests: { where: { status: "APPROVED" }, include: { schedules: { include: { schoolHour: true } } } },
      unavailable: { where: { active: true }, include: { schoolHour: true } }
    },
    orderBy: [{ building: "asc" }, { floor: "asc" }, { number: "asc" }]
  });
  return (
    <>
      <DashboardHeader title="Salones disponibles" subtitle="Consulta salones, capacidad, mantenimiento y horarios ocupados" />
      <div className="content-wrap">
        <AvailableClassroomsTable classrooms={classrooms as any} />
      </div>
    </>
  );
}

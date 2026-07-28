import { DashboardHeader } from "@/components/dashboard-header";
import { AssignedTable } from "@/components/assigned-table";
import { StatCards } from "@/components/stat-cards";
import { prisma } from "@/lib/prisma";

export default async function AsignacionesPage() {
  const [assigned, total, pending, rejected] = await Promise.all([
    prisma.classroomRequest.findMany({
      where: {
        status: "APPROVED"
      },
      include: {
        coordinator: true,
        career: true,
        classroom: true,
        subject: true,
        groupSubject: {
          include: {
            group: true
          }
        },
        schedules: {
          include: {
            schoolHour: true
          },
          orderBy: [
            {
              schoolHour: {
                sortOrder: "asc"
              }
            }
          ]
        }
      },
      orderBy: {
        reviewedAt: "desc"
      }
    }),

    prisma.classroomRequest.count(),

    prisma.classroomRequest.count({
      where: {
        status: "PENDING"
      }
    }),

    prisma.classroomRequest.count({
      where: {
        status: "REJECTED"
      }
    })
  ]);

  return (
    <>
      <DashboardHeader
        title="Asignaciones aprobadas"
        subtitle="Salones asignados oficialmente"
      />

      <div className="content-wrap">
        <StatCards total={total} pending={pending} approved={assigned.length} rejected={rejected} />
        <AssignedTable requests={assigned} />
      </div>
    </>
  );
}
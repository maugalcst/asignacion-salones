import type { RequestStatus } from "@prisma/client";
import { DashboardHeader } from "@/components/dashboard-header";
import { RequestsTable } from "@/components/requests-table";
import { StatCards } from "@/components/stat-cards";
import { prisma } from "@/lib/prisma";

export default async function SolicitudesPage() {
  const [requests, grouped] = await Promise.all([
    prisma.classroomRequest.findMany({
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
        requestedAt: "desc"
      }
    }),

    prisma.classroomRequest.groupBy({
      by: ["status"],
      _count: true
    })
  ]);

  const count = (status: RequestStatus) =>
    grouped.find((x) => x.status === status)?._count ?? 0;

  return (
    <>
      <DashboardHeader
        title="Asignación de Salones"
        subtitle="Revisión de solicitudes · semestre activo"
      />

      <div className="content-wrap">
        <StatCards
          total={requests.length}
          pending={count("PENDING")}
          approved={count("APPROVED")}
          rejected={count("REJECTED")}
        />
        <RequestsTable requests={requests} />
      </div>
    </>
  );
}

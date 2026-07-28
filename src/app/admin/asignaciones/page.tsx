import { RequestStatus, WeekDay } from "@prisma/client";
import { DashboardHeader } from "@/components/dashboard-header";
import { StatCards } from "@/components/stat-cards";
import { prisma } from "@/lib/prisma";

const dayLabels: Record<WeekDay, string> = {
  MONDAY: "Lunes",
  TUESDAY: "Martes",
  WEDNESDAY: "Miércoles",
  THURSDAY: "Jueves",
  FRIDAY: "Viernes",
  SATURDAY: "Sábado"
};
const shortDayLabels = {
  MONDAY: "L",
  TUESDAY: "M",
  WEDNESDAY: "M",
  THURSDAY: "J",
  FRIDAY: "V",
  SATURDAY: "S"
} as const;

type ScheduleForFormat = {
  dayOfWeek: keyof typeof shortDayLabels;
  schoolHour: {
    code: string;
    startTime: string;
    endTime: string;
    sortOrder: number;
  };
};

function formatSchedules(schedules: ScheduleForFormat[]) {
  if (!schedules.length) return "Sin horario";

  const groupedByHour = new Map<
    string,
    {
      sortOrder: number;
      startTime: string;
      endTime: string;
      days: string[];
    }
  >();

  for (const schedule of schedules) {
    const hourCode = schedule.schoolHour.code;

    if (!groupedByHour.has(hourCode)) {
      groupedByHour.set(hourCode, {
        sortOrder: schedule.schoolHour.sortOrder,
        startTime: schedule.schoolHour.startTime,
        endTime: schedule.schoolHour.endTime,
        days: []
      });
    }

    groupedByHour.get(hourCode)?.days.push(shortDayLabels[schedule.dayOfWeek]);
  }

  return Array.from(groupedByHour.entries())
    .sort(([, a], [, b]) => a.sortOrder - b.sortOrder)
    .map(([hourCode, data]) => {
      return `${data.days.join("")} · ${hourCode} · ${data.startTime}-${data.endTime}`;
    })
    .join(", ");
}

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
        <StatCards
          total={total}
          pending={pending}
          approved={assigned.length}
          rejected={rejected}
        />

        <section className="table-card">
          <div className="table-heading">
            <div>
              <h2>Asignaciones activas</h2>
              <p>Solicitudes aprobadas por administración</p>
            </div>
          </div>

          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Coordinador</th>
                  <th>Carrera</th>
                  <th>Grupo</th>
                  <th>Materia</th>
                  <th>Salón</th>
                  <th>Horarios</th>
                  <th>Fecha de aprobación</th>
                </tr>
              </thead>

              <tbody>
                {assigned.map((request) => (
                  <tr key={request.id}>
                    <td>{request.coordinator.name}</td>

                    <td>
                      <span className="career-pill">
                        {request.career.acronym}
                      </span>
                    </td>

                    <td>{request.groupSubject?.group.code || "—"}</td>

                    <td>
                      {request.subject.code}
                      <br />
                      <small className="muted">{request.subject.type}</small>
                    </td>

                    <td>
                      {request.classroom.building}-{request.classroom.number}
                    </td>

                    <td>
                      <span className="schedule-chip">
                        {formatSchedules(request.schedules)}
                      </span>
                    </td>

                    <td>
                      {request.reviewedAt
                        ? new Intl.DateTimeFormat("es-MX", {
                          dateStyle: "medium"
                        }).format(request.reviewedAt)
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}
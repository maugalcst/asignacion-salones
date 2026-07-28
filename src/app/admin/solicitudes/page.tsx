import { RequestStatus, WeekDay } from "@prisma/client";
import { DashboardHeader } from "@/components/dashboard-header";
import { RequestActions } from "@/components/request-actions";
import { StatCards } from "@/components/stat-cards";
import { prisma } from "@/lib/prisma";


const dayLabels = {
  MONDAY: "Lunes",
  TUESDAY: "Martes",
  WEDNESDAY: "Miércoles",
  THURSDAY: "Jueves",
  FRIDAY: "Viernes",
  SATURDAY: "Sábado"
} as const;

const shortDayLabels = {
  MONDAY: "L",
  TUESDAY: "M",
  WEDNESDAY: "M",
  THURSDAY: "J",
  FRIDAY: "V",
  SATURDAY: "S"
} as const;

type RequestScheduleForFormat = {
  dayOfWeek: keyof typeof dayLabels;
  schoolHour: {
    code: string;
    startTime: string;
    endTime: string;
    sortOrder: number;
  };
};

function formatSchedules(schedules: RequestScheduleForFormat[]) {
  if (schedules.length === 0) return "Sin horario";

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
          pending={count(RequestStatus.PENDING)}
          approved={count(RequestStatus.APPROVED)}
          rejected={count(RequestStatus.REJECTED)}
        />

        <section className="table-card">
          <div className="table-heading">
            <div>
              <h2>Solicitudes activas</h2>
              <p>Ordenadas por fecha</p>
            </div>

            <input placeholder="Buscar por coordinador, carrera, semestre..." />
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
                  <th>Estado</th>
                  <th>Acciones</th>
                  <th>Fecha</th>
                </tr>
              </thead>

              <tbody>
                {requests.map((request) => (
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
                      <span className={`status ${request.status.toLowerCase()}`}>
                        {request.status === "PENDING"
                          ? "Pendiente"
                          : request.status === "APPROVED"
                            ? "Aprobado"
                            : "Rechazado"}
                      </span>
                    </td>

                    <td>
                      {request.status === RequestStatus.PENDING ? (
                        <RequestActions
                          requestId={request.id}
                          coordinator={request.coordinator.name}
                        />
                      ) : (
                        "—"
                      )}
                    </td>

                    <td>
                      {new Intl.DateTimeFormat("es-MX", {
                        dateStyle: "medium"
                      }).format(request.requestedAt)}
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

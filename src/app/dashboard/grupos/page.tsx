import { DashboardHeader } from "@/components/dashboard-header";
import { AssignedGroupsTable } from "@/components/assigned-groups-table";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const shortDayLabel: Record<string, string> = {
  MONDAY: "L",
  TUESDAY: "M",
  WEDNESDAY: "M",
  THURSDAY: "J",
  FRIDAY: "V",
  SATURDAY: "S"
};

const dayOrder: Record<string, number> = {
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6
};

type ScheduleRow = {
  dayOfWeek: string;
  schoolHour: { code: string; sortOrder: number };
};

function formatSchedule(schedules: ScheduleRow[]) {
  if (schedules.length === 0) return "";

  const byHour = new Map<string, { sortOrder: number; days: string[] }>();

  for (const schedule of schedules) {
    const code = schedule.schoolHour.code;

    if (!byHour.has(code)) {
      byHour.set(code, { sortOrder: schedule.schoolHour.sortOrder, days: [] });
    }

    byHour.get(code)?.days.push(schedule.dayOfWeek);
  }

  return Array.from(byHour.entries())
    .sort(([, a], [, b]) => a.sortOrder - b.sortOrder)
    .map(([code, data]) => {
      const days = data.days
        .sort((a, b) => (dayOrder[a] ?? 99) - (dayOrder[b] ?? 99))
        .map((day) => shortDayLabel[day] || day)
        .join("");

      return `${days} · ${code}`;
    })
    .join(", ");
}

export default async function AssignedGroupsPage() {
  const user = await requireUser();

  if (!user.careerId) {
    return (
      <>
        <DashboardHeader
          title="Grupos asignados"
          subtitle="Clases de tu carrera y el salón solicitado para cada una"
        />

        <div className="content-wrap">
          <section className="table-card coordinator-card">
            <div className="empty-row">
              Tu usuario no tiene una carrera asignada. Contacta al administrador.
            </div>
          </section>
        </div>
      </>
    );
  }

  // Una clase es el par materia + grupo (la "sección" del reporte de Servicios
  // Escolares), que es justo lo que representa GroupSubject. El número de grupo
  // se reinicia en cada materia, así que no se puede agrupar por ese código.
  const classes = await prisma.groupSubject.findMany({
    where: {
      group: {
        careerId: user.careerId
      }
    },
    include: {
      group: {
        select: {
          code: true,
          students: true
        }
      },
      subject: {
        select: {
          code: true,
          name: true
        }
      },
      // Solo las solicitudes propias: el avance mostrado es el del coordinador
      // que consulta, no el de toda la carrera.
      requests: {
        where: {
          coordinatorId: user.id
        },
        include: {
          classroom: {
            select: {
              building: true,
              number: true
            }
          },
          schedules: {
            include: {
              schoolHour: {
                select: {
                  code: true,
                  sortOrder: true
                }
              }
            }
          }
        },
        orderBy: {
          requestedAt: "desc"
        }
      }
    }
  });

  const rows = classes
    .map((item) => {
      const approved = item.requests.filter((request) => request.status === "APPROVED");
      const pending = item.requests.filter((request) => request.status === "PENDING");
      const rejected = item.requests.filter((request) => request.status === "REJECTED");

      // Una clase puede acumular varias solicitudes (p. ej. dos bloques de hora
      // aprobados y un rechazo posterior). Se muestra el estado más útil, no el
      // más reciente: lo aprobado manda, y solo si no hay nada aprobado importa
      // si algo sigue en revisión o fue rechazado.
      const status: "APPROVED" | "PENDING" | "REJECTED" | null = approved.length
        ? "APPROVED"
        : pending.length
          ? "PENDING"
          : rejected.length
            ? "REJECTED"
            : null;

      const shown = approved.length ? approved : pending;

      return {
        id: item.id,
        subjectCode: item.subject.code,
        subjectName: item.subject.name,
        groupCode: item.group.code,
        students: item.group.students,
        status,
        requestCount: item.requests.length,
        assignments: shown.map((request) => ({
          id: request.id,
          classroom: `${request.classroom.building}-${request.classroom.number}`,
          schedule: formatSchedule(request.schedules)
        }))
      };
    })
    .sort(
      (a, b) =>
        a.subjectCode.localeCompare(b.subjectCode, undefined, { numeric: true }) ||
        a.groupCode.localeCompare(b.groupCode, undefined, { numeric: true })
    );

  return (
    <>
      <DashboardHeader
        title="Grupos asignados"
        subtitle="Clases de tu carrera y el salón solicitado para cada una"
      />

      <div className="content-wrap">
        <AssignedGroupsTable classes={rows} />
      </div>
    </>
  );
}

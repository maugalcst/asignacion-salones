import { WeekDay } from "@prisma/client";
import { DashboardHeader } from "@/components/dashboard-header";
import { PendingSubjectsManager } from "@/components/pending-subjects-manager";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const dayLabels: Record<WeekDay, string> = {
  MONDAY: "Lunes",
  TUESDAY: "Martes",
  WEDNESDAY: "Miércoles",
  THURSDAY: "Jueves",
  FRIDAY: "Viernes",
  SATURDAY: "Sábado"
};

export default async function PendingSubjectsPage() {
  const user = await requireUser();

  if (!user.careerId) {
    return (
      <>
        <DashboardHeader
          title="Materias pendientes"
          subtitle="Coordina materias por grupo, día y hora escolar"
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

  const [subjects, groups, classrooms, schoolHours, busyRequests] =
    await Promise.all([
      prisma.subject.findMany({
        where: {
          careers: {
            some: {
              id: user.careerId
            }
          }
        },
        include: {
          careers: true,
          groupSubjects: {
            include: {
              group: {
                include: {
                  career: true
                }
              },
              requests: {
                include: {
                  classroom: true,
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
              }
            }
          }
        },
        orderBy: [
          {
            semester: "asc"
          },
          {
            name: "asc"
          }
        ]
      }),

      prisma.academicGroup.findMany({
        where: {
          careerId: user.careerId
        },
        include: {
          career: true
        },
        orderBy: [
          {
            semester: "asc"
          },
          {
            code: "asc"
          }
        ]
      }),

      prisma.classroom.findMany({
        where: {
          status: "AVAILABLE"
        },
        orderBy: [
          {
            building: "asc"
          },
          {
            floor: "asc"
          },
          {
            number: "asc"
          }
        ]
      }),

      prisma.schoolHour.findMany({
        orderBy: {
          sortOrder: "asc"
        }
      }),

      prisma.classroomRequest.findMany({
        where: {
          status: {
            in: ["PENDING", "APPROVED"]
          }
        },
        include: {
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
        }
      })
    ]);

  const days = Object.entries(dayLabels).map(([value, label]) => ({
    value: value as WeekDay,
    label
  }));

  return (
    <>
      <DashboardHeader
        title="Materias pendientes"
        subtitle="Coordina materias por grupo, día y hora escolar"
      />

      <PendingSubjectsManager
        subjects={subjects}
        groups={groups}
        classrooms={classrooms}
        schoolHours={schoolHours}
        days={days}
        busyRequests={busyRequests}
      />
    </>
  );
}
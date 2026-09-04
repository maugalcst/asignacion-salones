import { DashboardHeader } from "@/components/dashboard-header";
import { PendingSubjectsManager } from "@/components/pending-subjects-manager";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

  const [subjects, groups, classrooms, schoolHours, busyRequests, careerRequests] =
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
                // Solo las propias: un coordinador no debe ver las solicitudes
                // de otro, ni sus motivos de rechazo.
                where: {
                  coordinatorId: user.id
                },
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
        include: {
          unavailable: {
            where: {
              active: true
            },
            include: {
              schoolHour: true
            }
          }
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
        }
      }),

      // Solicitudes propias del coordinador, una entrada por solicitud (no por
      // horario) para poder listarlas y filtrarlas en la vista aparte. Se filtra
      // por coordinatorId para que nadie vea las solicitudes de otro coordinador.
      prisma.classroomRequest.findMany({
        where: {
          coordinatorId: user.id
        },
        include: {
          subject: true,
          classroom: true,
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
      })
    ]);

  const transformedSubjects = subjects.map(s => ({
    id: s.id, code: s.code, name: s.name, type: s.type, semester: s.semester, cantidad: s.cantidad, careers: s.careers,
    groupSubjects: s.groupSubjects.map(gs => ({
      id: gs.id,
      group: gs.group,
      requests: gs.requests.flatMap(r =>
        r.schedules.map(sch => ({
          id: r.id,
          dayOfWeek: sch.dayOfWeek,
          status: r.status,
          rejectionReason: r.rejectionReason,
          classroom: r.classroom,
          schoolHour: sch.schoolHour,
          schedules: [{
            dayOfWeek: sch.dayOfWeek,
            schoolHourId: sch.schoolHourId,
            schoolHour: sch.schoolHour
          }]
        }))
      )
    }))
  }));

  const transformedClassrooms = classrooms.map(c => ({
    id: c.id,
    building: c.building,
    floor: c.floor,
    number: c.number,
    capacity: c.capacity,
    type: c.type,
    unavailable: c.unavailable.map(u => ({
      dayOfWeek: u.dayOfWeek,
      schoolHourId: u.schoolHourId
    }))
  }));

  const transformedBusy = busyRequests.map(r => ({
    classroomId: r.classroom!.id,
    schedules: r.schedules.map(sch => ({
      dayOfWeek: sch.dayOfWeek,
      schoolHourId: sch.schoolHourId
    }))
  }));

  const transformedRequests = careerRequests.map(r => ({
    id: r.id,
    status: r.status,
    rejectionReason: r.rejectionReason,
    requestedAt: r.requestedAt,
    groupCode: r.groupSubject?.group.code ?? null,
    subject: { code: r.subject.code, name: r.subject.name, type: r.subject.type },
    classroom: {
      number: r.classroom.number,
      building: r.classroom.building,
      floor: r.classroom.floor
    },
    schedules: r.schedules.map(sch => ({
      dayOfWeek: sch.dayOfWeek,
      schoolHourId: sch.schoolHourId,
      schoolHour: {
        code: sch.schoolHour.code,
        startTime: sch.schoolHour.startTime,
        endTime: sch.schoolHour.endTime,
        sortOrder: sch.schoolHour.sortOrder
      }
    }))
  }));

  const buildings = Array.from(new Set(classrooms.map(c => c.building))).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const shifts = Array.from(new Set(schoolHours.map(h => h.shift)));

  return (
    <>
      <DashboardHeader
        title="Materias pendientes"
        subtitle="Coordina materias por grupo, día y hora escolar"
      />

      <PendingSubjectsManager
        subjects={transformedSubjects}
        groups={groups}
        classrooms={transformedClassrooms}
        schoolHours={schoolHours}
        buildings={buildings}
        shifts={shifts}
        busyRequests={transformedBusy}
        careerRequests={transformedRequests}
      />
    </>
  );
}
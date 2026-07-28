import { ClassroomStatus, WeekDay } from "@prisma/client";
import { DashboardHeader } from "@/components/dashboard-header";
import { prisma } from "@/lib/prisma";

const dayLabels: Record<WeekDay, string> = {
  MONDAY: "Lunes",
  TUESDAY: "Martes",
  WEDNESDAY: "Miércoles",
  THURSDAY: "Jueves",
  FRIDAY: "Viernes",
  SATURDAY: "Sábado"
};

const statusLabel: Record<ClassroomStatus, string> = {
  AVAILABLE: "Disponible",
  MAINTENANCE: "Mantenimiento",
  UNAVAILABLE: "Inhabilitado"
};

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
        <section className="table-card coordinator-card classroom-card">
          <div className="table-heading"><div><h2>Edificios y salones</h2><p>La disponibilidad final se valida al enviar la solicitud por día y hora.</p></div><input placeholder="Buscar salón..." /></div>
          <div className="table-scroll">
            <table>
              <thead><tr><th>Edificio</th><th>Piso</th><th>Salón</th><th>Capacidad</th><th>Tipo</th><th>Estado</th><th>Ocupado / Bloqueado</th></tr></thead>
              <tbody>{classrooms.map((classroom) => <tr key={classroom.id}>
                <td>{classroom.building}</td><td>{classroom.floor}</td><td>{classroom.number}</td><td>{classroom.capacity}</td><td>{classroom.type}</td><td><span className={`status ${classroom.status.toLowerCase()}`}>{statusLabel[classroom.status]}</span>{classroom.blockReason ? <small className="status-note">{classroom.blockReason}</small> : null}</td>
                <td><div className="schedule-list">
                  {classroom.requests.flatMap((request) => request.schedules.map((sch) => <span className="schedule-chip" key={`${request.id}-${sch.id}`}>{dayLabels[sch.dayOfWeek]} · {sch.schoolHour.code}</span>))}
                  {classroom.unavailable.map((slot) => <span className="schedule-chip blocked" key={`b-${slot.id}`}>{dayLabels[slot.dayOfWeek]} · {slot.schoolHour.code} · {slot.reason}</span>)}
                  {classroom.requests.length === 0 && classroom.unavailable.length === 0 ? <span className="muted">Sin bloqueos</span> : null}
                </div></td>
              </tr>)}</tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}

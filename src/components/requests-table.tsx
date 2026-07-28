"use client";

import { useMemo, useState } from "react";
import { RequestActions } from "./request-actions";

const dayLabels: Record<string, string> = {
  MONDAY: "Lunes", TUESDAY: "Martes", WEDNESDAY: "Miércoles",
  THURSDAY: "Jueves", FRIDAY: "Viernes", SATURDAY: "Sábado"
};

const shortDayLabels: Record<string, string> = {
  MONDAY: "L", TUESDAY: "M", WEDNESDAY: "M",
  THURSDAY: "J", FRIDAY: "V", SATURDAY: "S"
};

const statusLabels: Record<string, string> = {
  PENDING: "Pendiente", APPROVED: "Aprobado", REJECTED: "Rechazado"
};

const statusOptions = [
  { value: "all", label: "Estado" },
  { value: "PENDING", label: "Pendiente" },
  { value: "APPROVED", label: "Aprobado" },
  { value: "REJECTED", label: "Rechazado" }
];

type Schedule = {
  dayOfWeek: string;
  schoolHour: { code: string; startTime: string; endTime: string; sortOrder: number };
};

type Request = {
  id: number;
  status: string;
  requestedAt: Date;
  coordinator: { name: string };
  career: { id: number; acronym: string; name: string };
  classroom: { building: string; number: string };
  subject: { code: string; name: string; type: string };
  groupSubject: { group: { code: string } } | null;
  semester: number;
  schedules: Schedule[];
};

function formatSchedules(schedules: Schedule[]) {
  if (schedules.length === 0) return "Sin horario";
  const groupedByHour = new Map<string, { sortOrder: number; startTime: string; endTime: string; days: string[] }>();
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
    groupedByHour.get(hourCode)?.days.push(shortDayLabels[schedule.dayOfWeek] || schedule.dayOfWeek);
  }
  return Array.from(groupedByHour.entries())
    .sort(([, a], [, b]) => a.sortOrder - b.sortOrder)
    .map(([hourCode, data]) => `${data.days.join("")} · ${hourCode} · ${data.startTime}-${data.endTime}`)
    .join(", ");
}

export function RequestsTable({ requests }: { requests: Request[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [careerFilter, setCareerFilter] = useState("all");

  const careers = useMemo(() =>
    [...new Map(requests.map(r => [r.career.id, r.career])).values()],
    [requests]
  );

  const filtered = useMemo(() =>
    requests.filter(r => {
      if (search) {
        const q = search.toLowerCase();
        if (
          !r.coordinator.name.toLowerCase().includes(q) &&
          !r.career.acronym.toLowerCase().includes(q) &&
          !r.career.name.toLowerCase().includes(q) &&
          !r.semester.toString().includes(q) &&
          !r.subject.code.toLowerCase().includes(q) &&
          !r.subject.name.toLowerCase().includes(q) &&
          !r.classroom.building.toLowerCase().includes(q) &&
          !r.classroom.number.toLowerCase().includes(q) &&
          !(r.groupSubject?.group.code || "").toLowerCase().includes(q)
        ) return false;
      }
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (careerFilter !== "all" && r.career.id.toString() !== careerFilter) return false;
      return true;
    }),
    [requests, search, statusFilter, careerFilter]
  );

  return (
    <section className="table-card">
      <div className="table-heading">
        <div>
          <h2>Solicitudes activas</h2>
          <p>Ordenadas por fecha</p>
        </div>
        <div className="table-filters">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={careerFilter} onChange={e => setCareerFilter(e.target.value)}>
            <option value="all">Carrera</option>
            {careers.map(c => <option key={c.id} value={c.id}>{c.acronym}</option>)}
          </select>
          <input placeholder="Buscar por coordinador, carrera, materia, salón..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Coordinador</th><th>Carrera</th><th>Grupo</th><th>Materia</th>
              <th>Salón</th><th>Horarios</th><th>Estado</th><th>Acciones</th><th>Fecha</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={9} className="empty-state">No se encontraron solicitudes que coincidan con la búsqueda.</td></tr>
            ) : (
              filtered.map(r => (
                <tr key={r.id}>
                  <td>{r.coordinator.name}</td>
                  <td><span className="career-pill">{r.career.acronym}</span></td>
                  <td>{r.groupSubject?.group.code || "—"}</td>
                  <td>{r.subject.code}<br /><small className="muted">{r.subject.type}</small></td>
                  <td>{r.classroom.building}-{r.classroom.number}</td>
                  <td><span className="schedule-chip">{formatSchedules(r.schedules)}</span></td>
                  <td><span className={`status ${r.status.toLowerCase()}`}>{statusLabels[r.status] || r.status}</span></td>
                  <td>{r.status === "PENDING" ? <RequestActions requestId={r.id} coordinator={r.coordinator.name} /> : "—"}</td>
                  <td>{new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(new Date(r.requestedAt))}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

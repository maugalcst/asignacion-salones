"use client";

import { useMemo, useState } from "react";

const dayLabels: Record<string, string> = {
  MONDAY: "Lunes", TUESDAY: "Martes", WEDNESDAY: "Miércoles",
  THURSDAY: "Jueves", FRIDAY: "Viernes", SATURDAY: "Sábado"
};

const dayOptions = [
  { value: "MONDAY", label: "Lunes" }, { value: "TUESDAY", label: "Martes" },
  { value: "WEDNESDAY", label: "Miércoles" }, { value: "THURSDAY", label: "Jueves" },
  { value: "FRIDAY", label: "Viernes" }, { value: "SATURDAY", label: "Sábado" }
];

type Schedule = {
  id: number;
  dayOfWeek: string;
  schoolHour: { code: string; startTime: string };
};

type Request = {
  id: number;
  status: string;
  reviewedAt: Date | null;
  semester: number;
  coordinator: { name: string };
  career: { id: number; acronym: string };
  classroom: { building: string; number: string };
  subject: { code: string };
  groupSubject: { group: { code: string } } | null;
  schedules: Schedule[];
};

export function AssignedTable({ requests }: { requests: Request[] }) {
  const [search, setSearch] = useState("");
  const [careerFilter, setCareerFilter] = useState("all");
  const [dayFilter, setDayFilter] = useState("all");
  const [buildingFilter, setBuildingFilter] = useState("all");

  const careers = useMemo(() =>
    [...new Map(requests.map(r => [r.career.id, r.career])).values()],
    [requests]
  );
  const buildings = useMemo(() =>
    [...new Set(requests.map(r => r.classroom.building))].sort(),
    [requests]
  );

  const filtered = useMemo(() =>
    requests.filter(r => {
      if (search) {
        const q = search.toLowerCase();
        if (
          !r.coordinator.name.toLowerCase().includes(q) &&
          !r.career.acronym.toLowerCase().includes(q) &&
          !r.semester.toString().includes(q) &&
          !r.subject.code.toLowerCase().includes(q) &&
          !`${r.classroom.building}-${r.classroom.number}`.toLowerCase().includes(q) &&
          !r.classroom.building.toLowerCase().includes(q) &&
          !(r.groupSubject?.group.code || "").toLowerCase().includes(q)
        ) return false;
      }
      if (careerFilter !== "all" && r.career.id.toString() !== careerFilter) return false;
      if (dayFilter !== "all" && !r.schedules.some(s => s.dayOfWeek === dayFilter)) return false;
      if (buildingFilter !== "all" && r.classroom.building !== buildingFilter) return false;
      return true;
    }),
    [requests, search, careerFilter, dayFilter, buildingFilter]
  );

  const rows = useMemo(() =>
    filtered.flatMap(r =>
      r.schedules.map(s => ({ ...r, schedule: s }))
    ),
    [filtered]
  );

  return (
    <section className="table-card">
      <div className="table-heading">
        <div>
          <h2>Salones asignados</h2>
          <p>Semestre Ago-Dic 2026 · Ordenadas por fecha</p>
        </div>
        <div className="table-filters">
          <select value={careerFilter} onChange={e => setCareerFilter(e.target.value)}>
            <option value="all">Carrera</option>
            {careers.map(c => <option key={c.id} value={c.id}>{c.acronym}</option>)}
          </select>
          <select value={dayFilter} onChange={e => setDayFilter(e.target.value)}>
            <option value="all">Día</option>
            {dayOptions.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
          <select value={buildingFilter} onChange={e => setBuildingFilter(e.target.value)}>
            <option value="all">Edificio</option>
            {buildings.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <input placeholder="Buscar por coordinador, carrera, materia, salón..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Coordinador</th><th>Carrera</th><th>Grupo</th><th>Semestre</th>
              <th>Salón</th><th>Materia</th><th>Día</th><th>Hora</th><th>Fecha de asignación</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={9} className="empty-state">No se encontraron asignaciones que coincidan con la búsqueda.</td></tr>
            ) : (
              rows.map(x => (
                <tr key={`${x.id}-${x.schedule.id}`}>
                  <td>{x.coordinator.name}</td>
                  <td><span className="career-pill">{x.career.acronym}</span></td>
                  <td>{x.groupSubject?.group.code || "—"}</td>
                  <td>{x.semester}to</td>
                  <td>{x.classroom.building}-{x.classroom.number}</td>
                  <td>{x.subject.code}</td>
                  <td>{dayLabels[x.schedule.dayOfWeek]}</td>
                  <td>{x.schedule.schoolHour.code} · {x.schedule.schoolHour.startTime}</td>
                  <td>{x.reviewedAt ? new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(new Date(x.reviewedAt)) : "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

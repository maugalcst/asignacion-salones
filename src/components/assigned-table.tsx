"use client";

import { useMemo, useState } from "react";
import { ExportButton } from "./export-button";
import {
  dayLabels,
  dayOptions,
  emptyAssignmentFilters,
  expandBySchedule,
  matchesAssignmentFilters,
  type AssignmentSchedule
} from "@/lib/assignment-filters";

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
  schedules: AssignmentSchedule[];
};

export function AssignedTable({ requests }: { requests: Request[] }) {
  const [search, setSearch] = useState(emptyAssignmentFilters.search);
  const [careerFilter, setCareerFilter] = useState(emptyAssignmentFilters.career);
  const [dayFilter, setDayFilter] = useState(emptyAssignmentFilters.day);
  const [buildingFilter, setBuildingFilter] = useState(emptyAssignmentFilters.building);

  const careers = useMemo(() =>
    [...new Map(requests.map(r => [r.career.id, r.career])).values()],
    [requests]
  );
  const buildings = useMemo(() =>
    [...new Set(requests.map(r => r.classroom.building))].sort(),
    [requests]
  );

  const filters = useMemo(
    () => ({ search, career: careerFilter, day: dayFilter, building: buildingFilter }),
    [search, careerFilter, dayFilter, buildingFilter]
  );

  const filtered = useMemo(
    () => requests.filter(r => matchesAssignmentFilters(r, filters)),
    [requests, filters]
  );

  const rows = useMemo(() => expandBySchedule(filtered, filters.day), [filtered, filters.day]);

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
          <ExportButton
            url={`/admin/asignaciones/export?${new URLSearchParams({
              buscar: filters.search,
              carrera: filters.career,
              dia: filters.day,
              edificio: filters.building
            })}`}
            fileBaseName="salones-asignados"
            emptyMessage={rows.length === 0 ? "No hay asignaciones que exportar" : undefined}
            title="Descargar los salones asignados visibles en Excel"
          />
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

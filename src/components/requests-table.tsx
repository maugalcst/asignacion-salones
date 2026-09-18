"use client";

import { useMemo, useState } from "react";
import { ExportButton } from "./export-button";
import { RequestActions } from "./request-actions";
import {
  emptyFilters,
  formatSchedules,
  matchesFilters,
  statusLabels,
  type FilterableSchedule
} from "@/lib/request-filters";

const statusOptions = [
  { value: "all", label: "Estado" },
  { value: "PENDING", label: "Pendiente" },
  { value: "APPROVED", label: "Aprobado" },
  { value: "REJECTED", label: "Rechazado" }
];

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
  schedules: FilterableSchedule[];
};

export function RequestsTable({ requests }: { requests: Request[] }) {
  const [search, setSearch] = useState(emptyFilters.search);
  const [statusFilter, setStatusFilter] = useState(emptyFilters.status);
  const [careerFilter, setCareerFilter] = useState(emptyFilters.career);
  const careers = useMemo(() =>
    [...new Map(requests.map(r => [r.career.id, r.career])).values()],
    [requests]
  );

  const filters = useMemo(
    () => ({ search, status: statusFilter, career: careerFilter }),
    [search, statusFilter, careerFilter]
  );

  const filtered = useMemo(
    () => requests.filter(r => matchesFilters(r, filters)),
    [requests, filters]
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
          <ExportButton
            url={`/admin/solicitudes/export?${new URLSearchParams({
              buscar: filters.search,
              estado: filters.status,
              carrera: filters.career
            })}`}
            fileBaseName="solicitudes"
            emptyMessage={filtered.length === 0 ? "No hay solicitudes que exportar" : undefined}
            title="Descargar las solicitudes visibles en Excel"
          />
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

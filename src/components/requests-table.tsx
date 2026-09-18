"use client";

import { useMemo, useState } from "react";
import { FileSpreadsheet, Loader2 } from "lucide-react";
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
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

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

  // Se descarga por fetch y no con un enlace directo para poder avisar cuando
  // algo sale mal: si la sesión expiró, un enlace guardaría la página de login
  // dentro de un archivo .xlsx que Excel ya no puede abrir.
  const exportToExcel = async () => {
    setExporting(true);
    setExportError(null);

    try {
      const query = new URLSearchParams({
        buscar: filters.search,
        estado: filters.status,
        carrera: filters.career
      });

      const response = await fetch(`/admin/solicitudes/export?${query}`);

      if (!response.ok) {
        throw new Error(await response.text() || "No se pudo generar el archivo.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `solicitudes-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "No se pudo generar el archivo.");
    } finally {
      setExporting(false);
    }
  };

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
          <button
            type="button"
            className="export-button"
            onClick={exportToExcel}
            disabled={exporting || filtered.length === 0}
            title={filtered.length === 0 ? "No hay solicitudes que exportar" : "Descargar las solicitudes visibles en Excel"}
          >
            {exporting
              ? <><Loader2 size={14} className="spin" /> Generando...</>
              : <><FileSpreadsheet size={14} /> Exportar Excel</>}
          </button>
        </div>
      </div>

      {exportError && <p className="export-error">{exportError}</p>}

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

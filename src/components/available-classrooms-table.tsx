"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

const dayLabels: Record<string, string> = {
  MONDAY: "Lunes", TUESDAY: "Martes", WEDNESDAY: "Miércoles",
  THURSDAY: "Jueves", FRIDAY: "Viernes", SATURDAY: "Sábado"
};

const statusLabel: Record<string, string> = {
  AVAILABLE: "Disponible", MAINTENANCE: "Mantenimiento", UNAVAILABLE: "Inhabilitado"
};

type SchoolHour = { code: string; startTime: string; endTime: string };
type Schedule = { dayOfWeek: string; schoolHour: SchoolHour };
type RequestItem = { id: number; schedules: Schedule[] };
type UnavailableSlot = { id: number; dayOfWeek: string; reason: string; schoolHour: { code: string } };

type Classroom = {
  id: number; building: string; floor: number; number: string;
  capacity: number; type: string; status: string; blockReason: string | null;
  requests: RequestItem[]; unavailable: UnavailableSlot[];
};

export function AvailableClassroomsTable({ classrooms }: { classrooms: Classroom[] }) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc" | null>(null);

  const handleSort = (key: string) => {
    if (sortKey !== key) { setSortKey(key); setSortDir("asc"); }
    else if (sortDir === "asc") { setSortDir("desc"); }
    else { setSortKey(null); setSortDir(null); }
  };
  const SortIcon = ({ column }: { column: string }) => {
    if (sortKey !== column) return <ArrowUpDown size={12} />;
    return sortDir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />;
  };

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return classrooms;
    return classrooms.filter(x =>
      x.number.toLowerCase().includes(term) ||
      x.building.toLowerCase().includes(term) ||
      statusLabel[x.status].toLowerCase().includes(term) ||
      x.type.toLowerCase().includes(term)
    );
  }, [classrooms, search]);

  const sorted = useMemo(() => {
    if (!sortKey || !sortDir) return filtered;
    return [...filtered].sort((a, b) => {
      let av: string | number, bv: string | number;
      if (sortKey === "building") { av = a.building; bv = b.building; }
      else if (sortKey === "floor") { av = a.floor; bv = b.floor; return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number); }
      else if (sortKey === "number") { av = a.number; bv = b.number; }
      else if (sortKey === "capacity") { av = a.capacity; bv = b.capacity; return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number); }
      else return 0;
      const al = (av as string).toLowerCase(), bl = (bv as string).toLowerCase();
      return al < bl ? (sortDir === "asc" ? -1 : 1) : al > bl ? (sortDir === "asc" ? 1 : -1) : 0;
    });
  }, [filtered, sortKey, sortDir]);

  return (
    <section className="table-card coordinator-card classroom-card">
      <div className="table-heading">
        <div><h2>Edificios y salones</h2><p>La disponibilidad final se valida al enviar la solicitud por día y hora.</p></div>
        <div className="table-filters">
          <input
            placeholder="Buscar salón, edificio, estado o tipo..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>
      <div className="table-scroll">
        <table>
          <thead><tr>
            <th className="sortable" onClick={() => handleSort("building")}><SortIcon column="building" /> Edificio</th>
            <th className="sortable" onClick={() => handleSort("floor")}><SortIcon column="floor" /> Piso</th>
            <th className="sortable" onClick={() => handleSort("number")}><SortIcon column="number" /> Salón</th>
            <th className="sortable" onClick={() => handleSort("capacity")}><SortIcon column="capacity" /> Capacidad</th>
            <th>Tipo</th><th>Estado</th><th>Ocupado / Bloqueado</th>
          </tr></thead>
          <tbody>{sorted.length === 0 ? (
            <tr><td colSpan={7} className="empty-state">No se encontraron salones que coincidan con la búsqueda.</td></tr>
          ) : sorted.map((classroom) => <tr key={classroom.id}>
            <td>{classroom.building}</td><td>{classroom.floor}</td><td>{classroom.number}</td><td>{classroom.capacity}</td>
            <td>{classroom.type}</td>
            <td><span className={`status ${classroom.status.toLowerCase()}`}>{statusLabel[classroom.status]}</span>{classroom.blockReason ? <small className="status-note">{classroom.blockReason}</small> : null}</td>
            <td><div className="schedule-list">
              {classroom.requests.flatMap((request) => request.schedules.map((sch) => (
                <span className="schedule-chip" key={`${request.id}-${sch.schoolHour.code}`}>
                  {dayLabels[sch.dayOfWeek]} · {sch.schoolHour.code}
                </span>
              )))}
              {classroom.unavailable.map((slot) => (
                <span className="schedule-chip blocked" key={`b-${slot.id}`}>
                  {dayLabels[slot.dayOfWeek]} · {slot.schoolHour.code} · {slot.reason}
                </span>
              ))}
              {classroom.requests.length === 0 && classroom.unavailable.length === 0 ? (
                <span className="muted">Sin bloqueos</span>
              ) : null}
            </div></td>
          </tr>)}</tbody>
        </table>
      </div>
    </section>
  );
}

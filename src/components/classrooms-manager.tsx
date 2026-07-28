"use client";

import { useMemo, useState, useTransition } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ArrowUpDown, Pencil, Plus, Trash2 } from "lucide-react";
import { deleteClassroomAction, saveClassroomAction } from "@/app/actions";

type ClassroomStatus = "AVAILABLE" | "MAINTENANCE" | "UNAVAILABLE";
type Classroom = { id: number; building: string; floor: number; number: string; capacity: number; status: ClassroomStatus; blockReason: string | null };
type FormState = { id: number; building: string; floor: string; number: string; capacity: string; status: ClassroomStatus; blockReason: string };
const empty: FormState = { id: 0, building: "", floor: "", number: "", capacity: "", status: "AVAILABLE", blockReason: "" };
const PAGE_SIZE = 10;

const statusLabel: Record<ClassroomStatus, string> = {
  AVAILABLE: "Disponible",
  MAINTENANCE: "Mantenimiento",
  UNAVAILABLE: "Inhabilitado"
};

export function ClassroomsManager({ classrooms }: { classrooms: Classroom[] }) {
  const [mode, setMode] = useState<"add" | "edit" | "delete" | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [buildingFilter, setBuildingFilter] = useState("");
  const [floorFilter, setFloorFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc" | null>(null);
  const [pending, startTransition] = useTransition();

  const handleSort = (key: string) => {
    if (sortKey !== key) { setSortKey(key); setSortDir("asc"); }
    else if (sortDir === "asc") { setSortDir("desc"); }
    else { setSortKey(null); setSortDir(null); }
  };
  const SortIcon = ({ column }: { column: string }) => {
    if (sortKey !== column) return <ArrowUpDown size={12} />;
    return sortDir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />;
  };

  const buildings = useMemo(() => [...new Set(classrooms.map(x => x.building))].sort((a, b) => Number(a) - Number(b)), [classrooms]);
  const floors = useMemo(() => [...new Set(classrooms.map(x => x.floor))].sort((a, b) => a - b), [classrooms]);
  const filtered = useMemo(() => classrooms.filter(x => {
    const term = search.trim().toLowerCase();
    return (!buildingFilter || x.building === buildingFilter)
      && (!floorFilter || String(x.floor) === floorFilter)
      && (!statusFilter || x.status === statusFilter)
      && (!term || x.number.toLowerCase().includes(term) || x.building.toLowerCase().includes(term) || statusLabel[x.status].toLowerCase().includes(term));
  }), [classrooms, buildingFilter, floorFilter, statusFilter, search]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const sorted = (() => {
    if (!sortKey || !sortDir) return filtered;
    return [...filtered].sort((a, b) => {
      let av: string | number, bv: string | number;
      if (sortKey === "building") { av = a.building; bv = b.building; }
      else if (sortKey === "floor") { av = a.floor; bv = b.floor; if (typeof av === "number" && typeof bv === "number") return sortDir === "asc" ? av - bv : bv - av; }
      else if (sortKey === "number") { av = a.number; bv = b.number; }
      else if (sortKey === "capacity") { av = a.capacity; bv = b.capacity; if (typeof av === "number" && typeof bv === "number") return sortDir === "asc" ? av - bv : bv - av; }
      else return 0;
      const al = (av as string).toLowerCase(), bl = (bv as string).toLowerCase();
      return al < bl ? (sortDir === "asc" ? -1 : 1) : al > bl ? (sortDir === "asc" ? 1 : -1) : 0;
    });
  })();
  const visible = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const selected = classrooms.find(x => x.id === form.id);

  const openAdd = () => { setForm(empty); setMode("add"); };
  const openEdit = (x: Classroom) => {
    setForm({ id: x.id, building: x.building, floor: String(x.floor), number: x.number, capacity: String(x.capacity), status: x.status, blockReason: x.blockReason || "" });
    setMode("edit");
  };
  const save = () => startTransition(async () => {
    const fd = new FormData();
    if (form.id) fd.set("id", String(form.id));
    fd.set("building", form.building);
    fd.set("floor", form.floor);
    fd.set("number", form.number);
    fd.set("capacity", form.capacity);
    fd.set("status", form.status);
    fd.set("blockReason", form.blockReason);
    await saveClassroomAction(fd);
    setMode(null);
  });
  const remove = () => startTransition(async () => {
    const fd = new FormData(); fd.set("id", String(form.id));
    await deleteClassroomAction(fd); setMode(null);
  });
  const changeFilter = (setter: (value: string) => void, value: string) => { setter(value); setPage(1); };

  return <div className="classrooms-page">
    <section className="table-card subject-card classroom-card">
      <div className="table-heading">
        <div><h2>Edificios y salones registrados</h2><p>Administra disponibilidad general, mantenimiento y capacidad.</p></div>
        <div className="table-filters">
          <select value={buildingFilter} onChange={e => changeFilter(setBuildingFilter, e.target.value)}><option value="">Edificio</option>{buildings.map(x => <option key={x} value={x}>Edificio {x}</option>)}</select>
          <select value={floorFilter} onChange={e => changeFilter(setFloorFilter, e.target.value)}><option value="">Piso</option>{floors.map(x => <option key={x} value={x}>Piso {x}</option>)}</select>
          <select value={statusFilter} onChange={e => changeFilter(setStatusFilter, e.target.value)}><option value="">Estado</option><option value="AVAILABLE">Disponible</option><option value="UNAVAILABLE">Inhabilitado</option></select>
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Buscar salón..." />
          <button className="round-add" onClick={openAdd} aria-label="Agregar salón"><Plus size={20} /></button>
        </div>
      </div>
      <div className="table-scroll"><table><thead><tr>
        <th className="sortable" onClick={() => handleSort("building")}><SortIcon column="building" /> Edificio</th><th className="sortable" onClick={() => handleSort("floor")}><SortIcon column="floor" /> Piso</th><th className="sortable" onClick={() => handleSort("number")}><SortIcon column="number" /> Salón</th><th className="sortable" onClick={() => handleSort("capacity")}><SortIcon column="capacity" /> Cantidad</th><th>Estado</th><th>Motivo</th><th>Acciones</th>
      </tr></thead><tbody>{visible.map(x => <tr key={x.id}><td>{x.building}</td><td>{x.floor}</td><td>{x.number}</td><td>{x.capacity}</td><td><span className={`status ${x.status.toLowerCase()}`}>{statusLabel[x.status]}</span></td><td>{x.blockReason || "—"}</td><td><div className="crud-actions"><button className="edit-btn" onClick={() => openEdit(x)} aria-label="Editar salón"><Pencil size={17} /></button><button className="delete-btn" onClick={() => { setForm({ ...empty, id: x.id }); setMode("delete") }} aria-label="Eliminar salón"><Trash2 size={17} /></button></div></td></tr>)}</tbody></table></div>
      <div className="pagination"><button disabled={safePage <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}><ArrowLeft size={18} /></button><button disabled={safePage >= pageCount} onClick={() => setPage(p => Math.min(pageCount, p + 1))}><ArrowRight size={18} /></button></div>
    </section>

    {mode && <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !pending) {
          setMode(null);
        }
      }}
    ><div className={`modal crud-modal classroom-modal ${mode === "delete" ? "confirm-modal" : ""}`}>
        {mode === "delete" ? <><h2>Eliminar salón</h2><p>¿Estás seguro de eliminar el salón?</p><strong className="confirm-name">Salón: {selected?.number}</strong><div className="confirm-actions"><button className="danger-wide" disabled={pending} onClick={remove}>Eliminar salón</button><button onClick={() => setMode(null)}>Cancelar</button></div></>
          : <><h2>{mode === "add" ? "Agregar salón" : "Editar salón"}</h2><div className="crud-form">
            <div className="form-grid-2">
              <div>
                <label>Edificio</label>
                <input
                  placeholder="Edificio"
                  value={form.building}
                  onChange={e => setForm({ ...form, building: e.target.value })}
                />
              </div>

              <div>
                <label>Piso</label>
                <input
                  type="number"
                  min="0"
                  placeholder="Piso"
                  value={form.floor}
                  onChange={e => setForm({ ...form, floor: e.target.value })}
                />
              </div>
            </div>

            <div className="form-grid-2">
              <div>
                <label>Salón</label>
                <input
                  placeholder="Salón"
                  value={form.number}
                  onChange={e => setForm({ ...form, number: e.target.value })}
                />
              </div>

              <div>
                <label>Capacidad</label>
                <input
                  type="number"
                  min="1"
                  placeholder="Capacidad"
                  value={form.capacity}
                  onChange={e => setForm({ ...form, capacity: e.target.value })}
                />
              </div>
            </div>

            <label>Estado</label>
            <select
              value={form.status}
              onChange={e => {
                const newStatus = e.target.value as ClassroomStatus;
                setForm({
                  ...form,
                  status: newStatus,
                  blockReason: newStatus === "AVAILABLE" ? "" : form.blockReason
                });
              }}
            >
              <option value="AVAILABLE">Disponible</option>
              <option value="UNAVAILABLE">Inhabilitado</option>
            </select>

            {form.status === "UNAVAILABLE" && (
              <>
                <label>Motivo de inhabilitación</label>
                <textarea
                  placeholder="Detalle del motivo de inhabilitación..."
                  value={form.blockReason || ""}
                  onChange={e => setForm({ ...form, blockReason: e.target.value })}
                />
              </>
            )}
          </div><div className="form-actions"><button className="cancel-red" onClick={() => setMode(null)}>Cancelar</button><button className="accept-green" disabled={pending} onClick={save}>Aceptar</button></div></>}
      </div></div>}
  </div>;
}

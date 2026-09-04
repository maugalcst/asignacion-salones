"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ArrowUpDown } from "lucide-react";

type ClassRow = {
    id: number;
    subjectCode: string;
    subjectName: string;
    groupCode: string;
    students: number;
    status: "PENDING" | "APPROVED" | "REJECTED" | null;
    requestCount: number;
    assignments: {
        id: number;
        classroom: string;
        schedule: string;
    }[];
};

const PAGE_SIZE = 15;

const statusLabel: Record<string, string> = {
    PENDING: "En revisión",
    APPROVED: "Aprobada",
    REJECTED: "Rechazada"
};

export function AssignedGroupsTable({ classes }: { classes: ClassRow[] }) {
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [page, setPage] = useState(1);
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

    const requestedCount = useMemo(
        () => classes.filter((item) => item.status !== null).length,
        [classes]
    );

    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase();

        return classes.filter((item) => {
            if (statusFilter === "NONE" && item.status !== null) return false;
            if (statusFilter && statusFilter !== "NONE" && item.status !== statusFilter) return false;

            if (!term) return true;

            return [
                item.subjectCode,
                item.subjectName,
                item.groupCode,
                ...item.assignments.map((assignment) => assignment.classroom)
            ]
                .join(" ")
                .toLowerCase()
                .includes(term);
        });
    }, [classes, search, statusFilter]);

    const sorted = useMemo(() => {
        if (!sortKey || !sortDir) return filtered;

        return [...filtered].sort((a, b) => {
            if (sortKey === "students") {
                return sortDir === "asc" ? a.students - b.students : b.students - a.students;
            }

            const compared =
                sortKey === "subject"
                    ? a.subjectName.localeCompare(b.subjectName)
                    : a.groupCode.localeCompare(b.groupCode, undefined, { numeric: true });

            return sortDir === "asc" ? compared : -compared;
        });
    }, [filtered, sortKey, sortDir]);

    const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
    const safePage = Math.min(page, pageCount);
    const visible = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    const changeFilter = (setter: (value: string) => void, value: string) => {
        setter(value);
        setPage(1);
    };

    return (
        <section className="table-card coordinator-card">
            <div className="table-heading">
                <div>
                    <h2>Clases de tu carrera</h2>
                    <p>
                        {classes.length === 0
                            ? "Sin clases registradas en tu carrera."
                            : `${sorted.length} de ${classes.length} clases · ${requestedCount} con solicitud de salón.`}
                    </p>
                </div>

                <div className="table-filters">
                    <select
                        value={statusFilter}
                        onChange={(event) => changeFilter(setStatusFilter, event.target.value)}
                    >
                        <option value="">Estado</option>
                        <option value="NONE">Sin solicitud</option>
                        <option value="PENDING">En revisión</option>
                        <option value="APPROVED">Aprobada</option>
                        <option value="REJECTED">Rechazada</option>
                    </select>

                    <input
                        placeholder="Buscar materia, clave, grupo o salón..."
                        value={search}
                        onChange={(event) => {
                            setSearch(event.target.value);
                            setPage(1);
                        }}
                    />
                </div>
            </div>

            <div className="table-scroll">
                <table>
                    <thead>
                        <tr>
                            <th className="sortable" onClick={() => handleSort("subject")}>
                                <SortIcon column="subject" /> Materia
                            </th>
                            <th className="sortable" onClick={() => handleSort("group")}>
                                <SortIcon column="group" /> Grupo
                            </th>
                            <th className="sortable" onClick={() => handleSort("students")}>
                                <SortIcon column="students" /> Alumnos
                            </th>
                            <th>Estado</th>
                            <th>Salón y horario</th>
                        </tr>
                    </thead>

                    <tbody>
                        {visible.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="empty-row">
                                    {classes.length === 0
                                        ? "Aún no hay clases registradas para tu carrera."
                                        : "Ninguna clase coincide con los filtros seleccionados."}
                                </td>
                            </tr>
                        ) : (
                            visible.map((item) => (
                                <tr key={item.id}>
                                    <td>
                                        {item.subjectCode}
                                        <br />
                                        <small className="muted">{item.subjectName}</small>
                                    </td>
                                    <td>
                                        <strong>{item.groupCode}</strong>
                                    </td>
                                    <td>{item.students}</td>
                                    <td>
                                        {item.status ? (
                                            <>
                                                <span className={`status ${item.status.toLowerCase()}`}>
                                                    {statusLabel[item.status]}
                                                </span>
                                                {item.requestCount > 1 ? (
                                                    <>
                                                        <br />
                                                        <small className="muted">
                                                            {item.requestCount} solicitudes
                                                        </small>
                                                    </>
                                                ) : null}
                                            </>
                                        ) : (
                                            <span className="muted">Sin solicitud</span>
                                        )}
                                    </td>
                                    <td>
                                        {item.assignments.length === 0 ? (
                                            <span className="muted">—</span>
                                        ) : (
                                            <div className="schedule-list">
                                                {item.assignments.map((assignment) => (
                                                    <span className="schedule-chip" key={assignment.id}>
                                                        {assignment.classroom} · {assignment.schedule}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="pagination">
                <button
                    type="button"
                    disabled={safePage <= 1}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    aria-label="Página anterior"
                >
                    <ArrowLeft size={18} />
                </button>

                <span className="pagination-label">
                    Página {safePage} de {pageCount}
                </span>

                <button
                    type="button"
                    disabled={safePage >= pageCount}
                    onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
                    aria-label="Página siguiente"
                >
                    <ArrowRight size={18} />
                </button>
            </div>
        </section>
    );
}

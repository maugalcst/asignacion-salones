"use client";

import { useMemo, useState, useTransition } from "react";
import {
    ArrowDown,
    ArrowLeft,
    ArrowRight,
    ArrowUp,
    ArrowUpDown,
    Grid3X3,
    Pencil,
    Plus,
    Trash2,
    X
} from "lucide-react";
import { deleteSubjectAction, saveSubjectAction } from "@/app/actions";

type ActionResult = {
    ok: boolean;
    error?: string;
    message?: string;
};

type Career = {
    id: number;
    acronym: string;
    name: string;
};

type Subject = {
    id: number;
    code: string;
    name: string;
    type: string;
    semester: number;
    careers: Career[];
};

type SubjectForm = {
    id: number;
    code: string;
    name: string;
    type: string;
    semester: number;
    careerIds: number[];
};

const blank: SubjectForm = {
    id: 0,
    code: "",
    name: "",
    type: "",
    semester: 1,
    careerIds: []
};

export function SubjectsManager({ subjects, careers }: { subjects: Subject[]; careers: Career[] }) {
    const [mode, setMode] = useState<"add" | "edit" | "delete" | null>(null);
    const [form, setForm] = useState<SubjectForm>(blank);
    const [multi, setMulti] = useState(false);
    const [search, setSearch] = useState("");
    const [careerFilter, setCareerFilter] = useState("all");
    const [semesterFilter, setSemesterFilter] = useState("all");
    const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);
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

    const selected = useMemo(
        () => subjects.find((subject) => subject.id === form.id),
        [subjects, form.id]
    );

    const semesterOptions = useMemo(() => {
        const semesters = new Set<number>();
        subjects.forEach((subject) => semesters.add(subject.semester));
        return Array.from(semesters).sort((a, b) => a - b);
    }, [subjects]);

    const rows = useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();
        const selectedCareerId = Number(careerFilter);
        const selectedSemester = Number(semesterFilter);

        return subjects.filter((subject) => {
            const matchesSearch =
                !normalizedSearch ||
                [subject.code, subject.name, subject.type, ...subject.careers.map((career) => career.acronym)]
                    .join(" ")
                    .toLowerCase()
                    .includes(normalizedSearch);

            const matchesCareer =
                careerFilter === "all" || subject.careers.some((career) => career.id === selectedCareerId);

            const matchesSemester = semesterFilter === "all" || subject.semester === selectedSemester;

            return matchesSearch && matchesCareer && matchesSemester;
        });
    }, [subjects, search, careerFilter, semesterFilter]);

    const sorted = (() => {
        if (!sortKey || !sortDir) return rows;
        return [...rows].sort((a, b) => {
            let av: string | number, bv: string | number;
            if (sortKey === "code") { av = a.code; bv = b.code; }
            else if (sortKey === "name") { av = a.name; bv = b.name; }
            else if (sortKey === "type") { av = a.type; bv = b.type; }
            else if (sortKey === "semester") { av = a.semester; bv = b.semester; if (typeof av === "number" && typeof bv === "number") return sortDir === "asc" ? av - bv : bv - av; }
            else return 0;
            const al = (av as string).toLowerCase(), bl = (bv as string).toLowerCase();
            return al < bl ? (sortDir === "asc" ? -1 : 1) : al > bl ? (sortDir === "asc" ? 1 : -1) : 0;
        });
    })();

    const openAdd = () => {
        setNotice(null);
        setMulti(false);
        setForm({
            ...blank,
            careerIds: careers[0] ? [careers[0].id] : []
        });
        setMode("add");
    };

    const openEdit = (subject: Subject) => {
        setNotice(null);
        setMulti(false);
        setForm({
            id: subject.id,
            code: subject.code,
            name: subject.name,
            type: subject.type,
            semester: subject.semester,
            careerIds: subject.careers.map((career) => career.id)
        });
        setMode("edit");
    };

    const openDelete = (subject: Subject) => {
        setNotice(null);
        setMulti(false);
        setForm({ ...blank, id: subject.id });
        setMode("delete");
    };

    const closeModal = () => {
        setMode(null);
        setMulti(false);
        setForm(blank);
    };

    const toggleCareer = (careerId: number) => {
        setForm((current) => ({
            ...current,
            careerIds: current.careerIds.includes(careerId)
                ? current.careerIds.filter((id) => id !== careerId)
                : [...current.careerIds, careerId]
        }));
    };

    const save = () => {
        startTransition(async () => {
            setNotice(null);

            const formData = new FormData();
            if (form.id) formData.set("id", String(form.id));
            formData.set("code", form.code);
            formData.set("name", form.name);
            formData.set("type", form.type);
            formData.set("semester", String(form.semester));
            form.careerIds.forEach((id) => formData.append("careerIds", String(id)));

            const result = (await saveSubjectAction(formData)) as ActionResult | undefined;

            if (result && !result.ok) {
                setNotice({ type: "error", text: result.error || "No se pudo guardar la materia." });
                return;
            }

            setNotice({ type: "success", text: result?.message || "Materia guardada correctamente." });
            closeModal();
        });
    };

    const remove = () => {
        startTransition(async () => {
            setNotice(null);

            const formData = new FormData();
            formData.set("id", String(form.id));

            const result = (await deleteSubjectAction(formData)) as ActionResult | undefined;

            if (result && !result.ok) {
                setNotice({ type: "error", text: result.error || "No se pudo eliminar la materia." });
                return;
            }

            setNotice({ type: "success", text: result?.message || "Materia eliminada correctamente." });
            closeModal();
        });
    };

    return (
        <div className="crud-page">
            {notice && !mode && (
                <div className={`action-toast ${notice.type}`}>
                    <span>{notice.text}</span>

                    <button
                        type="button"
                        onClick={() => setNotice(null)}
                        aria-label="Cerrar mensaje"
                    >
                        <X size={16} />
                    </button>
                </div>
            )}
            <section className="table-card subject-card">
                <div className="table-heading">
                    <div>
                        <h2>Materias registradas</h2>
                        <p>Cantidad de materias: {subjects.length}</p>
                    </div>
                    <div className="table-filters">
                        <select value={careerFilter} onChange={(event) => setCareerFilter(event.target.value)}>
                            <option value="all">Carrera</option>
                            {careers.map((career) => (
                                <option key={career.id} value={career.id}>
                                    {career.acronym}
                                </option>
                            ))}
                        </select>
                        <select value={semesterFilter} onChange={(event) => setSemesterFilter(event.target.value)}>
                            <option value="all">Semestre</option>
                            {semesterOptions.map((semester) => (
                                <option key={semester} value={semester}>
                                    {semester}to
                                </option>
                            ))}
                        </select>
                        <input
                            placeholder="Buscar materia..."
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                        />
                        <button className="round-add" type="button" onClick={openAdd} aria-label="Agregar materia">
                            <Plus />
                        </button>
                    </div>
                </div>

                <div className="table-scroll">
                    <table>
                        <thead>
                            <tr>
                                <th className="sortable" onClick={() => handleSort("code")}>
                                    <SortIcon column="code" /> Clave
                                </th>
                                <th className="sortable" onClick={() => handleSort("name")}>
                                    <SortIcon column="name" /> Nombre
                                </th>
                                <th className="sortable" onClick={() => handleSort("type")}>
                                    <SortIcon column="type" /> Tipo
                                </th>
                                <th>Carrera</th>
                                <th className="sortable" onClick={() => handleSort("semester")}>
                                    <SortIcon column="semester" /> Semestre
                                </th>
                                <th>Acciones</th>
                            </tr>
                        </thead>

                        <tbody>
                            {sorted.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="empty-row">
                                        No se encontraron materias con los filtros seleccionados.
                                    </td>
                                </tr>
                            ) : (
                                sorted.map((subject) => (
                                    <tr key={subject.id}>
                                        <td>{subject.code}</td>
                                        <td>{subject.name}</td>
                                        <td>{subject.type}</td>
                                        <td>
                                            <div className="pill-list">
                                                {subject.careers.map((career) => (
                                                    <span className="career-pill" key={career.id}>
                                                        {career.acronym}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td>{subject.semester}to</td>
                                        <td>
                                            <div className="crud-actions">
                                                <button className="edit-btn" type="button" onClick={() => openEdit(subject)}>
                                                    <Pencil size={17} />
                                                </button>
                                                <button className="delete-btn" type="button" onClick={() => openDelete(subject)}>
                                                    <Trash2 size={17} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="pagination">
                    <button type="button">
                        <ArrowLeft size={18} />
                    </button>
                    <button type="button">
                        <ArrowRight size={18} />
                    </button>
                </div>
            </section>

            {mode && (
                <div
                    className="modal-backdrop"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget && !pending) {
                            closeModal();
                        }
                    }}
                >
                    <div
                        className={`modal crud-modal subject-modal ${mode === "delete" ? "confirm-modal" : ""
                            }`}
                        onMouseDown={(event) => event.stopPropagation()}
                    >
                        {mode === "delete" ? (
                            <>
                                <h2>Eliminar materia</h2>

                                <p>¿Estas seguro de eliminar la materia?</p>

                                <strong className="confirm-name">
                                    Materia: {selected?.name}
                                </strong>

                                <div className="confirm-actions">
                                    <button
                                        className="danger-wide"
                                        type="button"
                                        disabled={pending}
                                        onClick={remove}
                                    >
                                        {pending ? "Eliminando..." : "Eliminar materia"}
                                    </button>

                                    <button
                                        type="button"
                                        disabled={pending}
                                        onClick={closeModal}
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <h2>{mode === "add" ? "Agregar materia" : "Editar"}</h2>

                                {notice?.type === "error" && (
                                    <div className="modal-error">
                                        {notice.text}
                                    </div>
                                )}

                                <div className="crud-form">
                                    <div className="form-grid-2">
                                        <div className="form-field">
                                            <label>Clave</label>
                                            <input
                                                placeholder="Clave"
                                                value={form.code}
                                                onChange={(event) =>
                                                    setForm({ ...form, code: event.target.value })
                                                }
                                            />
                                        </div>

                                        <div className="form-field">
                                            <label>Tipo</label>
                                            <select
                                                value={form.type}
                                                onChange={(event) =>
                                                    setForm({ ...form, type: event.target.value })
                                                }
                                            >
                                                <option value="">Seleccione el tipo</option>
                                                <option value="Ordinaria">Ordinaria</option>
                                                <option value="Laboratorio">Laboratorio</option>
                                            </select>
                                        </div>
                                    </div>

                                    <label>Nombre</label>
                                    <input
                                        placeholder="Nombre"
                                        value={form.name}
                                        onChange={(event) =>
                                            setForm({ ...form, name: event.target.value })
                                        }
                                    />

                                    <label>Carrera (s)</label>
                                    <div className="multi-wrap">
                                        <button
                                            className="multi-field"
                                            type="button"
                                            onClick={() => setMulti((current) => !current)}
                                        >
                                            <span>
                                                {form.careerIds.length
                                                    ? form.careerIds.map((id) => {
                                                        const career = careers.find((item) => item.id === id);

                                                        if (!career) return null;

                                                        return (
                                                            <em key={id}>
                                                                {career.acronym}
                                                                <span
                                                                    role="button"
                                                                    tabIndex={0}
                                                                    onClick={(event) => {
                                                                        event.stopPropagation();
                                                                        toggleCareer(id);
                                                                    }}
                                                                >
                                                                    <X size={12} />
                                                                </span>
                                                            </em>
                                                        );
                                                    })
                                                    : "Agrega carrera o carreras desde el menú multiselección"}
                                            </span>

                                            <Grid3X3 size={17} />
                                        </button>

                                        {multi && (
                                            <div className="multi-menu">
                                                {careers.map((career) => (
                                                    <button
                                                        key={career.id}
                                                        type="button"
                                                        className={
                                                            form.careerIds.includes(career.id) ? "chosen" : ""
                                                        }
                                                        onClick={() => toggleCareer(career.id)}
                                                    >
                                                        {career.acronym}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <label>Semestre</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="12"
                                        placeholder="Semestre"
                                        value={form.semester}
                                        onChange={(event) =>
                                            setForm({
                                                ...form,
                                                semester: Number(event.target.value)
                                            })
                                        }
                                    />
                                </div>

                                <div className="form-actions">
                                    <button
                                        className="cancel-red"
                                        type="button"
                                        disabled={pending}
                                        onClick={closeModal}
                                    >
                                        Cancelar
                                    </button>

                                    <button
                                        className="accept-green"
                                        type="button"
                                        disabled={pending}
                                        onClick={save}
                                    >
                                        {pending ? "Guardando..." : "Aceptar"}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

        </div >
    );
}

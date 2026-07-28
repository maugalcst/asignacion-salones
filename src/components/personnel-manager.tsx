"use client";

import { useMemo, useState, useTransition } from "react";
import {
    AlertCircle,
    ArrowDown,
    ArrowLeft,
    ArrowRight,
    ArrowUp,
    ArrowUpDown,
    CheckCircle2,
    Pencil,
    Plus,
    Trash2,
    X
} from "lucide-react";
import { deletePersonAction, savePersonAction } from "@/app/actions";

type Career = {
    id: number;
    acronym: string;
    name: string;
};

type PersonRole = "ADMIN" | "COORDINATOR" | "TEACHER";

type Person = {
    id: number;
    name: string;
    username: string;
    role: PersonRole;
    careerId: number | null;
    career: Career | null;
};

type PersonForm = {
    id: number;
    name: string;
    username: string;
    role: PersonRole;
    careerId: number;
    password: string;
};

type ActionResult = {
    ok: boolean;
    error?: string;
    message?: string;
};

type Notice = {
    type: "success" | "error";
    text: string;
};

const PAGE_SIZE = 10;

const roleLabel: Record<PersonRole, string> = {
    ADMIN: "Administrador",
    COORDINATOR: "Coordinador",
    TEACHER: "Ayudante"
};

const emptyForm: PersonForm = {
    id: 0,
    name: "",
    username: "",
    role: "TEACHER",
    careerId: 0,
    password: ""
};

export function PersonnelManager({
    people,
    careers,
    currentUserId
}: {
    people: Person[];
    careers: Career[];
    currentUserId: number;
}) {
    const [mode, setMode] = useState<"add" | "edit" | "delete" | null>(null);
    const [form, setForm] = useState<PersonForm>(emptyForm);
    const [notice, setNotice] = useState<Notice | null>(null);
    const [careerFilter, setCareerFilter] = useState("");
    const [roleFilter, setRoleFilter] = useState("");
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

    const selected = useMemo(
        () => people.find((person) => person.id === form.id),
        [people, form.id]
    );

    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase();

        return people.filter((person) => {
            const roleText = roleLabel[person.role].toLowerCase();
            const careerAcronym = person.career?.acronym?.toLowerCase() || "";
            const careerName = person.career?.name?.toLowerCase() || "";
            const matchesSearch =
                !term ||
                person.name.toLowerCase().includes(term) ||
                person.username.toLowerCase().includes(term) ||
                roleText.includes(term) ||
                person.role.toLowerCase().includes(term) ||
                careerAcronym.includes(term) ||
                careerName.includes(term);

            const matchesCareer = !careerFilter || String(person.careerId || "") === careerFilter;
            const matchesRole = !roleFilter || person.role === roleFilter;

            return matchesSearch && matchesCareer && matchesRole;
        });
    }, [people, search, careerFilter, roleFilter]);

    const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const safePage = Math.min(page, pageCount);
    const sorted = (() => {
        if (!sortKey || !sortDir) return filtered;
        return [...filtered].sort((a, b) => {
            let av: string, bv: string;
            if (sortKey === "name") { av = a.name; bv = b.name; }
            else if (sortKey === "role") { av = roleLabel[a.role]; bv = roleLabel[b.role]; }
            else if (sortKey === "career") { av = a.career?.acronym || ""; bv = b.career?.acronym || ""; }
            else return 0;
            const al = av.toLowerCase(), bl = bv.toLowerCase();
            return al < bl ? (sortDir === "asc" ? -1 : 1) : al > bl ? (sortDir === "asc" ? 1 : -1) : 0;
        });
    })();
    const visible = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    const changeFilter = (setter: (value: string) => void, value: string) => {
        setter(value);
        setPage(1);
    };

    const clearFilters = () => {
        setCareerFilter("");
        setRoleFilter("");
        setSearch("");
        setPage(1);
    };

    const openAdd = () => {
        setNotice(null);
        setForm({ ...emptyForm, careerId: careers[0]?.id || 0 });
        setMode("add");
    };

    const openEdit = (person: Person) => {
        setNotice(null);
        setForm({
            id: person.id,
            name: person.name,
            username: person.username,
            role: person.role,
            careerId: person.careerId || careers[0]?.id || 0,
            password: ""
        });
        setMode("edit");
    };

    const openDelete = (person: Person) => {
        setNotice(null);
        setForm({ ...emptyForm, id: person.id });
        setMode("delete");
    };

    const closeModal = () => {
        if (pending) return;
        setMode(null);
        setNotice(null);
    };

    const showResult = (result: ActionResult | undefined, successFallback: string) => {
        if (!result) {
            setNotice({ type: "error", text: "No se recibió respuesta del servidor." });
            return false;
        }

        if (!result.ok) {
            setNotice({
                type: "error",
                text: result.error || "Ocurrió un error inesperado."
            });
            return false;
        }

        setNotice({
            type: "success",
            text: result.message || successFallback
        });
        return true;
    };

    const submit = () => {
        setNotice(null);

        startTransition(async () => {
            const formData = new FormData();

            if (form.id) formData.set("id", String(form.id));
            formData.set("name", form.name);
            formData.set("username", form.username);
            formData.set("role", form.role);
            formData.set("careerId", String(form.careerId));
            formData.set("password", form.password);

            const result = (await savePersonAction(formData)) as ActionResult;
            const success = showResult(
                result,
                form.id ? "Usuario actualizado correctamente." : "Usuario creado correctamente."
            );

            if (success) {
                setTimeout(() => {
                    setMode(null);
                    setNotice(null);
                }, 700);
            }
        });
    };

    const remove = () => {
        setNotice(null);

        startTransition(async () => {
            const formData = new FormData();
            formData.set("id", String(form.id));

            const result = (await deletePersonAction(formData)) as ActionResult;
            const success = showResult(result, "Usuario eliminado correctamente.");

            if (success) {
                setTimeout(() => {
                    setMode(null);
                    setNotice(null);
                }, 700);
            }
        });
    };

    return (
        <div className="crud-page">
            {notice && !mode ? <FloatingNotice notice={notice} onClose={() => setNotice(null)} /> : null}

            <section className="table-card subject-card classroom-card">
                <div className="table-heading">
                    <div>
                        <h2>Personal registrado</h2>
                        <p>Administra usuarios, carreras asociadas y roles.</p>
                    </div>
                    <div className="table-filters">
                        <select
                            value={careerFilter}
                            onChange={(event) => changeFilter(setCareerFilter, event.target.value)}
                        >
                            <option value="">Carrera</option>
                            {careers.map((career) => (
                                <option key={career.id} value={career.id}>
                                    {career.acronym}
                                </option>
                            ))}
                        </select>
                        <select
                            value={roleFilter}
                            onChange={(event) => changeFilter(setRoleFilter, event.target.value)}
                        >
                            <option value="">Rol</option>
                            <option value="ADMIN">Administrador</option>
                            <option value="COORDINATOR">Coordinador</option>
                            <option value="TEACHER">Ayudante</option>
                        </select>
                        <input
                            value={search}
                            onChange={(event) => {
                                setSearch(event.target.value);
                                setPage(1);
                            }}
                            placeholder="Buscar por nombre, usuario, carrera o rol..."
                        />
                        <button className="round-add" onClick={openAdd} aria-label="Agregar personal">
                            <Plus size={20} />
                        </button>
                    </div>
                </div>

                <div className="table-scroll">
                    <table>
                        <thead>
                            <tr>
                                <th className="sortable" onClick={() => handleSort("name")}>
                                    <SortIcon column="name" /> Nombre
                                </th>
                                <th>
                                    Usuario
                                </th>
                                <th className="sortable" onClick={() => handleSort("career")}>
                                    <SortIcon column="career" /> Carrera
                                </th>
                                <th className="sortable" onClick={() => handleSort("role")}>
                                    <SortIcon column="role" /> Rol
                                </th>
                                <th>Acciones</th>
                            </tr>
                        </thead>

                        <tbody>
                            {visible.length > 0 ? (
                                visible.map((person) => (
                                    <tr key={person.id}>
                                        <td>{person.username}</td>
                                        <td>{person.name}</td>
                                        <td>
                                            <span className="career-pill wide">{person.career?.acronym || "—"}</span>
                                        </td>
                                        <td>{roleLabel[person.role]}</td>
                                        <td>
                                            <div className="crud-actions">
                                                <button
                                                    className="edit-btn"
                                                    onClick={() => openEdit(person)}
                                                    aria-label={`Editar ${person.name}`}
                                                >
                                                    <Pencil size={17} />
                                                </button>
                                                <button
                                                    className="delete-btn"
                                                    disabled={person.id === currentUserId}
                                                    onClick={() => openDelete(person)}
                                                    aria-label={`Eliminar ${person.name}`}
                                                    title={
                                                        person.id === currentUserId
                                                            ? "No puedes eliminar tu propia cuenta"
                                                            : "Eliminar usuario"
                                                    }
                                                >
                                                    <Trash2 size={17} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} style={{ textAlign: "center", padding: "28px 12px", color: "#6b7280" }}>
                                        No hay personal que coincida con los filtros seleccionados.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="pagination">
                    <button disabled={safePage <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
                        <ArrowLeft size={18} />
                    </button>
                    <span style={{ fontSize: 13, color: "#6b7280" }}>
                        Página {safePage} de {pageCount}
                    </span>
                    <button disabled={safePage >= pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}>
                        <ArrowRight size={18} />
                    </button>
                </div>
            </section>

            {mode ? (
                <div
                    className="modal-backdrop"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget && !pending) {
                            setMode(null);
                        }
                    }}
                >
                    <div className={`modal crud-modal ${mode === "delete" ? "confirm-modal" : ""}`}>
                        {notice ? <InlineNotice notice={notice} onClose={() => setNotice(null)} /> : null}

                        {mode === "delete" ? (
                            <>
                                <h2>Eliminar personal</h2>
                                <p>¿Estas seguro de eliminar a este usuario?</p>
                                <strong className="confirm-name">Usuario: {selected?.name}</strong>

                                <div className="confirm-actions">
                                    <button className="danger-wide" disabled={pending} onClick={remove}>
                                        {pending ? "Eliminando..." : "Eliminar usuario"}
                                    </button>
                                    <button disabled={pending} onClick={closeModal}>
                                        Cancelar
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <h2>{mode === "add" ? "Agregar usuario" : "Editar"}</h2>

                                <div className="crud-form">
                                    <label>Nombre</label>
                                    <input
                                        placeholder="NOMBRE"
                                        value={form.name}
                                        onChange={(event) => setForm({ ...form, name: event.target.value })}
                                    />

                                    <label>Carrera</label>
                                    <select
                                        value={form.careerId}
                                        onChange={(event) => setForm({ ...form, careerId: Number(event.target.value) })}
                                    >
                                        {careers.length === 0 ? <option value={0}>No hay carreras registradas</option> : null}
                                        {careers.map((career) => (
                                            <option key={career.id} value={career.id}>
                                                {career.acronym} — {career.name}
                                            </option>
                                        ))}
                                    </select>

                                    <label>Rol</label>
                                    <select
                                        value={form.role}
                                        onChange={(event) => setForm({ ...form, role: event.target.value as PersonRole })}
                                    >
                                        <option value="TEACHER">Ayudante</option>
                                        <option value="COORDINATOR">Coordinador</option>
                                        <option value="ADMIN">Administrador</option>
                                    </select>

                                    <label>Usuario</label>
                                    <input
                                        type="text"
                                        placeholder="USUARIO"
                                        value={form.username}
                                        onChange={(event) => setForm({ ...form, username: event.target.value })}
                                    />

                                    <label>Contraseña</label>
                                    <input
                                        type="password"
                                        placeholder={mode === "edit" ? "NUEVA CONTRASEÑA (OPCIONAL)" : "CONTRASEÑA"}
                                        value={form.password}
                                        onChange={(event) => setForm({ ...form, password: event.target.value })}
                                    />
                                </div>

                                <div className="form-actions">
                                    <button className="cancel-red" disabled={pending} onClick={closeModal}>
                                        Cancelar
                                    </button>
                                    <button className="accept-green" disabled={pending} onClick={submit}>
                                        {pending ? "Guardando..." : "Aceptar"}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            ) : null}
        </div>
    );
}

function InlineNotice({ notice, onClose }: { notice: Notice; onClose: () => void }) {
    const isError = notice.type === "error";

    return (
        <div
            role="alert"
            style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                marginBottom: 16,
                padding: "11px 12px",
                borderRadius: 6,
                border: `1px solid ${isError ? "#f3a1a6" : "#a7dbb4"}`,
                background: isError ? "#fff1f2" : "#effaf1",
                color: isError ? "#9f1d25" : "#145a2d",
                fontSize: 13
            }}
        >
            {isError ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
            <span style={{ flex: 1 }}>{notice.text}</span>
            <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar mensaje"
                style={{
                    border: 0,
                    background: "transparent",
                    color: "inherit",
                    cursor: "pointer",
                    display: "grid",
                    placeItems: "center",
                    padding: 0
                }}
            >
                <X size={16} />
            </button>
        </div>
    );
}

function FloatingNotice({ notice, onClose }: { notice: Notice; onClose: () => void }) {
    const isError = notice.type === "error";

    return (
        <div
            role="alert"
            style={{
                position: "fixed",
                right: 20,
                top: 20,
                zIndex: 50,
                width: "min(380px, calc(100vw - 40px))",
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                padding: "12px 14px",
                borderRadius: 8,
                boxShadow: "0 16px 40px rgba(0,0,0,.18)",
                border: `1px solid ${isError ? "#f3a1a6" : "#a7dbb4"}`,
                background: isError ? "#fff1f2" : "#effaf1",
                color: isError ? "#9f1d25" : "#145a2d",
                fontSize: 13
            }}
        >
            {isError ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
            <span style={{ flex: 1 }}>{notice.text}</span>
            <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar mensaje"
                style={{
                    border: 0,
                    background: "transparent",
                    color: "inherit",
                    cursor: "pointer",
                    display: "grid",
                    placeItems: "center",
                    padding: 0
                }}
            >
                <X size={16} />
            </button>
        </div>
    );
}

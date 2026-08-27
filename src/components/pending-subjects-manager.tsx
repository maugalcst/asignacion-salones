"use client";

import { useMemo, useState, useTransition } from "react";
import {
    ArrowDown,
    ArrowLeft,
    ArrowRight,
    ArrowUp,
    ArrowUpDown,
    Building2,
    Check,
    Plus,
    X
} from "lucide-react";
import { requestGroupClassroomAction } from "@/app/actions";

type Career = {
    id: number;
    acronym: string;
    name: string;
};

type RequestStatus = "PENDING" | "APPROVED" | "REJECTED";

type SubjectRequest = {
    id: number;
    dayOfWeek: string;
    status: RequestStatus;
    classroom: {
        building: string;
        floor: number;
        number: string;
    };
    schoolHour: {
        code: string;
        startTime: string;
        endTime: string;
    };
    schedules: {
        dayOfWeek: string;
        schoolHourId: number;
        schoolHour: {
            code: string;
            startTime: string;
            endTime: string;
        };
    }[];
};

type Subject = {
    id: number;
    code: string;
    name: string;
    type: string;
    semester: number;
    cantidad: number;
    careers: Career[];
    groupSubjects: {
        id: number;
        group: {
            id: number;
            code: string;
            semester: number;
            students: number;
            career: Career;
        };
        requests: SubjectRequest[];
    }[];
};

type Group = {
    id: number;
    code: string;
    semester: number;
    students: number;
    career: Career;
};

type Classroom = {
    id: number;
    building: string;
    floor: number;
    number: string;
    capacity: number;
    type: string;
    unavailable: {
        dayOfWeek: string;
        schoolHourId: number;
    }[];
};

type SchoolHour = {
    id: number;
    code: string;
    startTime: string;
    endTime: string;
    shift: string;
};

type ActionResult = {
    ok: boolean;
    error?: string;
    message?: string;
};

type BusyRequest = {
    classroomId: number;
    schedules: {
        dayOfWeek: string;
        schoolHourId: number;
    }[];
};

type DayPattern = {
    label: string;
    days: string[];
};

type SelectedSlot = {
    classroomId: number;
    hourId: number;
    pattern: DayPattern;
};

const SALON_DAY_PATTERNS: DayPattern[] = [
    { label: "Lun-Mie-Vie", days: ["MONDAY", "WEDNESDAY", "FRIDAY"] },
    { label: "Martes", days: ["TUESDAY"] },
    { label: "Jueves", days: ["THURSDAY"] }
];

const LAB_DAY_PATTERNS: DayPattern[] = [
    { label: "Lunes", days: ["MONDAY"] },
    { label: "Martes", days: ["TUESDAY"] },
    { label: "Miércoles", days: ["WEDNESDAY"] },
    { label: "Jueves", days: ["THURSDAY"] },
    { label: "Viernes", days: ["FRIDAY"] },
    { label: "Sábado", days: ["SATURDAY"] }
];

const shiftLabel: Record<string, string> = {
    MATUTINO: "Matutino",
    VESPERTINO: "Vespertino",
    NOCTURNO: "Nocturno"
};

function requestStatusLabel(status: string) {
    if (status === "PENDING") return "En revisión";
    if (status === "APPROVED") return "Aprobada";
    if (status === "REJECTED") return "Rechazada";
    return status;
}
const shortDayLabel: Record<string, string> = {
    MONDAY: "L",
    TUESDAY: "M",
    WEDNESDAY: "M",
    THURSDAY: "J",
    FRIDAY: "V",
    SATURDAY: "S"
};

type RequestSchedule = {
    dayOfWeek: string;
    schoolHourId: number;
    schoolHour?: {
        code: string;
        startTime?: string;
        endTime?: string;
        sortOrder?: number;
    } | null;
};

function formatSchedules(schedules: RequestSchedule[]) {
    if (!schedules.length) return "Sin horario";

    const grouped = new Map<
        string,
        {
            sortOrder: number;
            days: string[];
        }
    >();

    for (const schedule of schedules) {
        const hourCode = schedule.schoolHour?.code || `Hora ${schedule.schoolHourId}`;
        const sortOrder = schedule.schoolHour?.sortOrder ?? schedule.schoolHourId;

        if (!grouped.has(hourCode)) {
            grouped.set(hourCode, {
                sortOrder,
                days: []
            });
        }

        grouped
            .get(hourCode)
            ?.days.push(shortDayLabel[schedule.dayOfWeek] || schedule.dayOfWeek);
    }

    return Array.from(grouped.entries())
        .sort(([, a], [, b]) => a.sortOrder - b.sortOrder)
        .map(([hourCode, data]) => `${data.days.join("")} · ${hourCode}`)
        .join(", ");
}
export function PendingSubjectsManager({
    subjects,
    groups,
    classrooms,
    schoolHours,
    buildings,
    shifts,
    busyRequests
}: {
    subjects: Subject[];
    groups: Group[];
    classrooms: Classroom[];
    schoolHours: SchoolHour[];
    buildings: string[];
    shifts: string[];
    busyRequests: BusyRequest[];
}) {
    const [search, setSearch] = useState("");
    const [sortKey, setSortKey] = useState<string | null>(null);
    const [sortDir, setSortDir] = useState<"asc" | "desc" | null>(null);
    const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);

    const handleSort = (key: string) => {
        if (sortKey !== key) { setSortKey(key); setSortDir("asc"); }
        else if (sortDir === "asc") { setSortDir("desc"); }
        else { setSortKey(null); setSortDir(null); }
    };
    const SortIcon = ({ column }: { column: string }) => {
        if (sortKey !== column) return <ArrowUpDown size={12} />;
        return sortDir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />;
    };

    const [groupCode, setGroupCode] = useState("");
    const [pattern, setPattern] = useState<DayPattern | null>(null);
    const [building, setBuilding] = useState("");
    const [shift, setShift] = useState("");
    const [selectedSlots, setSelectedSlots] = useState<SelectedSlot[]>([]);

    const [notice, setNotice] = useState<{
        type: "success" | "error";
        text: string;
    } | null>(null);
    const [pending, startTransition] = useTransition();

    const rows = useMemo(() => {
        const term = search.trim().toLowerCase();

        return subjects.filter((subject) => {
            if (!term) return true;

            const careerText = subject.careers
                .map((career) => `${career.acronym} ${career.name}`)
                .join(" ");

            return [
                subject.code,
                subject.name,
                subject.type,
                careerText,
                `${subject.semester}to`
            ]
                .join(" ")
                .toLowerCase()
                .includes(term);
        });
    }, [subjects, search]);

    const sorted = useMemo(() => {
        if (!sortKey || !sortDir) return rows;
        return [...rows].sort((a, b) => {
            let av: string | number, bv: string | number;
            if (sortKey === "code") { av = a.code; bv = b.code; }
            else if (sortKey === "name") { av = a.name; bv = b.name; }
            else if (sortKey === "semester") { av = a.semester; bv = b.semester; if (typeof av === "number" && typeof bv === "number") return sortDir === "asc" ? av - bv : bv - av; }
            else return 0;
            const al = (av as string).toLowerCase(), bl = (bv as string).toLowerCase();
            return al < bl ? (sortDir === "asc" ? -1 : 1) : al > bl ? (sortDir === "asc" ? 1 : -1) : 0;
        });
    }, [rows, sortKey, sortDir]);

    const patternOptions = useMemo(() => {
        if (!selectedSubject) return [];
        return selectedSubject.type === "Laboratorio" ? LAB_DAY_PATTERNS : SALON_DAY_PATTERNS;
    }, [selectedSubject]);

    const groupOptions = useMemo(() => {
        if (!selectedSubject) return [];
        return groups.filter((group) => group.semester === selectedSubject.semester);
    }, [groups, selectedSubject]);

    const openRequestModal = (subject: Subject) => {
        setNotice(null);
        setSelectedSubject(subject);
        setGroupCode("");
        setPattern(null);
        setBuilding("");
        setShift("");
        setSelectedSlots([]);
    };

    const closeModal = () => {
        if (pending) return;
        setSelectedSubject(null);
        setGroupCode("");
        setPattern(null);
        setBuilding("");
        setShift("");
        setSelectedSlots([]);
        setNotice(null);
    };

    const isSelected = (classroomId: number, hourId: number) =>
        selectedSlots.some(
            (slot) => slot.classroomId === classroomId && slot.hourId === hourId
        );

    const toggleSlot = (classroomId: number, hourId: number) => {
        if (!pattern) return;

        setSelectedSlots((current) => {
            const existing = current.some(
                (slot) => slot.classroomId === classroomId && slot.hourId === hourId
            );

            if (existing) {
                return current.filter(
                    (slot) =>
                        !(slot.classroomId === classroomId && slot.hourId === hourId)
                );
            }

            return [
                ...current,
                {
                    classroomId,
                    hourId,
                    pattern
                }
            ];
        });

        setNotice(null);
    };

    const removeSlot = (index: number) => {
        setSelectedSlots((current) => current.filter((_, itemIndex) => itemIndex !== index));
    };

    const submitRequest = () => {
        setNotice(null);

        if (!groupCode) {
            setNotice({
                type: "error",
                text: "Selecciona un grupo."
            });
            return;
        }

        if (selectedSlots.length === 0) {
            setNotice({
                type: "error",
                text: "Asigna al menos un espacio antes de enviar la solicitud."
            });
            return;
        }

        const byClassroom = new Map<number, SelectedSlot[]>();

        for (const slot of selectedSlots) {
            const list = byClassroom.get(slot.classroomId) ?? [];
            list.push(slot);
            byClassroom.set(slot.classroomId, list);
        }

        startTransition(async () => {
            let firstError: string | undefined;

            for (const [classroomId, slots] of byClassroom.entries()) {
                const schedules = slots.flatMap((slot) =>
                    slot.pattern.days.map((day) => ({
                        dayOfWeek: day,
                        schoolHourId: slot.hourId
                    }))
                );

                const formData = new FormData();
                formData.set("subjectId", String(selectedSubject!.id));
                formData.set("groupCode", groupCode.trim().toUpperCase());
                formData.set("classroomId", String(classroomId));
                formData.set("schedules", JSON.stringify(schedules));

                const result = (await requestGroupClassroomAction(formData)) as
                    | ActionResult
                    | undefined;

                if (!result || !result.ok) {
                    firstError = result?.error || "No se pudo enviar la solicitud.";
                    break;
                }
            }

            if (firstError) {
                setNotice({
                    type: "error",
                    text: firstError
                });
                return;
            }

            setNotice({
                type: "success",
                text: "Solicitud enviada correctamente."
            });

            setTimeout(() => {
                closeModal();
            }, 700);
        });
    };

    const resultRows = useMemo(() => {
        if (!selectedSubject || !pattern || !building || !shift || !groupCode) return [];

        const isLab = selectedSubject.type === "Laboratorio";
        const rows = [];

        for (const classroom of classrooms) {
            if (classroom.building !== building) continue;
            if (isLab ? classroom.type !== "Laboratorio" : classroom.type !== "Aula") continue;

            for (const hour of schoolHours) {
                if (hour.shift !== shift) continue;

                const busy = busyRequests.some(
                    (request) =>
                        String(request.classroomId) === String(classroom.id) &&
                        request.schedules.some(
                            (schedule) =>
                                pattern.days.includes(schedule.dayOfWeek) &&
                                String(schedule.schoolHourId) === String(hour.id)
                        )
                );

                const blocked = classroom.unavailable.some(
                    (slot) =>
                        pattern.days.includes(slot.dayOfWeek) &&
                        String(slot.schoolHourId) === String(hour.id)
                );

                if (busy || blocked) continue;

                rows.push({ classroom, hour });
            }
        }

        return rows;
    }, [classrooms, schoolHours, busyRequests, selectedSubject, pattern, building, shift, groupCode]);

    const subjectTypeLabel = selectedSubject?.type === "Laboratorio" ? "Laboratorio" : "Salón";

    return (
        <div className="content-wrap">
            {notice && !selectedSubject ? (
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
            ) : null}

            <section className="table-card coordinator-card">
                <div className="table-heading">
                    <div>
                        <h2>Materias por coordinar</h2>
                        <p>Selecciona una materia y solicita salón por día y hora escolar.</p>
                    </div>

                    <div className="table-filters">
                        <input
                            placeholder="Buscar materia, clave, carrera o tipo..."
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                        />
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
                                    <SortIcon column="name" /> Materia
                                </th>
                                <th>Tipo</th>
                                <th>Carrera</th>
                                <th className="sortable" onClick={() => handleSort("semester")}>
                                    <SortIcon column="semester" /> Semestre
                                </th>
                                <th>Solicitudes</th>
                                <th>Nueva solicitud</th>
                            </tr>
                        </thead>

                        <tbody>
                            {rows.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="empty-row">
                                        No se encontraron materias para tu carrera.
                                    </td>
                                </tr>
                            ) : (
                                sorted.map((subject) => {
                                    const requests = subject.groupSubjects.flatMap((groupSubject) =>
                                        groupSubject.requests.map((request) => ({
                                            ...request,
                                            groupCode: groupSubject.group.code
                                        }))
                                    );

                                    return (
                                        <tr key={subject.id}>
                                            <td>{subject.code}</td>
                                            <td>{subject.name}</td>
                                            <td>{subject.type}</td>
                                            <td>
                                                <div className="pill-list">
                                                    {subject.careers.map((career) => (
                                                        <span key={career.id} className="career-pill">
                                                            {career.acronym}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td>{subject.semester}to</td>
                                            <td>
                                                <div className="schedule-list">
                                                    {requests.length === 0 ? (
                                                        <span className="muted">Sin horario solicitado</span>
                                                    ) : (
                                                        requests.map((request) => (
                                                            <span key={request.id} className="schedule-chip">
                                                                Grupo {request.groupCode} ·{" "}
                                                                {formatSchedules(request.schedules)}·{" "}
                                                                {request.classroom.number}

                                                                <b className={`status ${request.status.toLowerCase()}`}>
                                                                    {requestStatusLabel(request.status)}
                                                                </b>
                                                            </span>
                                                        ))
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <button
                                                    type="button"
                                                    className="request-modal-button"
                                                    onClick={() => openRequestModal(subject)}
                                                >
                                                    <Plus size={15} />
                                                    Solicitar
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
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

            {selectedSubject ? (
                <div
                    className="modal-backdrop"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget && !pending) {
                            closeModal();
                        }
                    }}
                >
                    <div
                        className="modal request-modal"
                        onMouseDown={(event) => event.stopPropagation()}
                    >
                        <button type="button" className="modal-close" onClick={closeModal}>
                            <X size={20} />
                        </button>

                        <div className="request-modal-header">
                            <div className="request-modal-icon">
                                <Building2 size={28} />
                            </div>

                            <div>
                                <h2>Nueva solicitud de salón</h2>
                                <p>Selecciona los espacios disponibles que necesitas</p>
                            </div>
                        </div>

                        {notice?.type === "error" ? (
                            <div className="modal-error">{notice.text}</div>
                        ) : null}

                        {notice?.type === "success" ? (
                            <div className="modal-success">{notice.text}</div>
                        ) : null}

                        <div className="request-subject-summary">
                            <strong>{selectedSubject.code}</strong>
                            <span>{selectedSubject.name}</span>
                            <em>Tipo: {subjectTypeLabel}</em>
                            <b className="subject-qty">{selectedSubject.cantidad} alumnos</b>
                        </div>

                        <div className="request-form-grid request-form-grid-3">
                            <div className="form-field">
                                <label>Grupo</label>
                                <select
                                    value={groupCode}
                                    onChange={(event) => setGroupCode(event.target.value)}
                                >
                                    <option value="">Seleccione grupo</option>
                                    {groupOptions.map((group) => (
                                        <option key={group.id} value={group.code}>
                                            {group.code}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-field">
                                <label>Días</label>
                                <select
                                    value={pattern?.label || ""}
                                    onChange={(event) => {
                                        const next = patternOptions.find(
                                            (option) => option.label === event.target.value
                                        );
                                        setPattern(next || null);
                                    }}
                                >
                                    <option value="">Patrón de días</option>
                                    {patternOptions.map((option) => (
                                        <option key={option.label} value={option.label}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-field">
                                <label>Edificio</label>
                                <select
                                    value={building}
                                    onChange={(event) => setBuilding(event.target.value)}
                                >
                                    <option value="">Todos</option>
                                    {buildings.map((item) => (
                                        <option key={item} value={item}>
                                            {item}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-field">
                                <label>Turno</label>
                                <select
                                    value={shift}
                                    onChange={(event) => setShift(event.target.value)}
                                >
                                    <option value="">Todos</option>
                                    {shifts.map((item) => (
                                        <option key={item} value={item}>
                                            {shiftLabel[item] || item}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="request-divider" />

                        <div className="added-schedules-header">
                            <h3>Espacios disponibles</h3>
                        </div>

                        <div className="added-schedules-table">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Salón</th>
                                        <th>Hora</th>
                                        <th>Grupo</th>
                                        <th>Asign</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {resultRows.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="empty-row">
                                                Ajusta los filtros para ver espacios disponibles.
                                            </td>
                                        </tr>
                                    ) : (
                                        resultRows.map(({ classroom, hour }) => {
                                            const selected = isSelected(classroom.id, hour.id);

                                            return (
                                                <tr key={`${classroom.id}-${hour.id}`}>
                                                    <td>{classroom.number}</td>
                                                    <td>
                                                        {hour.code} · {hour.startTime} - {hour.endTime}
                                                    </td>
                                                    <td>{groupCode}</td>
                                                    <td>
                                                        <div className="row-actions">
                                                            <button
                                                                type="button"
                                                                className={selected ? "reject-icon" : "approve-icon"}
                                                                onClick={() => toggleSlot(classroom.id, hour.id)}
                                                                aria-label={
                                                                    selected ? "Quitar espacio" : "Asignar espacio"
                                                                }
                                                            >
                                                                {selected ? <X size={16} /> : <Check size={16} />}
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="request-divider" />

                        <div className="added-schedules-header">
                            <h3>Espacios asignados ({selectedSlots.length})</h3>
                        </div>

                        <div className="added-schedules-table">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Salón</th>
                                        <th>Horario</th>
                                        <th>Grupo</th>
                                        <th>Acción</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {selectedSlots.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="empty-row">
                                                Aún no has asignado espacios.
                                            </td>
                                        </tr>
                                    ) : (
                                        selectedSlots.map((slot, index) => {
                                            const classroom = classrooms.find(
                                                (item) => item.id === slot.classroomId
                                            );
                                            const hour = schoolHours.find(
                                                (item) => item.id === slot.hourId
                                            );

                                            return (
                                                <tr key={`${slot.classroomId}-${slot.hourId}-${index}`}>
                                                    <td>{classroom?.number ?? slot.classroomId}</td>
                                                    <td>
                                                        {slot.pattern.label} · {hour?.code || `Hora ${slot.hourId}`}
                                                        {hour ? ` (${hour.startTime} - ${hour.endTime})` : ""}
                                                    </td>
                                                    <td>{groupCode}</td>
                                                    <td>
                                                        <button
                                                            type="button"
                                                            className="schedule-delete"
                                                            onClick={() => removeSlot(index)}
                                                        >
                                                            Eliminar
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="request-modal-actions">
                            <button
                                type="button"
                                className="request-cancel"
                                disabled={pending}
                                onClick={closeModal}
                            >
                                Cancelar
                            </button>

                            <button
                                type="button"
                                className="request-save"
                                disabled={pending}
                                onClick={submitRequest}
                            >
                                {pending ? "Enviando..." : "Enviar solicitud"}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}

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
    Info,
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
    rejectionReason: string | null;
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

type CareerRequest = {
    id: number;
    status: RequestStatus;
    rejectionReason: string | null;
    requestedAt: string | Date;
    groupCode: string | null;
    subject: {
        code: string;
        name: string;
        type: string;
    };
    classroom: {
        number: string;
        building: string;
        floor: number;
    };
    schedules: RequestSchedule[];
};

type RejectionView = {
    groupCode: string;
    classroom: string;
    schedule: string;
    reason: string;
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

// Los horarios llegan ordenados por hora escolar, no por día, así que los
// días de una misma hora se reordenan aquí para leerse como "LMV" y no "VLM".
const dayOrder: Record<string, number> = {
    MONDAY: 1,
    TUESDAY: 2,
    WEDNESDAY: 3,
    THURSDAY: 4,
    FRIDAY: 5,
    SATURDAY: 6
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

        grouped.get(hourCode)?.days.push(schedule.dayOfWeek);
    }

    return Array.from(grouped.entries())
        .sort(([, a], [, b]) => a.sortOrder - b.sortOrder)
        .map(([hourCode, data]) => {
            const days = data.days
                .slice()
                .sort((a, b) => (dayOrder[a] ?? 99) - (dayOrder[b] ?? 99))
                .map((day) => shortDayLabel[day] || day)
                .join("");

            return `${days} · ${hourCode}`;
        })
        .join(", ");
}
export function PendingSubjectsManager({
    subjects,
    groups,
    classrooms,
    schoolHours,
    buildings,
    shifts,
    busyRequests,
    careerRequests
}: {
    subjects: Subject[];
    groups: Group[];
    classrooms: Classroom[];
    schoolHours: SchoolHour[];
    buildings: string[];
    shifts: string[];
    busyRequests: BusyRequest[];
    careerRequests: CareerRequest[];
}) {
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [showRequests, setShowRequests] = useState(false);
    const [requestStatus, setRequestStatus] = useState("");
    const [requestGroup, setRequestGroup] = useState("");
    const [requestBuilding, setRequestBuilding] = useState("");
    const [sortKey, setSortKey] = useState<string | null>(null);
    const [sortDir, setSortDir] = useState<"asc" | "desc" | null>(null);
    const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
    const [rejectionView, setRejectionView] = useState<RejectionView | null>(null);

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

    const PAGE_SIZE = 10;
    const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
    const safePage = Math.min(page, pageCount);
    const visible = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    const requestGroupOptions = useMemo(
        () =>
            Array.from(
                new Set(
                    careerRequests
                        .map((request) => request.groupCode)
                        .filter((code): code is string => Boolean(code))
                )
            ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
        [careerRequests]
    );

    const requestBuildingOptions = useMemo(
        () =>
            Array.from(
                new Set(careerRequests.map((request) => request.classroom.building))
            ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
        [careerRequests]
    );

    const filteredRequests = useMemo(
        () =>
            careerRequests.filter((request) => {
                if (requestStatus && request.status !== requestStatus) return false;
                if (requestGroup && request.groupCode !== requestGroup) return false;
                if (requestBuilding && request.classroom.building !== requestBuilding) return false;
                return true;
            }),
        [careerRequests, requestStatus, requestGroup, requestBuilding]
    );

    const clearRequestFilters = () => {
        setRequestStatus("");
        setRequestGroup("");
        setRequestBuilding("");
    };

    const patternOptions = useMemo(() => {
        if (!selectedSubject) return [];
        return selectedSubject.type === "Laboratorio" ? LAB_DAY_PATTERNS : SALON_DAY_PATTERNS;
    }, [selectedSubject]);

    // Varias filas de AcademicGroup comparten código (una por materia), así que
    // la lista se deduplica: 63 grupos reales en vez de 847 opciones repetidas.
    // Cuando el grupo ya cursa esta materia se conoce su inscripción real.
    const groupOptions = useMemo(() => {
        if (!selectedSubject) return [];

        const byCode = new Map<string, number | null>();

        for (const groupSubject of selectedSubject.groupSubjects) {
            byCode.set(groupSubject.group.code, groupSubject.group.students);
        }

        for (const group of groups) {
            if (group.semester === selectedSubject.semester && !byCode.has(group.code)) {
                byCode.set(group.code, null);
            }
        }

        return Array.from(byCode.entries())
            .map(([code, students]) => ({ code, students }))
            .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
    }, [groups, selectedSubject]);

    const selectedGroupStudents = useMemo(() => {
        if (!groupCode) return null;
        return groupOptions.find((option) => option.code === groupCode)?.students ?? null;
    }, [groupOptions, groupCode]);

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
        if (!selectedSubject || !pattern || !groupCode) return [];

        const isLab = selectedSubject.type === "Laboratorio";
        const rows = [];

        for (const classroom of classrooms) {
            if (building && classroom.building !== building) continue;
            if (isLab ? classroom.type !== "Laboratorio" : classroom.type !== "Aula") continue;

            for (const hour of schoolHours) {
                if (shift && hour.shift !== shift) continue;

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
                        <h2>{showRequests ? "Solicitudes realizadas" : "Materias por coordinar"}</h2>
                        <p>
                            {showRequests
                                ? `${filteredRequests.length} de ${careerRequests.length} solicitudes de tu carrera.`
                                : "Selecciona una materia y solicita salón por día y hora escolar."}
                        </p>
                    </div>

                    <div className="table-filters">
                        {showRequests ? (
                            <>
                                <select
                                    value={requestStatus}
                                    onChange={(event) => setRequestStatus(event.target.value)}
                                >
                                    <option value="">Estado</option>
                                    <option value="PENDING">En revisión</option>
                                    <option value="APPROVED">Aprobada</option>
                                    <option value="REJECTED">Rechazada</option>
                                </select>

                                <select
                                    value={requestGroup}
                                    onChange={(event) => setRequestGroup(event.target.value)}
                                >
                                    <option value="">Grupo</option>
                                    {requestGroupOptions.map((code) => (
                                        <option key={code} value={code}>
                                            {code}
                                        </option>
                                    ))}
                                </select>

                                <select
                                    value={requestBuilding}
                                    onChange={(event) => setRequestBuilding(event.target.value)}
                                >
                                    <option value="">Edificio</option>
                                    {requestBuildingOptions.map((item) => (
                                        <option key={item} value={item}>
                                            Edificio {item}
                                        </option>
                                    ))}
                                </select>
                            </>
                        ) : (
                            <input
                                placeholder="Buscar materia, clave, carrera o tipo..."
                                value={search}
                                onChange={(event) => {
                                    setSearch(event.target.value);
                                    setPage(1);
                                }}
                            />
                        )}

                        <button
                            type="button"
                            className={`view-switch ${showRequests ? "on" : ""}`}
                            role="switch"
                            aria-checked={showRequests}
                            onClick={() => {
                                setShowRequests((current) => !current);
                                clearRequestFilters();
                            }}
                        >
                            <span className="view-switch-track">
                                <span className="view-switch-thumb" />
                            </span>
                            Ver solicitudes
                        </button>
                    </div>
                </div>

                <div className="table-scroll" hidden={showRequests}>
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
                            {visible.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="empty-row">
                                        No se encontraron materias para tu carrera.
                                    </td>
                                </tr>
                            ) : (
                                visible.map((subject) => {
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
                                                        requests.map((request, index) => (
                                                            <span
                                                                key={`${request.id}-${request.dayOfWeek}-${request.schoolHour.code}-${index}`}
                                                                className="schedule-chip"
                                                            >
                                                                Grupo {request.groupCode} ·{" "}
                                                                {formatSchedules(request.schedules)}·{" "}
                                                                {request.classroom.number}

                                                                <b className={`status ${request.status.toLowerCase()}`}>
                                                                    {requestStatusLabel(request.status)}
                                                                </b>

                                                                {request.status === "REJECTED" && request.rejectionReason ? (
                                                                    <button
                                                                        type="button"
                                                                        className="reason-btn"
                                                                        title="Ver motivo del rechazo"
                                                                        aria-label="Ver motivo del rechazo"
                                                                        onClick={() =>
                                                                            setRejectionView({
                                                                                groupCode: request.groupCode,
                                                                                classroom: request.classroom.number,
                                                                                schedule: formatSchedules(request.schedules),
                                                                                reason: request.rejectionReason || ""
                                                                            })
                                                                        }
                                                                    >
                                                                        <Info size={13} />
                                                                    </button>
                                                                ) : null}
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

                {showRequests ? (
                    <div className="table-scroll">
                        <table>
                            <thead>
                                <tr>
                                    <th>Grupo</th>
                                    <th>Materia</th>
                                    <th>Salón</th>
                                    <th>Horario</th>
                                    <th>Estado</th>
                                    <th>Fecha</th>
                                </tr>
                            </thead>

                            <tbody>
                                {filteredRequests.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="empty-row">
                                            {careerRequests.length === 0
                                                ? "Aún no has realizado solicitudes de salón."
                                                : "Ninguna solicitud coincide con los filtros seleccionados."}
                                        </td>
                                    </tr>
                                ) : (
                                    filteredRequests.map((request) => (
                                        <tr key={request.id}>
                                            <td>{request.groupCode || "—"}</td>
                                            <td>
                                                {request.subject.code}
                                                <br />
                                                <small className="muted">{request.subject.name}</small>
                                            </td>
                                            <td>
                                                {request.classroom.building}-{request.classroom.number}
                                            </td>
                                            <td>{formatSchedules(request.schedules)}</td>
                                            <td>
                                                <div className="status-cell">
                                                    <span className={`status ${request.status.toLowerCase()}`}>
                                                        {requestStatusLabel(request.status)}
                                                    </span>

                                                    {request.status === "REJECTED" && request.rejectionReason ? (
                                                        <button
                                                            type="button"
                                                            className="reason-btn"
                                                            title="Ver motivo del rechazo"
                                                            aria-label="Ver motivo del rechazo"
                                                            onClick={() =>
                                                                setRejectionView({
                                                                    groupCode: request.groupCode || "—",
                                                                    classroom: request.classroom.number,
                                                                    schedule: formatSchedules(request.schedules),
                                                                    reason: request.rejectionReason || ""
                                                                })
                                                            }
                                                        >
                                                            <Info size={13} />
                                                        </button>
                                                    ) : null}
                                                </div>
                                            </td>
                                            <td>
                                                {new Intl.DateTimeFormat("es-MX", {
                                                    dateStyle: "medium"
                                                }).format(new Date(request.requestedAt))}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                ) : null}

                <div className="pagination" hidden={showRequests}>
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
                            <b className="subject-qty">
                                {selectedGroupStudents
                                    ? `${selectedGroupStudents} alumnos`
                                    : groupCode
                                        ? "Grupo nuevo"
                                        : "Selecciona un grupo"}
                            </b>
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
                                        <option key={group.code} value={group.code}>
                                            {group.code}
                                            {group.students ? ` · ${group.students} alumnos` : ""}
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
                                        <th>Cupo</th>
                                        <th>Hora</th>
                                        <th>Grupo</th>
                                        <th>Asign</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {resultRows.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="empty-row">
                                                Ajusta los filtros para ver espacios disponibles.
                                            </td>
                                        </tr>
                                    ) : (
                                        resultRows.map(({ classroom, hour }) => {
                                            const selected = isSelected(classroom.id, hour.id);
                                            const tooSmall =
                                                selectedGroupStudents !== null &&
                                                classroom.capacity < selectedGroupStudents;

                                            return (
                                                <tr key={`${classroom.id}-${hour.id}`}>
                                                    <td>{classroom.number}</td>
                                                    <td className={tooSmall ? "capacity-low" : ""}>
                                                        {classroom.capacity}
                                                        {tooSmall ? (
                                                            <>
                                                                <br />
                                                                <small>insuficiente</small>
                                                            </>
                                                        ) : null}
                                                    </td>
                                                    <td>
                                                        {hour.code} · {hour.startTime} - {hour.endTime}
                                                    </td>
                                                    <td>{groupCode}</td>
                                                    <td>
                                                        <div className="row-actions">
                                                            <button
                                                                type="button"
                                                                className={selected ? "reject-icon" : "approve-icon"}
                                                                title={
                                                                    tooSmall
                                                                        ? `Aviso: el salón tiene cupo para ${classroom.capacity} y el grupo es de ${selectedGroupStudents}.`
                                                                        : undefined
                                                                }
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

            {rejectionView ? (
                <div
                    className="modal-backdrop"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            setRejectionView(null);
                        }
                    }}
                >
                    <div
                        className="modal rejection-modal"
                        onMouseDown={(event) => event.stopPropagation()}
                    >
                        <button
                            type="button"
                            className="modal-close"
                            onClick={() => setRejectionView(null)}
                            aria-label="Cerrar"
                        >
                            <X size={20} />
                        </button>

                        <h2>Motivo del rechazo</h2>

                        <p className="rejection-context">
                            Grupo {rejectionView.groupCode} · Salón {rejectionView.classroom} ·{" "}
                            {rejectionView.schedule}
                        </p>

                        <blockquote className="rejection-reason">
                            {rejectionView.reason}
                        </blockquote>

                        <div className="request-modal-actions">
                            <button
                                type="button"
                                className="request-cancel"
                                onClick={() => setRejectionView(null)}
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}

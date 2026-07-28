"use client";

import { useMemo, useState, useTransition } from "react";
import {
    ArrowLeft,
    ArrowRight,
    ArrowUpDown,
    Building2,
    CalendarDays,
    Plus,
    Search,
    Trash2,
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
};

type SchoolHour = {
    id: number;
    code: string;
    startTime: string;
    endTime: string;
};

type DayOption = {
    value: string;
    label: string;
};

type ActionResult = {
    ok: boolean;
    error?: string;
    message?: string;
};

type ScheduleItem = {
    dayOfWeek: string;
    schoolHourId: string;
};

type RequestForm = {
    subjectId: number;
    groupCode: string;
    classroomId: string;
    building: string;
    floor: string;
    dayOfWeek: string;
    schoolHourId: string;
    schedules: ScheduleItem[];
};
type BusyRequest = {
    classroomId: number;
    schedules: {
        dayOfWeek: string;
        schoolHourId: number;
    }[];
};
const emptyForm = {
    subjectId: 0,
    groupCode: "",
    classroomId: "",
    building: "",
    floor: "",
    dayOfWeek: "",
    schoolHourId: "",
    schedules: []
};
const dayLabel: Record<string, string> = {
    MONDAY: "Lunes",
    TUESDAY: "Martes",
    WEDNESDAY: "Miércoles",
    THURSDAY: "Jueves",
    FRIDAY: "Viernes",
    SATURDAY: "Sábado"
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
    days,
    busyRequests
}: {
    subjects: Subject[];
    groups: Group[];
    classrooms: Classroom[];
    schoolHours: SchoolHour[];
    days: DayOption[];
    busyRequests: BusyRequest[];
}) {
    const [search, setSearch] = useState("");
    const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
    const [form, setForm] = useState<RequestForm>(emptyForm);
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

    const availableGroups = useMemo(() => {
        if (!selectedSubject) return [];
        return groups.filter((group) => group.semester === selectedSubject.semester);
    }, [groups, selectedSubject]);

    const selectedClassroom = useMemo(() => {
        return classrooms.find((classroom) => String(classroom.id) === form.classroomId);
    }, [classrooms, form.classroomId]);

    const openRequestModal = (subject: Subject) => {
        setNotice(null);
        setSelectedSubject(subject);
        setForm({
            ...emptyForm,
            subjectId: subject.id,
        });
    };

    const closeModal = () => {
        if (pending) return;
        setSelectedSubject(null);
        setForm(emptyForm);
        setNotice(null);
    };

    const addSchedule = () => {
        if (!form.dayOfWeek || !form.schoolHourId) {
            setNotice({
                type: "error",
                text: "Selecciona día y hora escolar antes de agregar el horario."
            });
            return;
        }

        const alreadyExists = form.schedules.some(
            (item) =>
                item.dayOfWeek === form.dayOfWeek &&
                item.schoolHourId === form.schoolHourId
        );

        if (alreadyExists) {
            setNotice({
                type: "error",
                text: "Ese horario ya fue agregado."
            });
            return;
        }

        setNotice(null);

        setForm((current) => ({
            ...current,
            schedules: [
                ...current.schedules,
                {
                    dayOfWeek: current.dayOfWeek,
                    schoolHourId: current.schoolHourId
                }
            ],
            dayOfWeek: "",
            schoolHourId: ""
        }));
    };

    const removeSchedule = (index: number) => {
        setForm((current) => ({
            ...current,
            schedules: current.schedules.filter((_, itemIndex) => itemIndex !== index)
        }));
    };

    const submitRequest = () => {
        setNotice(null);

        if (!form.groupCode) {
            setNotice({
                type: "error",
                text: "Selecciona un grupo."
            });
            return;
        }

        if (!form.classroomId) {
            setNotice({
                type: "error",
                text: "Selecciona un salón."
            });
            return;
        }

        const validSchedules = form.schedules.filter(
            (schedule) => schedule.dayOfWeek && schedule.schoolHourId
        );

        if (validSchedules.length === 0) {
            setNotice({
                type: "error",
                text: "Agrega al menos un horario antes de enviar la solicitud."
            });
            return;
        }

        startTransition(async () => {
            const formData = new FormData();
            formData.set("subjectId", String(form.subjectId));
            formData.set("groupCode", form.groupCode.trim().toUpperCase());
            formData.set("classroomId", form.classroomId);
            formData.set("schedules", JSON.stringify(validSchedules));
            const result = (await requestGroupClassroomAction(formData)) as
                | ActionResult
                | undefined;

            if (!result || !result.ok) {
                setNotice({
                    type: "error",
                    text: result?.error || "No se pudo enviar la solicitud."
                });
                return;
            }

            setNotice({
                type: "success",
                text: result.message || "Solicitud enviada correctamente."
            });

            setTimeout(() => {
                closeModal();
            }, 700);
        });
    };
    const availableSchoolHours = useMemo(() => {
        if (!form.classroomId || !form.dayOfWeek) return schoolHours;

        const busyHourIds = new Set(
            busyRequests
                .filter((request) => String(request.classroomId) === form.classroomId)
                .flatMap((request) =>
                    request.schedules
                        .filter((schedule) => schedule.dayOfWeek === form.dayOfWeek)
                        .map((schedule) => String(schedule.schoolHourId))
                )
        );

        const selectedHourIds = new Set(
            form.schedules
                .filter((schedule) => schedule.dayOfWeek === form.dayOfWeek)
                .map((schedule) => schedule.schoolHourId)
        );

        return schoolHours.filter(
            (hour) =>
                !busyHourIds.has(String(hour.id)) &&
                !selectedHourIds.has(String(hour.id))
        );
    }, [schoolHours, busyRequests, form.classroomId, form.dayOfWeek, form.schedules]);
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

                    <label className="search-box">
                        <Search size={15} />
                        <input
                            placeholder="Buscar materia, clave, carrera o tipo..."
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                        />
                    </label>
                </div>

                <div className="table-scroll">
                    <table>
                        <thead>
                            <tr>
                                <th>
                                    <ArrowUpDown size={12} /> Clave
                                </th>
                                <th>
                                    <ArrowUpDown size={12} /> Materia
                                </th>
                                <th>Tipo</th>
                                <th>Carrera</th>
                                <th>
                                    <ArrowUpDown size={12} /> Semestre
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
                                rows.map((subject) => {
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
                                <p>Capture la información del salón y sus horarios solicitados</p>
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
                            <em>{selectedSubject.type}</em>
                        </div>

                        <div className="request-form-grid request-form-grid-3">
                            <div className="form-field">
                                <label>Grupo</label>
                                <input
                                    type="text"
                                    value={form.groupCode}
                                    placeholder="Ej. 1, 2, 301, 4A"
                                    onChange={(event) =>
                                        setForm({
                                            ...form,
                                            groupCode: event.target.value.toUpperCase()
                                        })
                                    }
                                />
                            </div>

                            <div className="form-field">
                                <label>Salón</label>
                                <select
                                    value={form.classroomId}
                                    onChange={(event) => {
                                        const classroom = classrooms.find(
                                            (item) => String(item.id) === event.target.value
                                        );

                                        setForm({
                                            ...form,
                                            classroomId: event.target.value,
                                            building: classroom?.building || "",
                                            floor: classroom ? String(classroom.floor) : "",
                                        });
                                    }}
                                >
                                    <option value="">Seleccione salón</option>
                                    {classrooms.map((classroom) => (
                                        <option key={classroom.id} value={classroom.id}>
                                            {classroom.number} · Capacidad {classroom.capacity}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-field">
                                <label>Edificio</label>
                                <input
                                    value={form.building ? `Edificio ${form.building}` : ""}
                                    placeholder="Automático"
                                    disabled
                                />
                            </div>

                            <div className="form-field">
                                <label>Piso</label>
                                <input value={form.floor || ""} placeholder="Automático" disabled />
                            </div>

                            <div className="form-field">
                                <label>Día</label>
                                <select
                                    value={form.dayOfWeek}
                                    onChange={(event) =>
                                        setForm({ ...form, dayOfWeek: event.target.value })
                                    }
                                >
                                    <option value="">Día</option>
                                    {days.map((day) => (
                                        <option key={day.value} value={day.value}>
                                            {day.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-field request-hour-field">
                                <label>Hora escolar</label>
                                <select
                                    value={form.schoolHourId}
                                    onChange={(event) =>
                                        setForm({ ...form, schoolHourId: event.target.value })
                                    }
                                >
                                    <option value="">Hora</option>
                                    {availableSchoolHours.map((hour) => (
                                        <option key={hour.id} value={hour.id}>
                                            {hour.code} · {hour.startTime} - {hour.endTime}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="request-divider" />

                        <div className="added-schedules-header">
                            <h3>Horarios agregados</h3>

                            <button
                                type="button"
                                className="add-schedule-button"
                                onClick={addSchedule}
                            >
                                <Plus size={16} />
                                Agregar otro horario
                            </button>
                        </div>

                        <div className="added-schedules-table">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Día</th>
                                        <th>Hora inicio</th>
                                        <th>Hora fin</th>
                                        <th>Clave</th>
                                        <th>Acción</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {form.schedules.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="empty-row">
                                                Aún no has agregado horarios.
                                            </td>
                                        </tr>
                                    ) : (
                                        form.schedules.map((schedule, index) => {
                                            const hour = schoolHours.find(
                                                (item) => String(item.id) === String(schedule.schoolHourId)
                                            );

                                            return (
                                                <tr key={`${schedule.dayOfWeek}-${schedule.schoolHourId}-${index}`}>
                                                    <td>
                                                        {days.find((day) => day.value === schedule.dayOfWeek)?.label ||
                                                            schedule.dayOfWeek}
                                                    </td>

                                                    <td>{hour?.code || `Hora ${schedule.schoolHourId}`}</td>

                                                    <td>
                                                        {hour ? `${hour.startTime} - ${hour.endTime}` : "Horario no encontrado"}
                                                    </td>

                                                    <td>
                                                        <button
                                                            type="button"
                                                            className="schedule-delete"
                                                            onClick={() => removeSchedule(index)}
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
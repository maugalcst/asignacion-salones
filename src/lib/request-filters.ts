// Los filtros de la tabla de solicitudes viven aquí para que la pantalla y la
// exportación a Excel usen exactamente el mismo criterio: si sólo la tabla
// supiera filtrar, el archivo descargado traería filas distintas a las que el
// administrador está viendo.

export const shortDayLabels: Record<string, string> = {
  MONDAY: "L", TUESDAY: "M", WEDNESDAY: "M",
  THURSDAY: "J", FRIDAY: "V", SATURDAY: "S"
};

export const statusLabels: Record<string, string> = {
  PENDING: "Pendiente", APPROVED: "Aprobado", REJECTED: "Rechazado"
};

export type FilterableSchedule = {
  dayOfWeek: string;
  schoolHour: { code: string; startTime: string; endTime: string; sortOrder: number };
};

export type FilterableRequest = {
  status: string;
  semester: number;
  coordinator: { name: string };
  career: { id: number; acronym: string; name: string };
  classroom: { building: string; number: string };
  subject: { code: string; name: string; type: string };
  groupSubject: { group: { code: string } } | null;
};

export type RequestFilters = {
  search: string;
  status: string;
  career: string;
};

export const emptyFilters: RequestFilters = { search: "", status: "all", career: "all" };

export function matchesFilters(request: FilterableRequest, filters: RequestFilters) {
  if (filters.search) {
    const q = filters.search.toLowerCase();
    if (
      !request.coordinator.name.toLowerCase().includes(q) &&
      !request.career.acronym.toLowerCase().includes(q) &&
      !request.career.name.toLowerCase().includes(q) &&
      !request.semester.toString().includes(q) &&
      !request.subject.code.toLowerCase().includes(q) &&
      !request.subject.name.toLowerCase().includes(q) &&
      !request.classroom.building.toLowerCase().includes(q) &&
      !request.classroom.number.toLowerCase().includes(q) &&
      !(request.groupSubject?.group.code || "").toLowerCase().includes(q)
    ) return false;
  }

  if (filters.status !== "all" && request.status !== filters.status) return false;
  if (filters.career !== "all" && request.career.id.toString() !== filters.career) return false;

  return true;
}

// Une los horarios que comparten hora en una sola línea ("LMV · H3 · 09:00-10:00")
// en vez de repetir la hora una vez por día.
export function formatSchedules(schedules: FilterableSchedule[]) {
  if (schedules.length === 0) return "Sin horario";

  const groupedByHour = new Map<string, { sortOrder: number; startTime: string; endTime: string; days: string[] }>();

  for (const schedule of schedules) {
    const hourCode = schedule.schoolHour.code;
    if (!groupedByHour.has(hourCode)) {
      groupedByHour.set(hourCode, {
        sortOrder: schedule.schoolHour.sortOrder,
        startTime: schedule.schoolHour.startTime,
        endTime: schedule.schoolHour.endTime,
        days: []
      });
    }
    groupedByHour.get(hourCode)?.days.push(shortDayLabels[schedule.dayOfWeek] || schedule.dayOfWeek);
  }

  return Array.from(groupedByHour.entries())
    .sort(([, a], [, b]) => a.sortOrder - b.sortOrder)
    .map(([hourCode, data]) => `${data.days.join("")} · ${hourCode} · ${data.startTime}-${data.endTime}`)
    .join(", ");
}

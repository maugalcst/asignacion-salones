// Mismo criterio que en las solicitudes: los filtros de la tabla de salones
// asignados viven aquí para que la pantalla y el Excel no se desincronicen.

export const dayLabels: Record<string, string> = {
  MONDAY: "Lunes", TUESDAY: "Martes", WEDNESDAY: "Miércoles",
  THURSDAY: "Jueves", FRIDAY: "Viernes", SATURDAY: "Sábado"
};

export const dayOptions = [
  { value: "MONDAY", label: "Lunes" }, { value: "TUESDAY", label: "Martes" },
  { value: "WEDNESDAY", label: "Miércoles" }, { value: "THURSDAY", label: "Jueves" },
  { value: "FRIDAY", label: "Viernes" }, { value: "SATURDAY", label: "Sábado" }
];

export type AssignmentSchedule = {
  id: number;
  dayOfWeek: string;
  schoolHour: { code: string; startTime: string };
};

export type AssignmentRequest = {
  semester: number;
  coordinator: { name: string };
  career: { id: number; acronym: string };
  classroom: { building: string; number: string };
  subject: { code: string };
  groupSubject: { group: { code: string } } | null;
  schedules: AssignmentSchedule[];
};

export type AssignmentFilters = {
  search: string;
  career: string;
  day: string;
  building: string;
};

export const emptyAssignmentFilters: AssignmentFilters = {
  search: "", career: "all", day: "all", building: "all"
};

export function matchesAssignmentFilters(request: AssignmentRequest, filters: AssignmentFilters) {
  if (filters.search) {
    const q = filters.search.toLowerCase();
    if (
      !request.coordinator.name.toLowerCase().includes(q) &&
      !request.career.acronym.toLowerCase().includes(q) &&
      !request.semester.toString().includes(q) &&
      !request.subject.code.toLowerCase().includes(q) &&
      !`${request.classroom.building}-${request.classroom.number}`.toLowerCase().includes(q) &&
      !request.classroom.building.toLowerCase().includes(q) &&
      !(request.groupSubject?.group.code || "").toLowerCase().includes(q)
    ) return false;
  }

  if (filters.career !== "all" && request.career.id.toString() !== filters.career) return false;
  if (filters.building !== "all" && request.classroom.building !== filters.building) return false;

  // El día NO se filtra aquí: una solicitud puede tener clase lunes y viernes, y
  // descartarla o conservarla entera daría un resultado equivocado. La decisión
  // es por renglón y la toma expandBySchedule.
  return true;
}

// La tabla no muestra una fila por solicitud sino una por cada día y hora
// asignados, que es como se lee un horario de salones. El Excel sale igual.
//
// El filtro de día se aplica aquí, sobre cada renglón ya expandido: antes se
// filtraban solicitudes completas, así que pedir "Lunes" traía además los
// renglones de martes y viernes de esa misma solicitud.
export function expandBySchedule<T extends { schedules: AssignmentSchedule[] }>(
  requests: T[],
  day: string = "all"
) {
  return requests.flatMap(request =>
    request.schedules
      .filter(schedule => day === "all" || schedule.dayOfWeek === day)
      .map(schedule => ({ ...request, schedule }))
  );
}

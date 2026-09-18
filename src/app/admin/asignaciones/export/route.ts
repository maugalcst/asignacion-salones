import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildWorkbook, DATE_FORMAT, spreadsheetResponse, type SheetColumn } from "@/lib/excel";
import { dayLabels, expandBySchedule, matchesAssignmentFilters } from "@/lib/assignment-filters";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Una fila por día y hora asignados, igual que en la pantalla: así el archivo se
// lee como un horario de salones y no como una lista de solicitudes.
const columns: SheetColumn<any>[] = [
  { header: "Folio", width: 8, value: x => x.id },
  { header: "Coordinador", width: 26, value: x => x.coordinator.name },
  { header: "Carrera", width: 10, value: x => x.career.acronym },
  { header: "Nombre de la carrera", width: 34, value: x => x.career.name },
  { header: "Semestre", width: 10, value: x => x.semester },
  { header: "Grupo", width: 10, value: x => x.groupSubject?.group.code || "—" },
  { header: "Alumnos", width: 10, value: x => x.groupSubject?.group.students ?? "—" },
  { header: "Clave materia", width: 14, value: x => x.subject.code },
  { header: "Materia", width: 34, value: x => x.subject.name },
  { header: "Edificio", width: 10, value: x => x.classroom.building },
  { header: "Salón", width: 12, value: x => `${x.classroom.building}-${x.classroom.number}` },
  { header: "Capacidad", width: 11, value: x => x.classroom.capacity },
  { header: "Día", width: 12, value: x => dayLabels[x.schedule.dayOfWeek] || x.schedule.dayOfWeek },
  { header: "Hora", width: 10, value: x => x.schedule.schoolHour.code },
  { header: "Inicio", width: 9, value: x => x.schedule.schoolHour.startTime },
  { header: "Fin", width: 9, value: x => x.schedule.schoolHour.endTime },
  { header: "Revisado por", width: 26, value: x => x.reviewedBy?.name || "—" },
  { header: "Fecha de asignación", width: 20, value: x => x.reviewedAt, numFmt: DATE_FORMAT }
];

export async function GET(request: Request) {
  const user = await getCurrentUser();

  // Igual que la exportación de solicitudes: la ruta entrega datos de todo el
  // semestre, así que comprueba el rol por su cuenta y no confía en que el botón
  // sólo se pinte dentro del panel.
  if (!user) {
    return new Response("No has iniciado sesión.", { status: 401 });
  }

  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
    return new Response("No tienes permiso para exportar las asignaciones.", { status: 403 });
  }

  const params = new URL(request.url).searchParams;
  const filters = {
    search: params.get("buscar") || "",
    career: params.get("carrera") || "all",
    day: params.get("dia") || "all",
    building: params.get("edificio") || "all"
  };

  const assigned = await prisma.classroomRequest.findMany({
    where: { status: "APPROVED" },
    include: {
      coordinator: true,
      career: true,
      classroom: true,
      subject: true,
      reviewedBy: true,
      groupSubject: { include: { group: true } },
      schedules: {
        include: { schoolHour: true },
        orderBy: [{ schoolHour: { sortOrder: "asc" } }]
      }
    },
    orderBy: { reviewedAt: "desc" }
  });

  const visible = assigned.filter(r => matchesAssignmentFilters(r, filters));
  const buffer = await buildWorkbook("Salones asignados", columns, expandBySchedule(visible, filters.day));

  return spreadsheetResponse(buffer, "salones-asignados");
}

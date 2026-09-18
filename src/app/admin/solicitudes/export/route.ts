import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildWorkbook, DATE_FORMAT, spreadsheetResponse, type SheetColumn } from "@/lib/excel";
import { formatSchedules, matchesFilters, statusLabels } from "@/lib/request-filters";

// El libro se arma en el servidor (Node) y no en el navegador: así la hoja se
// genera con los datos frescos de la base y exceljs no entra al bundle del
// cliente.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const columns: SheetColumn<any>[] = [
  { header: "Folio", width: 8, value: r => r.id },
  { header: "Estado", width: 12, value: r => statusLabels[r.status] || r.status },
  { header: "Coordinador", width: 26, value: r => r.coordinator.name },
  { header: "Carrera", width: 10, value: r => r.career.acronym },
  { header: "Nombre de la carrera", width: 34, value: r => r.career.name },
  { header: "Semestre", width: 10, value: r => r.semester },
  { header: "Grupo", width: 10, value: r => r.groupSubject?.group.code || "—" },
  { header: "Clave materia", width: 14, value: r => r.subject.code },
  { header: "Materia", width: 34, value: r => r.subject.name },
  { header: "Tipo", width: 14, value: r => r.subject.type },
  { header: "Salón", width: 12, value: r => `${r.classroom.building}-${r.classroom.number}` },
  { header: "Capacidad", width: 11, value: r => r.classroom.capacity },
  { header: "Horarios", width: 46, value: r => formatSchedules(r.schedules), wrap: true },
  { header: "Fecha de solicitud", width: 20, value: r => r.requestedAt, numFmt: DATE_FORMAT },
  { header: "Revisado por", width: 26, value: r => r.reviewedBy?.name || "—" },
  { header: "Fecha de revisión", width: 20, value: r => r.reviewedAt, numFmt: DATE_FORMAT },
  { header: "Motivo de rechazo", width: 42, value: r => r.rejectionReason || "—", wrap: true }
];

export async function GET(request: Request) {
  const user = await getCurrentUser();

  // La ruta entrega la lista completa de solicitudes, así que valida el rol por
  // su cuenta: que el botón sólo salga en el panel de administración no impide
  // que alguien pida la URL directamente.
  if (!user) {
    return new Response("No has iniciado sesión.", { status: 401 });
  }

  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
    return new Response("No tienes permiso para exportar las solicitudes.", { status: 403 });
  }

  const params = new URL(request.url).searchParams;
  const filters = {
    search: params.get("buscar") || "",
    status: params.get("estado") || "all",
    career: params.get("carrera") || "all"
  };

  const requests = await prisma.classroomRequest.findMany({
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
    orderBy: { requestedAt: "desc" }
  });

  const visible = requests.filter(r => matchesFilters(r, filters));
  const buffer = await buildWorkbook("Solicitudes", columns, visible);

  return spreadsheetResponse(buffer, "solicitudes");
}

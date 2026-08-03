"use server";

import bcrypt from "bcryptjs";
// @ts-ignore
import { ClassroomStatus, Prisma, RequestStatus, WeekDay } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSession, destroySession, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type ActionState = {
  ok: boolean;
  error?: string;
  message?: string;
};

function getFormData(firstArg: FormData | ActionState | undefined, secondArg?: FormData) {
  return secondArg ?? (firstArg as FormData);
}

function validationError(error: z.ZodError) {
  const first = error.issues[0];
  if (!first) return "Datos inválidos.";
  return first.message || "Datos inválidos.";
}

function prismaErrorMessage(error: any, fallback = "Ocurrió un error inesperado.") {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return "Ya existe un registro con esos datos.";
    if (error.code === "P2003") return "No se puede completar la acción porque el registro está relacionado con otros datos.";
    if (error.code === "P2025") return "No se encontró el registro solicitado.";
  }

  if (error instanceof Error) {
    return error.message || fallback;
  }

  return fallback;
}

function actionOk(message: string): ActionState {
  return { ok: true, message };
}

function actionError(error: any, fallback?: string): ActionState {
  const message = prismaErrorMessage(error, fallback);
  console.error("[Server Action Error]", error);
  return { ok: false, error: message };
}

const loginSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "El usuario debe tener al menos 3 caracteres.")
    .max(40, "El usuario no puede exceder 40 caracteres.")
    .regex(/^[a-zA-Z0-9.@_-]+$/, "El usuario solo puede contener letras, números, punto, arroba, guion y guion bajo."),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres.")
});

function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

export async function loginAction(_: ActionState | undefined, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password")
  });

  if (!parsed.success) {
    return { ok: false, error: validationError(parsed.error) };
  }

  const user = await prisma.user.findUnique({
    where: { username: normalizeUsername(parsed.data.username) }
  });

  if (!user || !user.active || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    return { ok: false, error: "Usuario o contraseña incorrectos." };
  }

  await createSession(user.id);
  redirect(user.role === "ADMIN" ? "/admin/solicitudes" : "/dashboard");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

export async function approveRequestAction(
  firstArg: FormData | ActionState | undefined,
  secondArg?: FormData
): Promise<ActionState> {
  const formData = getFormData(firstArg, secondArg);

  try {
    const user = await requireUser();
    const requestId = Number(formData.get("requestId"));

    if (!Number.isInteger(requestId)) {
      return { ok: false, error: "Solicitud inválida." };
    }

    const request = await prisma.classroomRequest.findUnique({
      where: { id: requestId },
      include: { classroom: true, schedules: true }
    });

    if (!request || request.status !== RequestStatus.PENDING) {
      return { ok: false, error: "La solicitud ya no está pendiente o no existe." };
    }

    if (request.classroom.status !== ClassroomStatus.AVAILABLE) {
      return { ok: false, error: "El salón está inhabilitado o en mantenimiento." };
    }

    const overlap = await prisma.classroomRequestSchedule.findFirst({
      where: {
        classroomRequest: {
          classroomId: request.classroomId,
          status: RequestStatus.APPROVED,
          id: { not: request.id }
        },
        dayOfWeek: { in: request.schedules.map(s => s.dayOfWeek) },
        schoolHourId: { in: request.schedules.map(s => s.schoolHourId) }
      }
    });

    if (overlap) {
      return { ok: false, error: "Ya existe una asignación aprobada para ese salón en el mismo día y hora." };
    }

    await prisma.classroomRequest.update({
      where: { id: request.id },
      data: {
        status: RequestStatus.APPROVED,
        reviewedById: user.id,
        reviewedAt: new Date(),
        rejectionReason: null
      }
    });

    revalidatePath("/admin/solicitudes");
    revalidatePath("/admin/asignaciones");
    revalidatePath("/dashboard/materias");
    revalidatePath("/dashboard/salones");

    return actionOk("Solicitud aprobada correctamente.");
  } catch (error) {
    return actionError(error, "No se pudo aprobar la solicitud.");
  }
}

export async function rejectRequestAction(
  firstArg: FormData | ActionState | undefined,
  secondArg?: FormData
): Promise<ActionState> {
  const formData = getFormData(firstArg, secondArg);

  try {
    const user = await requireUser();
    const requestId = Number(formData.get("requestId"));
    const reason = String(formData.get("reason") || "").trim();

    if (!Number.isInteger(requestId)) {
      return { ok: false, error: "Solicitud inválida." };
    }

    if (reason.length < 5) {
      return { ok: false, error: "El motivo de rechazo debe tener al menos 5 caracteres." };
    }

    await prisma.classroomRequest.updateMany({
      where: { id: requestId, status: RequestStatus.PENDING },
      data: {
        status: RequestStatus.REJECTED,
        rejectionReason: reason,
        reviewedById: user.id,
        reviewedAt: new Date()
      }
    });

    revalidatePath("/admin/solicitudes");
    revalidatePath("/admin/asignaciones");

    return actionOk("Solicitud rechazada correctamente.");
  } catch (error) {
    return actionError(error, "No se pudo rechazar la solicitud.");
  }
}

const personSchema = z
  .object({
    id: z.coerce.number().int().positive().optional(),
    name: z.string().trim().min(3, "El nombre debe tener al menos 3 caracteres."),
    careerId: z.coerce.number().int().positive("Selecciona un área/carrera."),
    role: z.enum(["ADMIN", "COORDINATOR", "TEACHER"]),
    username: z
      .string()
      .trim()
      .min(3, "El usuario debe tener al menos 3 caracteres.")
      .max(40, "El usuario no puede exceder 40 caracteres.")
      .regex(/^[a-zA-Z0-9.@_-]+$/, "El usuario solo puede contener letras, números, punto, arroba, guion y guion bajo."),
    email: z
      .string()
      .trim()
      .max(100, "El correo no puede exceder 100 caracteres.")
      .email("El correo no es válido.")
      .optional()
      .or(z.literal("")),
    employeeNumber: z
      .string()
      .trim()
      .min(3, "El número de empleado debe tener al menos 3 caracteres.")
      .max(20, "El número de empleado no puede exceder 20 caracteres.")
      .optional()
      .or(z.literal("")),
    password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres.").optional().or(z.literal(""))
  })
  .superRefine((data, ctx) => {
    if (data.role === "TEACHER" && !data.employeeNumber) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["employeeNumber"],
        message: "El número de empleado es obligatorio para el rol Ayudante (TEACHER)."
      });
    }
  });

export async function savePersonAction(
  firstArg: FormData | ActionState | undefined,
  secondArg?: FormData
): Promise<ActionState> {
  const formData = getFormData(firstArg, secondArg);

  try {
    await requireUser();

    const parsed = personSchema.safeParse({
      id: formData.get("id") || undefined,
      name: formData.get("name"),
      careerId: formData.get("careerId"),
      role: formData.get("role"),
      username: formData.get("username"),
      email: formData.get("email"),
      employeeNumber: formData.get("employeeNumber"),
      password: formData.get("password")
    });

    if (!parsed.success) {
      return { ok: false, error: validationError(parsed.error) };
    }

    const { id, password, ...data } = parsed.data;

    if (id) {
      await prisma.user.update({
        where: { id },
        data: {
          ...data,
          username: normalizeUsername(data.username),
          email: data.email || null,
          employeeNumber: data.employeeNumber || null,
          ...(password ? { passwordHash: await bcrypt.hash(password, 12) } : {})
        }
      });
    } else {
      if (!password) {
        return { ok: false, error: "La contraseña es obligatoria." };
      }

      await prisma.user.create({
        data: {
          ...data,
          username: normalizeUsername(data.username),
          email: data.email || null,
          employeeNumber: data.employeeNumber || null,
          passwordHash: await bcrypt.hash(password, 12)
        }
      });
    }

    revalidatePath("/admin/personal");
    return actionOk(id ? "Usuario actualizado correctamente." : "Usuario creado correctamente.");
  } catch (error) {
    return actionError(error, "No se pudo guardar el usuario.");
  }
}

export async function deletePersonAction(
  firstArg: FormData | ActionState | undefined,
  secondArg?: FormData
): Promise<ActionState> {
  const formData = getFormData(firstArg, secondArg);

  try {
    const current = await requireUser();
    const id = Number(formData.get("id"));

    if (!Number.isInteger(id)) {
      return { ok: false, error: "Usuario inválido." };
    }

    if (id === current.id) {
      return { ok: false, error: "No puedes eliminar tu propia cuenta." };
    }

    const requests = await prisma.classroomRequest.findMany({
      where: { OR: [{ coordinatorId: id }, { reviewedById: id }] },
      select: { id: true }
    });

    const requestIds = requests.map((request: any) => request.id);

    await prisma.$transaction([
      prisma.session.deleteMany({ where: { userId: id } }),
      prisma.classroomRequest.deleteMany({ where: { id: { in: requestIds } } }),
      prisma.academicGroup.deleteMany({ where: { coordinatorId: id } }),
      prisma.user.delete({ where: { id } })
    ]);

    revalidatePath("/admin/personal");
    return actionOk("Usuario eliminado correctamente.");
  } catch (error) {
    return actionError(error, "No se pudo eliminar el usuario.");
  }
}

const subjectSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  code: z.string().trim().min(2, "La clave debe tener al menos 2 caracteres.").max(20),
  name: z.string().trim().min(3, "El nombre debe tener al menos 3 caracteres."),
  type: z.string().trim().min(2, "El tipo de materia es obligatorio."),
  semester: z.coerce.number().int().min(1).max(12),
  careerIds: z.array(z.coerce.number().int().positive()).min(1, "Selecciona al menos una carrera."),
  duracion: z.coerce.number().int().positive("La duración debe ser un número entero positivo.").nullable().optional().or(z.literal("")),
  cantidad: z.coerce.number().int().min(0, "La cantidad no puede ser negativa.").default(0),
  coordinatorId: z.coerce.number().int().positive("Selecciona un coordinador.").nullable().optional().or(z.literal(""))
});

export async function saveSubjectAction(
  firstArg: FormData | ActionState | undefined,
  secondArg?: FormData
): Promise<ActionState> {
  const formData = getFormData(firstArg, secondArg);

  try {
    await requireUser();

    const parsed = subjectSchema.safeParse({
      id: formData.get("id") || undefined,
      code: formData.get("code"),
      name: formData.get("name"),
      type: formData.get("type"),
      semester: formData.get("semester"),
      careerIds: formData.getAll("careerIds"),
      duracion: formData.get("duracion") || null,
      cantidad: formData.get("cantidad") || 0,
      coordinatorId: formData.get("coordinatorId") || null
    });

    if (!parsed.success) {
      return { ok: false, error: validationError(parsed.error) };
    }

    const { id, careerIds, duracion, coordinatorId, ...data } = parsed.data;

    const normalizedCode = data.code.trim().toUpperCase();
    const normalizedType = data.type.trim();

    const duplicate = await prisma.subject.findFirst({
      where: {
        code: normalizedCode,
        type: normalizedType,
        ...(id
          ? {
            id: {
              not: id
            }
          }
          : {})
      },
      select: {
        id: true
      }
    });

    if (duplicate) {
      return {
        ok: false,
        error: `Ya existe una materia con clave ${normalizedCode} y tipo ${normalizedType}.`
      };
    }

    const relation = {
      set: careerIds.map((careerId) => ({
        id: careerId
      }))
    };

    if (id) {
      await prisma.subject.update({
        where: {
          id
        },
        data: {
          ...data,
          code: normalizedCode,
          type: normalizedType,
          duracion: duracion || null,
          coordinatorId: coordinatorId || null,
          careers: relation
        }
      });
    } else {
      await prisma.subject.create({
        data: {
          ...data,
          code: normalizedCode,
          type: normalizedType,
          duracion: duracion || null,
          coordinatorId: coordinatorId || null,
          careers: {
            connect: careerIds.map((careerId) => ({
              id: careerId
            }))
          }
        }
      });
    }

    revalidatePath("/admin/materias");

    return actionOk(
      id ? "Materia actualizada correctamente." : "Materia creada correctamente."
    );
  } catch (error) {
    return actionError(error, "No se pudo guardar la materia.");
  }
}

export async function deleteSubjectAction(
  firstArg: FormData | ActionState | undefined,
  secondArg?: FormData
): Promise<ActionState> {
  const formData = getFormData(firstArg, secondArg);

  try {
    await requireUser();
    const id = Number(formData.get("id"));

    if (!Number.isInteger(id)) {
      return { ok: false, error: "Materia inválida." };
    }

    const requests = await prisma.classroomRequest.findMany({
      where: { subjectId: id },
      select: { id: true }
    });

    const requestIds = requests.map((request: any) => request.id);

    await prisma.$transaction([
      prisma.classroomRequest.deleteMany({ where: { id: { in: requestIds } } }),
      prisma.groupSubject.deleteMany({ where: { subjectId: id } }),
      prisma.subject.delete({ where: { id } })
    ]);

    revalidatePath("/admin/materias");
    return actionOk("Materia eliminada correctamente.");
  } catch (error) {
    return actionError(error, "No se pudo eliminar la materia.");
  }
}

const classroomSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  building: z.string().trim().min(1, "El edificio es obligatorio.").max(30),
  floor: z.coerce.number().int().min(0).max(99),
  number: z.string().trim().min(1, "El salón es obligatorio.").max(20),
  capacity: z.coerce.number().int().min(1, "La capacidad debe ser mayor a 0.").max(1000),
  status: z.enum(["AVAILABLE", "MAINTENANCE", "UNAVAILABLE"]).default("AVAILABLE"),
  blockReason: z.string().trim().max(140).optional().or(z.literal(""))
});

export async function saveClassroomAction(
  firstArg: FormData | ActionState | undefined,
  secondArg?: FormData
): Promise<ActionState> {
  const formData = getFormData(firstArg, secondArg);

  try {
    await requireUser();

    const parsed = classroomSchema.safeParse({
      id: formData.get("id") || undefined,
      building: formData.get("building"),
      floor: formData.get("floor"),
      number: formData.get("number"),
      capacity: formData.get("capacity"),
      status: formData.get("status") || "AVAILABLE",
      blockReason: formData.get("blockReason") || ""
    });

    if (!parsed.success) {
      return { ok: false, error: validationError(parsed.error) };
    }

    const { id, ...data } = parsed.data;
    const blockReason = data.status === "AVAILABLE" ? null : data.blockReason || "No disponible";

    if (id) {
      await prisma.classroom.update({
        where: { id },
        data: { ...data, blockReason }
      });
    } else {
      await prisma.classroom.create({
        data: { ...data, blockReason, type: "Aula" }
      });
    }

    revalidatePath("/admin/salones");
    return actionOk(id ? "Salón actualizado correctamente." : "Salón creado correctamente.");
  } catch (error) {
    return actionError(error, "No se pudo guardar el salón.");
  }
}

export async function deleteClassroomAction(
  firstArg: FormData | ActionState | undefined,
  secondArg?: FormData
): Promise<ActionState> {
  const formData = getFormData(firstArg, secondArg);

  try {
    await requireUser();
    const id = Number(formData.get("id"));

    if (!Number.isInteger(id)) {
      return { ok: false, error: "Salón inválido." };
    }

    const requests = await prisma.classroomRequest.findMany({
      where: { classroomId: id },
      select: { id: true }
    });

    const requestIds = requests.map((request: any) => request.id);

    await prisma.$transaction([
      prisma.classroomRequest.deleteMany({ where: { id: { in: requestIds } } }),
      prisma.classroom.delete({ where: { id } })
    ]);

    revalidatePath("/admin/salones");
    revalidatePath("/admin/solicitudes");
    revalidatePath("/admin/asignaciones");

    return actionOk("Salón eliminado correctamente.");
  } catch (error) {
    return actionError(error, "No se pudo eliminar el salón.");
  }
}
const scheduleItemSchema = z.object({
  dayOfWeek: z.nativeEnum(WeekDay, {
    errorMap: () => ({
      message: "Selecciona un día."
    })
  }),
  schoolHourId: z.coerce
    .number()
    .int("La hora escolar no es válida.")
    .positive("Selecciona una hora escolar.")
});

const groupRequestSchema = z.object({
  subjectId: z.coerce
    .number()
    .int()
    .positive("La materia no es válida."),

  groupCode: z
    .string()
    .trim()
    .min(1, "Escribe el grupo."),

  classroomId: z.coerce
    .number()
    .int()
    .positive("Selecciona un salón."),

  schedules: z
    .array(scheduleItemSchema)
    .min(1, "Agrega al menos un horario.")
});
export async function requestGroupClassroomAction(
  firstArg: FormData | ActionState | undefined,
  secondArg?: FormData
): Promise<ActionState> {
  const formData = getFormData(firstArg, secondArg);

  try {
    const user = await requireUser();

    if (!user.careerId) {
      return {
        ok: false,
        error: "Tu usuario no tiene una carrera asignada."
      };
    }

    const rawSchedules = formData.get("schedules");

    if (!rawSchedules) {
      return {
        ok: false,
        error: "Agrega al menos un horario antes de enviar la solicitud."
      };
    }

    let schedulesJson: unknown;

    try {
      schedulesJson = JSON.parse(String(rawSchedules));
    } catch {
      return {
        ok: false,
        error: "Los horarios enviados no tienen un formato válido."
      };
    }

    const parsed = groupRequestSchema.safeParse({
      subjectId: formData.get("subjectId"),
      groupCode: formData.get("groupCode"),
      classroomId: formData.get("classroomId"),
      schedules: schedulesJson
    });

    if (!parsed.success) {
      return {
        ok: false,
        error: validationError(parsed.error) || "Datos de solicitud inválidos."
      };
    }

    const { subjectId, groupCode, classroomId, schedules } = parsed.data;

    const normalizedGroupCode = groupCode.trim().toUpperCase();

    const subject = await prisma.subject.findUnique({
      where: {
        id: subjectId
      },
      include: {
        careers: true
      }
    });

    if (!subject) {
      return {
        ok: false,
        error: "La materia seleccionada no existe."
      };
    }

    const subjectBelongsToCareer = subject.careers.some(
      (career) => career.id === user.careerId
    );

    if (!subjectBelongsToCareer) {
      return {
        ok: false,
        error: "La materia seleccionada no pertenece a tu carrera."
      };
    }

    const classroom = await prisma.classroom.findUnique({
      where: {
        id: classroomId
      }
    });

    if (!classroom || classroom.status !== ClassroomStatus.AVAILABLE) {
      return {
        ok: false,
        error: "El salón está inhabilitado o en mantenimiento."
      };
    }

    const scheduleKeys = new Set(
      schedules.map(
        (schedule) => `${schedule.dayOfWeek}-${schedule.schoolHourId}`
      )
    );

    if (scheduleKeys.size !== schedules.length) {
      return {
        ok: false,
        error: "No puedes agregar el mismo día y hora más de una vez."
      };
    }

    const schoolHourIds = Array.from(
      new Set(schedules.map((schedule) => schedule.schoolHourId))
    );

    const schoolHours = await prisma.schoolHour.findMany({
      where: {
        id: {
          in: schoolHourIds
        }
      },
      orderBy: {
        sortOrder: "asc"
      }
    });

    if (schoolHours.length !== schoolHourIds.length) {
      return {
        ok: false,
        error: "Una o más horas escolares no existen."
      };
    }

    let group = await prisma.academicGroup.findFirst({
      where: {
        code: normalizedGroupCode,
        careerId: user.careerId,
        semester: subject.semester
      }
    });

    if (!group) {
      group = await prisma.academicGroup.create({
        data: {
          code: normalizedGroupCode,
          careerId: user.careerId,
          semester: subject.semester,
          students: 0,
          coordinatorId: user.id
        }
      });
    }

    const unavailableSlots = await prisma.classroomUnavailableSlot.findMany({
      where: {
        classroomId,
        active: true,
        OR: schedules.map((schedule) => ({
          dayOfWeek: schedule.dayOfWeek,
          schoolHourId: schedule.schoolHourId
        }))
      },
      include: {
        schoolHour: true
      }
    });

    if (unavailableSlots.length > 0) {
      const blockedText = unavailableSlots
        .map((slot) => {
          const dayName =
            {
              MONDAY: "Lunes",
              TUESDAY: "Martes",
              WEDNESDAY: "Miércoles",
              THURSDAY: "Jueves",
              FRIDAY: "Viernes",
              SATURDAY: "Sábado"
            }[slot.dayOfWeek] || slot.dayOfWeek;

          return `${dayName} ${slot.schoolHour.code}`;
        })
        .join(", ");

      return {
        ok: false,
        error: `El salón está inhabilitado en estos horarios: ${blockedText}.`
      };
    }

    const conflicts = await prisma.classroomRequest.findMany({
      where: {
        classroomId,
        status: {
          in: [RequestStatus.PENDING, RequestStatus.APPROVED]
        },
        schedules: {
          some: {
            OR: schedules.map((schedule) => ({
              dayOfWeek: schedule.dayOfWeek,
              schoolHourId: schedule.schoolHourId
            }))
          }
        }
      },
      include: {
        schedules: {
          include: {
            schoolHour: true
          }
        },
        groupSubject: {
          include: {
            group: true
          }
        }
      }
    });

    if (conflicts.length > 0) {
      const conflictText = conflicts
        .flatMap((request) =>
          request.schedules.map((schedule) => {
            const dayName =
              {
                MONDAY: "Lunes",
                TUESDAY: "Martes",
                WEDNESDAY: "Miércoles",
                THURSDAY: "Jueves",
                FRIDAY: "Viernes",
                SATURDAY: "Sábado"
              }[schedule.dayOfWeek] || schedule.dayOfWeek;

            return `${dayName} ${schedule.schoolHour.code}`;
          })
        )
        .join(", ");

      return {
        ok: false,
        error: `Ya existe una solicitud o asignación para ese salón en: ${conflictText}.`
      };
    }

    let assignment = await prisma.groupSubject.findFirst({
      where: {
        groupId: group.id,
        subjectId
      }
    });

    if (!assignment) {
      assignment = await prisma.groupSubject.create({
        data: {
          groupId: group.id,
          subjectId
        }
      });
    }

    await prisma.classroomRequest.create({
      data: {
        coordinatorId: user.id,
        careerId: user.careerId,
        subjectId,
        classroomId,
        semester: subject.semester,
        groupSubjectId: assignment.id,
        status: RequestStatus.PENDING,
        schedules: {
          create: schedules.map((schedule) => ({
            dayOfWeek: schedule.dayOfWeek,
            schoolHourId: schedule.schoolHourId
          }))
        }
      }
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/materias");
    revalidatePath("/dashboard/grupos");
    revalidatePath("/dashboard/salones");
    revalidatePath("/admin/solicitudes");
    revalidatePath("/admin/asignaciones");

    return actionOk("Solicitud enviada correctamente.");
  } catch (error) {
    return actionError(error, "No se pudo enviar la solicitud.");
  }
}
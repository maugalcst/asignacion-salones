# AGENTS.md — FIME · Asignación de Salones

Este archivo es el contexto operativo para cualquier agente de IA (OpenCode u otro)
que trabaje en este repositorio. Léelo completo antes de proponer o ejecutar cambios.

## Qué es este proyecto

Sistema interno para FIME (UANL) que gestiona la asignación de salones a materias.
Coordinadores solicitan un salón para una materia/semestre; un Admin aprueba o
rechaza la solicitud con motivo obligatorio. Incluye catálogos de personal,
materias y salones, y un dashboard con métricas de solicitudes.

Es un proyecto académico de servicio social, en etapa temprana (pocos commits,
sin tests aún). El objetivo no es solo "que funcione", sino que el código quede
limpio y mantenible — se va a seguir desarrollando y evaluando.

## Stack (no cambiar sin aprobación explícita)

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Prisma 6** + **SQLite** (`prisma/database.db`, local, no se versiona)
- **Zod** para validación de inputs en Server Actions
- **bcryptjs** para hash de contraseñas
- Autenticación **propia por cookie httpOnly** (tabla `Session` en Prisma) —
  NO hay NextAuth, NO hay JWT. No lo introduzcas a menos que se discuta antes.
- **lucide-react** para iconos
- **CSS plano** en `src/app/globals.css` con clases utilitarias custom.
  NO hay Tailwind, NO hay CSS Modules, NO hay styled-components. Si se necesita
  un estilo nuevo, se agrega como clase nueva en `globals.css` siguiendo el
  patrón existente (selectores planos, una declaración por línea está bien,
  mobile-first con media queries al final del bloque correspondiente).

## Patrones de código a seguir (ya establecidos en el repo)

- **Toda la lógica de mutación vive en Server Actions** en `src/app/actions.ts`,
  marcadas con `"use server"`. No crear API routes (`/api/...`) para CRUD interno
  a menos que se necesite explícitamente un endpoint externo.
- Cada acción de escritura:
  1. Valida con un **schema de Zod** definido justo arriba de la función.
  2. Llama `requireUser()` de `src/lib/auth.ts` si requiere sesión (todas excepto login).
  3. Usa `prisma` (singleton importado de `src/lib/prisma.ts`, nunca instanciar
     `new PrismaClient()` fuera de ahí — eso agota conexiones en dev por hot-reload).
  4. Llama `revalidatePath(...)` sobre las rutas que muestran los datos afectados.
- Los formularios usan el `action` nativo de `<form>` apuntando directo a la
  Server Action (ver `src/components/request-actions.tsx`), no `onSubmit` + fetch
  manual. IDs se pasan vía `<input type="hidden">`.
- Componentes interactivos (modales, estado local) son `"use client"` explícito
  arriba del archivo; todo lo demás (páginas, layouts) es Server Component por
  defecto — no agregar `"use client"` si no se necesita estado o eventos del navegador.
- Operaciones de borrado que tienen relaciones dependientes usan
  `prisma.$transaction([...])` para limpiar registros relacionados antes del
  delete final (ver `deletePersonAction`, `deleteSubjectAction`, `deleteClassroomAction`
  como referencia).
- Nombres de archivo: kebab-case (`request-actions.tsx`, `dashboard-header.tsx`).
  Componentes exportados: PascalCase.
- Roles del sistema: `ADMIN`, `COORDINATOR`, `TEACHER` (enum `UserRole` en Prisma).
  Estados de solicitud: `PENDING`, `APPROVED`, `REJECTED` (enum `RequestStatus`).
  No inventar roles o estados nuevos sin antes confirmar si el cambio de schema
  está autorizado (ver sección "Modo de trabajo" abajo).

## Comandos importantes

```bash
npm run dev          # servidor de desarrollo (localhost:3000)
npm run build        # build de producción — correr SIEMPRE antes de considerar
                      # terminada una tarea, para detectar errores de tipos
npm run lint         # ESLint vía next lint
npm run db:generate  # regenerar cliente de Prisma tras tocar schema.prisma
npm run db:push      # sincronizar schema con la base SQLite local
npm run db:seed      # repoblar con datos de prueba
npm run db:reset     # reset completo + seed (borra todos los datos locales)
```

Cuenta de prueba tras seed: `admin@uanl.edu.mx` / `admin123` (rol ADMIN).

No existe todavía suite de tests automatizados ni CI configurado. Hasta que
exista, **`npm run build` + `npm run lint` son el mínimo a correr** después de
cualquier cambio, antes de considerarlo listo para revisión.

## Modo de trabajo con el agente

**Siempre proponer un plan corto antes de escribir o modificar código**, y
esperar aprobación antes de ejecutar — incluso para tareas que parezcan
pequeñas. El plan debe decir: qué archivos se van a tocar o crear, y un resumen
de 2-4 líneas del approach.

Excepción: lectura, búsqueda y exploración del repo (grep, ver archivos, correr
`build`/`lint` para diagnosticar) se puede hacer libremente sin pedir permiso —
el plan se pide antes de **escribir o modificar** código, no antes de explorarlo.

Cambios que requieren discusión explícita antes de incluirse en cualquier plan
(no asumir, no proponer como parte de un plan "implícito"):
- Modificar `prisma/schema.prisma` (cualquier cambio de modelo, relación o enum).
- Agregar una dependencia nueva a `package.json`.
- Tocar `src/lib/auth.ts` o el mecanismo de sesión/cookies.
- Cualquier cambio que afecte a más de un módulo del dashboard a la vez.

No hacer commit ni push automáticamente — eso lo decide Mau después de revisar el diff.

## Convenciones de idioma

El código (nombres de variables, funciones, tipos) está en **inglés**.
Los textos visibles al usuario (labels, mensajes de error, contenido de UI) y
los comentarios de dominio están en **español**. Mantener esa separación.
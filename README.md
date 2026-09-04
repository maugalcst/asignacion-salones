# FIME · Sistema de Asignación de Salones

Sistema web funcional desarrollado con **Next.js 15, TypeScript, Prisma y SQLite** para administrar grupos, materias, personal, salones, periodos, horarios y solicitudes de asignación de aula.

## Módulos incluidos

- Inicio y cierre de sesión con cookie HTTP-only.
- Dashboard para administrador y coordinadores.
- Solicitudes de salón con aprobación y rechazo.
- Validación de capacidad del salón.
- Validación de choques de día/hora y salones bloqueados.
- Administración de carreras.
- Administración de personal y profesores.
- Administración de materias.
- Administración de grupos académicos.
- Administración de salones y capacidades.
- Administración de periodos escolares.
- Catálogo de horas escolares.
- Bloqueo de salones por mantenimiento o indisponibilidad.
- Datos reales importados desde `pruebagrupos.txt`.
- Capacidades de salones tomadas del documento proporcionado.

## Formato de horarios importados

El reporte original usa valores como `M1,1`, `M1,3`, `N4,3`, etc. En el sistema se conserva únicamente la hora escolar principal:

- `M1,1` → `M1`
- `M1,3` → `M1`
- `N4,3` → `N4`

Los códigos numéricos de días se muestran con nombres completos:

- `1` → `Lunes`
- `2` → `Martes`
- `3` → `Miércoles`
- `4` → `Jueves`
- `5` → `Viernes`
- `6` → `Sábado`
- `135` → `Lunes, Miércoles, Viernes`

## Datos de referencia

En `data/reference/` se incluyen:

- `pruebagrupos.txt`
- `salones-capacidad.csv`
- `SALONES_CAPACIDAD_ORIGINAL.docx`

## Requisitos

- Node.js 20 o superior.
- npm.

## Instalación

```bash
npm install
cp .env.example .env
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

En Windows PowerShell, puedes copiar el archivo de entorno con:

```powershell
Copy-Item .env.example .env
```

Abre `http://localhost:3000`.

## Cuentas de prueba

- Admin: `admin@uanl.edu.mx` / `admin123`
- Super admin: `superadmin@uanl.edu.mx` / `superadmin123`

## Base de datos incluida

El proyecto incluye `prisma/database.db` con datos precargados. Si deseas reconstruir la base desde los archivos de referencia:

```bash
npm run db:reset
```

## GitHub

El ZIP está preparado para subirse a un repositorio. El archivo `.env` no se incluye; usa `.env.example` como plantilla.

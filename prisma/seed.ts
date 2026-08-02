// @ts-nocheck
import { ClassroomStatus, PrismaClient, RequestStatus, UserRole, WeekDay } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const schoolHourData = [
  ["M1", "MATUTINO", "07:00", "07:50"],
  ["M2", "MATUTINO", "07:50", "08:40"],
  ["M3", "MATUTINO", "08:40", "09:30"],
  ["M4", "MATUTINO", "09:30", "10:20"],
  ["M5", "MATUTINO", "10:20", "11:10"],
  ["M6", "MATUTINO", "11:10", "12:00"],
  ["V1", "VESPERTINO", "12:00", "12:50"],
  ["V2", "VESPERTINO", "12:50", "13:40"],
  ["V3", "VESPERTINO", "13:40", "14:30"],
  ["V4", "VESPERTINO", "14:30", "15:20"],
  ["V5", "VESPERTINO", "15:20", "16:10"],
  ["V6", "VESPERTINO", "16:10", "17:00"],
  ["N1", "NOCTURNO", "17:00", "17:50"],
  ["N2", "NOCTURNO", "17:50", "18:40"],
  ["N3", "NOCTURNO", "18:40", "19:30"],
  ["N4", "NOCTURNO", "19:30", "20:20"],
  ["N5", "NOCTURNO", "20:20", "21:10"],
  ["N6", "NOCTURNO", "21:10", "22:00"]
] as const;

async function main() {
  await prisma.session.deleteMany();
  await prisma.classroomUnavailableSlot.deleteMany();
  await prisma.classroomRequest.deleteMany();
  await prisma.groupSubject.deleteMany();
  await prisma.academicGroup.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.schoolHour.deleteMany();
  await prisma.classroom.deleteMany();
  await prisma.user.deleteMany();
  await prisma.career.deleteMany();

  const schoolHours = await Promise.all(
    schoolHourData.map(([code, shift, startTime, endTime], index) =>
      prisma.schoolHour.create({ data: { code, shift, startTime, endTime, sortOrder: index + 1 } })
    )
  );

  const careerData = [
    ["Ingeniería en Tecnología de Software", "ITS"],
    ["Ingeniería en Electrónica y Comunicaciones", "IEC"],
    ["Ingeniería Mecánico Administrador", "IMA"],
    ["Ingeniería en Administración de Sistemas", "IAS"],
    ["Ingeniería Mecánica Eléctrica", "IME"],
    ["Ingeniería Mecatrónica", "IMTC"]
  ] as const;

  const careers = await Promise.all(
    careerData.map(([name, acronym]) => prisma.career.create({ data: { name, acronym } }))
  );

  const passwordHash = await bcrypt.hash("admin123", 12);
  const people = [
    ["Juan García Gallegos", "admin@uanl.edu.mx", "juan.garcia@uanl.edu.mx", null, UserRole.ADMIN, 0],
    ["Aldair Alejandro Beltran Melendez", "1802548", "aldair.beltran@uanl.edu.mx", "1802548", UserRole.TEACHER, 0],
    ["María López Hernández", "coord1", "maria.lopez@uanl.edu.mx", "CO-1001", UserRole.COORDINATOR, 0],
    ["Carlos Rodríguez Pérez", "coord2", "carlos.rodriguez@uanl.edu.mx", "CO-1002", UserRole.COORDINATOR, 0],
    ["Ana Martínez García", "1804589", "ana.martinez@uanl.edu.mx", "1804589", UserRole.TEACHER, 1],
    ["Luis Fernando Torres", "coord3", "luis.torres@uanl.edu.mx", "CO-1003", UserRole.COORDINATOR, 3],
  ] as const;

  const users = await Promise.all(
    people.map(([name, username, email, employeeNumber, role, careerIndex]) =>
      prisma.user.create({ data: { name, username, email, employeeNumber, passwordHash, role, careerId: careers[careerIndex].id } })
    )
  );


  const classroomNumbersByBuilding: Record<string, string[]> = {
    "1": [
      "1101", "1102", "1103", "1104", "1105",
      "1201", "1202", "1203", "1204", "1205",
      "1301", "1302", "1303", "1304", "1305"
    ],
    "2": [
      "2101", "2102", "2103", "2104", "2105", "2106", "2107",
      "2201", "2202", "2203", "2204", "2205",
      "2300", "2301", "2303", "2304"
    ],
    "3": [
      "3101", "3102", "3103", "3104", "3105", "3106", "3107", "3108", "3109",
      "3201", "3202", "3203", "3204", "3205", "3206", "3207", "3208", "3209",
      "3301", "3302", "3303", "3304", "3305", "3306", "3307", "3308", "3309"
    ],
    "4": [
      "4100", "4102", "4103", "4105", "4106", "4107", "4108", "4109", "4110", "4111", "4112", "4113",
      "4200", "4201", "4202", "4203", "4204", "4205", "4206", "4207", "4208", "4211", "4212", "4213",
      "AUD4"
    ],
    "5": [
      "5000", "5001", "5002", "5101", "5102", "5105", "5106", "5108", "5111",
      "LALU", "LLIN", "LMD1", "LMD2"
    ],
    "6": [
      "6201", "6202", "6300", "6301", "6302", "6303", "6304", "6305", "6306", "6307", "6308",
      "LBF1", "ALBF1", "LBF2", "ALBF2", "LBF3", "LBF4"
    ],
    "7": [
      "7101", "7102", "7103", "7104", "7105", "7106", "7107", "7108", "7111", "7116", "7117", "7118", "7119", "7120", "7121", "7125",
      "7201", "7202", "7203", "7204", "7205", "7206", "7207", "7208", "7209", "7215", "7222", "7223",
      "CIS1", "CIS2", "CIS3", "CIS4", "CTL1", "CTL2", "CTL3", "CTL4", "CTL5", "CTL6", "CTL7", "CTL8", "CTL9",
      "DIG1", "DIG2", "DIG3", "ELEC1", "ELEC2", "LCE1", "LCE2", "LCE3", "LCOR", "LDIN", "LDIS",
      "LEA1", "LEA2", "LEA3", "LEA4", "LED1", "LED2", "LED3", "LED4", "LELE", "LELE1", "LELE2", "LELE3",
      "LLUB", "LMAN", "LMAT", "LME1", "LME2", "LME3", "LME4", "LMEC", "LMET", "LMH1", "LMH2", "LMH3", "LMH4",
      "LORG", "LPDS", "LPRO", "LQORG", "LREO", "LRF", "LROB", "LVIB", "LVIS", "SALB", "SMO"
    ],
    "8": ["8100", "8201", "8203", "8300", "REF", "LTER", "LTRAN"],
    "9": ["9102", "9103", "9104", "9105", "9201", "9202", "9203", "9204", "9205", "9301", "9303", "9304"],
    "11": ["11202", "11203", "11204", "11205", "11301", "11302", "11304"],
    "12": [
      "12201", "12202", "12203", "12204", "12205", "12206", "12207", "12208",
      "123D", "12SC", "12BDI", "12BLC", "12BMC", "12BMT", "12LIA", "12MTC", "12PLC", "12ROV", "12-SC", "12TEJ", "LBIO", "LSUB"
    ]
  };

  const labPrefixes = ["L", "AL", "CIS", "CTL", "DIG", "ELEC", "REF", "SALB", "SMO"];
  const auditoriumNumbers = new Set(["AUD4"]);

  function inferFloor(building: string, number: string) {
    const normalized = number.toUpperCase();
    if (/^\d+$/.test(normalized)) {
      if (building.length === 1) {
        return Number(normalized[1] ?? "1");
      }
      return Number(normalized[building.length] ?? "1");
    }
    if (normalized.startsWith(`${building}_`) || normalized.startsWith(`${building}-`)) {
      return 1;
    }
    return 1;
  }

  function inferType(number: string) {
    const normalized = number.toUpperCase();
    if (auditoriumNumbers.has(normalized)) return "Auditorio";
    if (labPrefixes.some((prefix) => normalized.startsWith(prefix))) return "Laboratorio";
    if (normalized.includes("LAB") || normalized.includes("LBF")) return "Laboratorio";
    return "Aula";
  }

  function inferCapacity(type: string, number: string) {
    if (type === "Auditorio") return 120;
    if (type === "Laboratorio") return 24;
    const lastDigit = Number(number.replace(/\D/g, "").at(-1) ?? "0");
    if (lastDigit % 3 === 0) return 28;
    if (lastDigit % 2 === 0) return 36;
    return 40;
  }

  const classrooms = [];
  for (const [building, numbers] of Object.entries(classroomNumbersByBuilding)) {
    for (const rawNumber of numbers) {
      const number = rawNumber.toUpperCase();
      const type = inferType(number);
      const floor = inferFloor(building, number);
      classrooms.push(
        await prisma.classroom.create({
          data: {
            number,
            building,
            floor,
            capacity: inferCapacity(type, number),
            type,
            status: ClassroomStatus.AVAILABLE,
            blockReason: null
          }
        })
      );
    }
  }

  const maintenanceClassroom = classrooms.find((classroom) => classroom.building === "9" && classroom.floor === 2 && classroom.number === "9203");
  const m4 = schoolHours.find((hour: any) => hour.code === "M4")!;
  if (maintenanceClassroom) {
    await prisma.classroomUnavailableSlot.create({
      data: {
        classroomId: maintenanceClassroom.id,
        dayOfWeek: WeekDay.THURSDAY,
        schoolHourId: m4.id,
        reason: "Revisión de proyector"
      }
    });
  }

  const subjects = await Promise.all([
    prisma.subject.create({ data: { code: "ITS-101", name: "Programación I", type: "Ordinaria", semester: 1, duracion: 16, cantidad: 90, coordinatorId: users[2].id, careers: { connect: [{ id: careers[0].id }] } } }),
    prisma.subject.create({ data: { code: "ITS-201", name: "Estructuras de Datos", type: "Ordinaria", semester: 2, duracion: 16, cantidad: 85, coordinatorId: users[3].id, careers: { connect: [{ id: careers[0].id }] } } }),
    prisma.subject.create({ data: { code: "IEC-101", name: "Circuitos Eléctricos", type: "Laboratorio", semester: 1, duracion: 16, cantidad: 24, careers: { connect: [{ id: careers[1].id }] } } }),
    prisma.subject.create({ data: { code: "IMA-201", name: "Termodinámica", type: "Ordinaria", semester: 3, duracion: null, cantidad: 60, careers: { connect: [{ id: careers[2].id }] } } }),
    prisma.subject.create({ data: { code: "IAS-301", name: "Base de Datos", type: "Ordinaria", semester: 3, duracion: 16, cantidad: 75, coordinatorId: users[5].id, careers: { connect: [{ id: careers[3].id }] } } }),
    prisma.subject.create({ data: { code: "LAB-101", name: "Laboratorio de Física", type: "Laboratorio", semester: 1, duracion: 16, cantidad: 24, careers: { connect: [{ id: careers[0].id }, { id: careers[1].id }] } } }),
  ]);

  const statuses = [RequestStatus.PENDING, RequestStatus.REJECTED, RequestStatus.APPROVED, RequestStatus.PENDING, RequestStatus.PENDING, RequestStatus.APPROVED, RequestStatus.PENDING, RequestStatus.REJECTED];
  const days = [WeekDay.MONDAY, WeekDay.TUESDAY, WeekDay.WEDNESDAY, WeekDay.THURSDAY, WeekDay.FRIDAY, WeekDay.MONDAY, WeekDay.TUESDAY, WeekDay.WEDNESDAY];
  for (let i = 0; i < statuses.length; i++) {
    const status = statuses[i];
    const req = await prisma.classroomRequest.create({
      data: {
        coordinatorId: users[3].id,
        careerId: careers[0].id,
        subjectId: subjects[i % subjects.length].id,
        classroomId: classrooms[i % classrooms.length].id,
        semester: subjects[i % subjects.length].semester,
        status,
        rejectionReason: status === RequestStatus.REJECTED ? "El salón no está disponible en ese horario." : null,
        reviewedById: status === RequestStatus.PENDING ? null : users[0].id,
        reviewedAt: status === RequestStatus.PENDING ? null : new Date(),
        schedules: {
          create: {
            dayOfWeek: days[i],
            schoolHourId: schoolHours[i % schoolHours.length].id,
          }
        }
      }
    });
  }

  const groupA = await prisma.academicGroup.create({ data: { code: "ITS-6A", careerId: careers[0].id, semester: 6, students: 36, coordinatorId: users[3].id } });
  const groupB = await prisma.academicGroup.create({ data: { code: "ITS-5B", careerId: careers[0].id, semester: 5, students: 32, coordinatorId: users[3].id } });
  const groupC = await prisma.academicGroup.create({ data: { code: "IAS-6A", careerId: careers[3].id, semester: 6, students: 34, coordinatorId: users[5].id } });

  await prisma.groupSubject.createMany({
    data: [
      { groupId: groupA.id, subjectId: subjects[0].id },
      { groupId: groupA.id, subjectId: subjects[4].id },
      { groupId: groupB.id, subjectId: subjects[2].id },
      { groupId: groupB.id, subjectId: subjects[5].id },
      { groupId: groupC.id, subjectId: subjects[0].id },
      { groupId: groupC.id, subjectId: subjects[2].id }
    ]
  });
}

main()
  .then(() => console.log("Base de datos inicializada."))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

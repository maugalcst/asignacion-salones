import { DashboardHeader } from "@/components/dashboard-header";
import { PersonnelManager } from "@/components/personnel-manager";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
export default async function PersonalPage() { const current = await requireUser(); const [people, careers] = await Promise.all([prisma.user.findMany({ select: { id: true, name: true, username: true, email: true, employeeNumber: true, role: true, careerId: true, career: { select: { id: true, acronym: true, name: true } } }, orderBy: { name: "asc" } }), prisma.career.findMany({ select: { id: true, acronym: true, name: true }, orderBy: { acronym: "asc" } })]); return <><DashboardHeader title="Personal" subtitle="Roles de personal" /><div className="content-wrap"><PersonnelManager people={people} careers={careers} currentUserId={current.id} /></div></> }

"use client";

import Link from "next/link";
import { BookOpen, Building2, ClipboardCheck, DoorOpen, Menu, Users } from "lucide-react";
import { logoutAction } from "@/app/actions";
import { useState } from "react";

const items = [
  ["/admin/solicitudes", "Pendientes de revisión", ClipboardCheck],
  ["/admin/asignaciones", "Salones asignados", DoorOpen],
  ["/admin/personal", "Personal", Users],
  ["/admin/materias", "Lista de materias", BookOpen],
  ["/admin/salones", "Lista de salones", Building2]
] as const;

export function Sidebar({ userName, career }: { userName: string; career?: string | null }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      <div className="sidebar-top" onClick={() => setCollapsed(!collapsed)}><Menu size={25} /></div>
      <nav>
        {items.map(([href, label, Icon]) => (
          <Link key={href} href={href}><Icon size={16} /><span className={collapsed ? "hidden" : ""}>{label}</span></Link>
        ))}
      </nav>
      <div className="sidebar-user">
        <div className="avatar">●</div>
        <div className={collapsed ? "hidden" : ""}><strong>{userName}</strong><small>{career || "Administración"}</small></div>
        {!collapsed && <form action={logoutAction}><button type="submit">Salir</button></form>}
      </div>
    </aside>
  );
}

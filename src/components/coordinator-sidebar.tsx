"use client";

import Link from "next/link";
import { BookOpenCheck, Building2, Menu, UsersRound } from "lucide-react";
import { logoutAction } from "@/app/actions";
import { useState } from "react";

const items = [
  ["/dashboard/materias", "Materias pendientes", BookOpenCheck],
  ["/dashboard/grupos", "Grupos asignados", UsersRound],
  ["/dashboard/salones", "Salones disponibles", Building2]
] as const;

export function CoordinatorSidebar({ userName, roleLabel }: { userName: string; roleLabel: string }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <aside className={`sidebar coordinator-sidebar ${collapsed ? "collapsed" : ""}`}>
      <div className="sidebar-top" onClick={() => setCollapsed(!collapsed)}><Menu size={25} /></div>
      <nav>
        {items.map(([href, label, Icon]) => (
          <Link key={href} href={href}><Icon size={16} /><span className={collapsed ? "hidden" : ""}>{label}</span></Link>
        ))}
      </nav>
      <div className="sidebar-user">
        <Link href="/dashboard/configuracion" className="avatar sidebar-avatar-link" title="Configuración de usuario">●</Link>
        <div className={collapsed ? "hidden" : ""}>
          <Link href="/dashboard/configuracion" className="sidebar-user-link" title="Configuración de usuario">
            <strong>{userName}</strong>
          </Link>
          <small>{roleLabel}</small>
        </div>
        {!collapsed && <form action={logoutAction}><button type="submit">Salir</button></form>}
      </div>
    </aside>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  Plane, LayoutDashboard, CreditCard, History, MessageSquare,
  QrCode, Users, Send, CalendarDays, Bell, Settings, Rocket,
  UserCircle, BarChart3, WalletCards, Search, Files, Menu, X, LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  shortLabel?: string;
  icon: React.ReactNode;
};

type SidebarProps = {
  role: "admin" | "user";
  userName?: string;
};

const adminItems: NavItem[] = [
  { href: "/admin/dashboard", label: "General / Estadísticas", shortLabel: "General", icon: <LayoutDashboard size={18} /> },
  { href: "/admin/vuelos", label: "Vuelos recibidos", shortLabel: "Vuelos", icon: <Plane size={18} /> },
  { href: "/admin/pagos", label: "Validar pagos", shortLabel: "Pagos", icon: <CreditCard size={18} /> },
  { href: "/admin/mensajes", label: "Mensajes", icon: <MessageSquare size={18} /> },
  { href: "/admin/notificaciones", label: "Notificaciones", shortLabel: "Avisos", icon: <Bell size={18} /> },
  { href: "/admin/usuarios", label: "Usuarios", icon: <Users size={18} /> },
  { href: "/admin/historial", label: "Historial", icon: <History size={18} /> },
  { href: "/admin/reportes", label: "Reportes", icon: <BarChart3 size={18} /> },
  { href: "/admin/finanzas", label: "Finanzas", shortLabel: "Fin", icon: <WalletCards size={18} /> },
  { href: "/admin/buscar", label: "Buscador global", shortLabel: "Buscar", icon: <Search size={18} /> },
  { href: "/admin/archivos", label: "Archivos", icon: <Files size={18} /> },
  { href: "/admin/configuracion", label: "Configuración", shortLabel: "Config", icon: <Settings size={18} /> },
  { href: "/admin/perfil", label: "Mi perfil", shortLabel: "Perfil", icon: <UserCircle size={18} /> },
  { href: "/admin/produccion", label: "Producción", shortLabel: "Prod", icon: <Rocket size={18} /> },
];

const userItems: NavItem[] = [
  { href: "/user/dashboard", label: "Mi resumen", shortLabel: "Resumen", icon: <LayoutDashboard size={18} /> },
  { href: "/user/vuelos", label: "Mis vuelos", shortLabel: "Vuelos", icon: <Plane size={18} /> },
  { href: "/user/vuelos/nuevo", label: "Subir vuelo", shortLabel: "Subir", icon: <Send size={18} /> },
  { href: "/user/mensajes", label: "Mensajes", icon: <MessageSquare size={18} /> },
  { href: "/user/notificaciones", label: "Notificaciones", shortLabel: "Avisos", icon: <Bell size={18} /> },
  { href: "/user/historial", label: "Historial", icon: <History size={18} /> },
  { href: "/user/perfil", label: "Mi perfil", shortLabel: "Perfil", icon: <UserCircle size={18} /> },
];

function getActiveHref(items: NavItem[], pathname: string) {
  const matches = items.filter(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
  );
  return matches.sort((a, b) => b.href.length - a.href.length)[0]?.href;
}

function Brand({ role }: { role: "admin" | "user" }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white ring-1 ring-white/10">
        {role === "admin" ? <QrCode size={22} /> : <CalendarDays size={22} />}
      </div>
      <div className="min-w-0">
        <h1 className="text-xl font-black tracking-tight text-white">
          Vuelos<span className="text-sky-300">Pro</span>
        </h1>
        <p className="truncate text-xs uppercase tracking-[0.22em] text-sky-200/70">
          {role === "admin" ? "Panel administrativo" : "Panel de usuario"}
        </p>
      </div>
    </div>
  );
}

// ─── Botón de logout reutilizable ─────────────────────────────────────────────

function LogoutButton({ compact = false }: { compact?: boolean }) {
  return (
    <form action="/logout" method="POST">
      <button
        type="submit"
        className={cn(
          "flex items-center gap-2 rounded-2xl font-bold text-sm transition active:scale-95",
          compact
            ? "px-3 py-2 bg-white/10 text-white ring-1 ring-white/20 hover:bg-rose-500/80 hover:ring-rose-400"
            : "w-full px-4 py-3 bg-white/10 text-sky-100 ring-1 ring-white/10 hover:bg-rose-500/80 hover:text-white hover:ring-rose-400"
        )}
      >
        <LogOut size={16} className="shrink-0" />
        {!compact && <span>Cerrar sesión</span>}
      </button>
    </form>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export function Sidebar({ role, userName }: SidebarProps) {
  const pathname = usePathname();
  const items = role === "admin" ? adminItems : userItems;
  const activeHref = getActiveHref(items, pathname);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => { setMenuOpen(false); }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  return (
    <>
      {/* ── HEADER MÓVIL ── */}
      <header className="fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-sky-950/95 px-4 py-3 text-white shadow-xl shadow-sky-950/20 backdrop-blur md:hidden">
        <div className="flex items-center justify-between">
          <Brand role={role} />
          {/* Botón hamburguesa */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={menuOpen}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/10 transition hover:bg-white/20 active:scale-95"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* ── DRAWER MÓVIL ── */}
      {/* Overlay oscuro */}
      <div
        onClick={() => setMenuOpen(false)}
        className={cn(
          "fixed inset-0 z-30 bg-black/30 backdrop-blur-sm transition-opacity duration-300 md:hidden",
          menuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        aria-hidden="true"
      />

      {/* Panel del menú desplegable */}
      <div
        className={cn(
          "fixed inset-x-0 top-[64px] z-40 border-b border-white/10 bg-sky-950/98 px-4 pb-5 pt-4 shadow-2xl backdrop-blur transition-all duration-300 md:hidden",
          menuOpen
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 -translate-y-3 pointer-events-none"
        )}
      >
        <nav className="grid grid-cols-4 gap-2" aria-label="Navegación principal">
          {items.map((item) => {
            const isActive = item.href === activeHref;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center justify-center gap-1.5 rounded-2xl px-2 py-3 text-[13px] font-black leading-tight transition active:scale-95 text-white ring-1 ring-white/10 ",
                  isActive
                    ? "bg-cyan-500 text-white ring-2 [&>span]:text-white [&_svg]:text-white [&_svg]:drop-shadow-[0_0_2px_rgba(255,255,255,0.6)]ring-sky-200 shadow-lg shadow-sky-100/30"
                    : "bg-white/15 text-white ring-1 ring-white/30 hover:bg-cyan-500 hover:text-white [&>span]:text-white [&_svg]:text-white [&_svg]:drop-shadow-[0_0_2px_rgba(255,255,255,0.6)] "
                )
                }
              >
                <span>{item.icon}</span>
                <span className="truncate w-full text-center">{item.shortLabel ?? item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div >

      {/* ── SIDEBAR DESKTOP ──────────────────────────────────────────────── */}
      {/* ── SIDEBAR DESKTOP ──────────────────────────────────────────────── */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden h-dvh w-72 shrink-0 flex-col border-r border-white/10 bg-sky-950 px-5 py-6 text-white md:flex">
        {/* Brand */}
        <div className="mb-6 shrink-0">
          <Brand role={role} />
        </div>

        {/* Nav items */}
        <nav
          className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain pr-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Navegación principal"
        >
          {items.map((item) => {
            const isActive = item.href === activeHref;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition",
                  isActive
                    ? "bg-cyan-500 text-white shadow-lg shadow-cyan-950/25 ring-1 ring-cyan-300"
                    : "text-sky-50/85 hover:bg-white/10 hover:text-white"
                )}
              >
                <span className="shrink-0 [&>svg]:h-5 [&>svg]:w-5">{item.icon}</span>
                <span className="truncate text-[15px]">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer — nombre + logout */}
        <div className="mt-4 shrink-0 space-y-2 border-t border-white/10 pt-4">
          {userName && (
            <div className="flex items-center gap-3 rounded-2xl px-4 py-3 bg-white/5 ring-1 ring-white/10">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-600 text-sm font-black text-white">
                {userName.charAt(0).toUpperCase()}
              </div>
              <span className="truncate text-[15px] font-bold text-sky-100">{userName}</span>
            </div>
          )}
          <form action="/logout" method="POST">
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-[15px] font-bold text-sky-100 ring-1 ring-white/10 transition hover:bg-rose-500/80 hover:text-white hover:ring-rose-400 active:scale-95"
            >
              <LogOut size={18} className="shrink-0" />
              <span>Cerrar sesión</span>
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
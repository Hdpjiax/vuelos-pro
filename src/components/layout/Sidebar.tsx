"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  Plane, LayoutDashboard, CreditCard, History, MessageSquare,
  QrCode, Users, Send, CalendarDays, Bell, Settings, Rocket,
  UserCircle, BarChart3, WalletCards, Search, Files, Menu, X, LogOut, Tag,
  Sun, Moon, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { SupportPanel } from "@/components/SupportButton";

type NavItem = { href: string; label: string; shortLabel?: string; icon: React.ReactNode };
type SidebarProps = { role: "admin" | "user"; userName?: string };

const adminItems: NavItem[] = [
  { href: "/admin/dashboard", label: "General / Estadísticas", shortLabel: "General", icon: <LayoutDashboard size={18} /> },
  { href: "/admin/vuelos", label: "Vuelos recibidos", shortLabel: "Vuelos", icon: <Plane size={18} /> },
  { href: "/admin/cotizar", label: "Cotiza tu vuelo", shortLabel: "Cotizar", icon: <Tag size={18} /> },
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
  { href: "/user/cotizar", label: "Cotiza tu vuelo", shortLabel: "Cotizar", icon: <Tag size={18} /> },
  { href: "/user/mensajes", label: "Mensajes", icon: <MessageSquare size={18} /> },
  { href: "/user/notificaciones", label: "Notificaciones", shortLabel: "Avisos", icon: <Bell size={18} /> },
  { href: "/user/historial", label: "Historial", icon: <History size={18} /> },
  { href: "/user/perfil", label: "Mi perfil", shortLabel: "Perfil", icon: <UserCircle size={18} /> },
];

function getActiveHref(items: NavItem[], pathname: string) {
  const matches = items.filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
  return matches.sort((a, b) => b.href.length - a.href.length)[0]?.href;
}

function useThemeMode() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => {
    const saved = window.localStorage.getItem("vuelos-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const next = saved === "dark" || saved === "light" ? saved : prefersDark ? "dark" : "light";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
  }, []);
  function toggleTheme() {
    setTheme((current) => {
      const next = current === "dark" ? "light" : "dark";
      document.documentElement.classList.toggle("dark", next === "dark");
      window.localStorage.setItem("vuelos-theme", next);
      return next;
    });
  }
  return { theme, toggleTheme };
}

function Brand({ role }: { role: "admin" | "user" }) {
  return (
    <div className="group flex items-center gap-3">
      <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 via-blue-500 to-violet-500 text-white shadow-xl shadow-sky-200/70 ring-1 ring-white/70 transition-transform duration-300 group-hover:scale-105 dark:from-cyan-400 dark:via-blue-500 dark:to-violet-600 dark:shadow-cyan-950/40 dark:ring-white/10">
        {role === "admin" ? <QrCode size={23} /> : <CalendarDays size={23} />}
      </div>
      <div className="min-w-0">
        <h1 className="text-xl font-black tracking-tight text-slate-950 dark:text-white">Vuelos<span className="text-sky-500 dark:text-cyan-300">Pro</span></h1>
        <p className="truncate text-xs uppercase tracking-[0.24em] text-slate-500 dark:text-sky-200/70">{role === "admin" ? "Panel administrativo" : "Panel de usuario"}</p>
      </div>
    </div>
  );
}

function ThemeButton({ theme, onToggle, compact = false }: { theme: "light" | "dark"; onToggle: () => void; compact?: boolean }) {
  return (
    <button type="button" onClick={onToggle}
      className={cn(
        "group flex items-center justify-center gap-2 rounded-2xl border border-slate-200/70 bg-white/55 font-black text-slate-700 shadow-sm shadow-slate-200/50 backdrop-blur-xl hover:border-sky-200 hover:bg-sky-50/90 hover:text-sky-700 hover:shadow-xl hover:shadow-sky-100/90 dark:border-white/10 dark:bg-white/5 dark:text-sky-100 dark:shadow-black/20 dark:hover:border-cyan-400/30 dark:hover:bg-cyan-400/10 dark:hover:text-cyan-200",
        compact ? "h-10 w-10" : "w-full px-4 py-3 text-sm"
      )}
      aria-label={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}>
      {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
      {!compact && <span>{theme === "dark" ? "Modo claro" : "Modo oscuro"}</span>}
    </button>
  );
}

function LogoutButton() {
  const router = useRouter();
  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }
  return (
    <button type="button" onClick={handleLogout}
      className="flex w-full items-center gap-2 rounded-2xl border border-rose-200/70 bg-rose-50/80 px-4 py-3 text-sm font-bold text-rose-600 shadow-sm shadow-rose-100/60 backdrop-blur-xl hover:bg-rose-500 hover:text-white hover:shadow-xl hover:shadow-rose-200/80 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-200 dark:shadow-black/20 dark:hover:bg-rose-500/80 dark:hover:text-white">
      <LogOut size={16} className="shrink-0" />
      <span>Cerrar sesión</span>
    </button>
  );
}

export function Sidebar({ role, userName }: SidebarProps) {
  const pathname = usePathname();
  const items = role === "admin" ? adminItems : userItems;
  const activeHref = getActiveHref(items, pathname);
  const [menuOpen, setMenuOpen] = useState(false);
  const { theme, toggleTheme } = useThemeMode();

  useEffect(() => { setMenuOpen(false); }, [pathname]);
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 border-b border-slate-200/50 bg-white/58 px-4 py-3 text-slate-950 shadow-xl shadow-slate-200/30 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/78 dark:text-white dark:shadow-black/30 md:hidden">
        <div className="flex items-center justify-between gap-3">
          <Brand role={role} />
          <div className="flex items-center gap-2">
            <ThemeButton theme={theme} onToggle={toggleTheme} compact />
            <button onClick={() => setMenuOpen((v) => !v)} aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"} aria-expanded={menuOpen}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200/70 bg-white/55 text-slate-700 shadow-sm shadow-slate-200/50 backdrop-blur-xl hover:bg-sky-50 hover:text-sky-700 dark:border-white/10 dark:bg-white/5 dark:text-sky-100 dark:hover:bg-cyan-400/10 dark:hover:text-cyan-200">
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      <div onClick={() => setMenuOpen(false)} className={cn("fixed inset-0 z-30 bg-slate-950/20 backdrop-blur-sm transition-opacity duration-300 dark:bg-black/55 md:hidden", menuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none")} aria-hidden="true" />

      <div className={cn("fixed inset-x-3 top-[72px] z-40 rounded-[1.75rem] border border-slate-200/60 bg-white/70 px-3 pb-4 pt-3 shadow-2xl shadow-slate-300/40 backdrop-blur-2xl transition-all duration-300 dark:border-white/10 dark:bg-slate-950/88 dark:shadow-black/50 md:hidden", menuOpen ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-3 pointer-events-none")}>
        <nav className="grid grid-cols-4 gap-2" aria-label="Navegación principal">
          {items.map((item) => {
            const isActive = item.href === activeHref;
            return (
              <Link key={item.href} href={item.href} aria-current={isActive ? "page" : undefined}
                className={cn(
                  "group flex flex-col items-center justify-center gap-1.5 rounded-2xl px-2 py-3 text-[12px] font-black leading-tight ring-1 transition-all duration-300 hover:-translate-y-1",
                  isActive
                    ? "bg-gradient-to-br from-sky-400 via-blue-500 to-violet-500 text-white shadow-xl shadow-sky-200/80 ring-white/70 dark:from-cyan-400 dark:via-blue-500 dark:to-violet-600 dark:shadow-cyan-950/30 dark:ring-white/10"
                    : "bg-white/54 text-slate-600 ring-slate-200/60 hover:bg-white/90 hover:text-sky-700 hover:shadow-xl hover:shadow-sky-100/90 dark:bg-white/5 dark:text-slate-300 dark:ring-white/10 dark:hover:bg-cyan-400/10 dark:hover:text-cyan-200"
                )}>
                <span className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:scale-110">{item.icon}</span>
                <span className="truncate w-full text-center">{item.shortLabel ?? item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="mt-3"><SupportPanel role={role} onClose={() => setMenuOpen(false)} /></div>
      </div>

      <aside className="fixed inset-y-0 left-0 z-40 hidden h-dvh w-80 shrink-0 flex-col border-r border-slate-200/50 bg-white/42 px-5 py-6 text-slate-900 shadow-2xl shadow-slate-300/30 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/70 dark:text-white dark:shadow-black/40 md:flex">
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-r-[2rem]">
          <div className="absolute -left-20 top-8 h-64 w-64 rounded-full bg-sky-300/22 blur-3xl dark:bg-cyan-400/12" />
          <div className="absolute -bottom-24 left-12 h-80 w-80 rounded-full bg-violet-300/16 blur-3xl dark:bg-violet-500/14" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.035)_1px,transparent_1px)] bg-[size:32px_32px] opacity-60 dark:bg-[linear-gradient(rgba(148,163,184,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.035)_1px,transparent_1px)]" />
        </div>
        <div className="relative mb-6 shrink-0"><Brand role={role} /></div>
        <div className="relative mb-4 flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white/44 px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-slate-500 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/5 dark:text-sky-200/70">
          <Sparkles size={14} className="text-sky-500 dark:text-cyan-300" />
          Navegación
        </div>
        <nav className="relative min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain pr-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Navegación principal">
          {items.map((item) => {
            const isActive = item.href === activeHref;
            return (
              <Link key={item.href} href={item.href} aria-current={isActive ? "page" : undefined}
                className={cn(
                  "group relative flex items-center gap-3 overflow-hidden rounded-2xl px-4 py-3.5 text-sm font-bold ring-1 transition-all duration-300 hover:-translate-y-1 hover:scale-[1.015]",
                  isActive
                    ? "bg-gradient-to-r from-sky-400 via-blue-500 to-violet-500 text-white shadow-xl shadow-sky-200/70 ring-white/70 dark:from-cyan-400 dark:via-blue-500 dark:to-violet-600 dark:shadow-cyan-950/40 dark:ring-white/10"
                    : "bg-white/34 text-slate-600 ring-white/35 hover:bg-white/74 hover:text-sky-700 hover:ring-sky-200/80 hover:shadow-xl hover:shadow-sky-100/80 dark:bg-white/[0.045] dark:text-slate-300 dark:ring-white/5 dark:hover:bg-cyan-400/10 dark:hover:text-cyan-200 dark:hover:ring-cyan-300/20 dark:hover:shadow-cyan-950/30"
                )}>
                <span className={cn("absolute inset-y-2 left-1 w-1 rounded-full transition-all duration-300", isActive ? "bg-white/90" : "bg-transparent group-hover:bg-sky-400 dark:group-hover:bg-cyan-300")} />
                <span className="shrink-0 rounded-xl p-1 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:scale-110 [&>svg]:h-5 [&>svg]:w-5">{item.icon}</span>
                <span className="truncate text-[15px] 2xl:text-[16px]">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="relative mt-4 shrink-0 space-y-2 border-t border-slate-200/60 pt-4 dark:border-white/10">
          {userName && (
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-white/44 px-4 py-3 shadow-sm shadow-slate-200/40 backdrop-blur-xl dark:border-white/10 dark:bg-white/5 dark:shadow-black/20">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-violet-500 text-sm font-black text-white shadow-lg shadow-sky-200/60 dark:from-cyan-400 dark:to-violet-600 dark:shadow-cyan-950/30">{userName.charAt(0).toUpperCase()}</div>
              <span className="truncate text-[15px] font-bold text-slate-700 dark:text-sky-100">{userName}</span>
            </div>
          )}
          <ThemeButton theme={theme} onToggle={toggleTheme} />
          <LogoutButton />
        </div>
      </aside>
    </>
  );
}

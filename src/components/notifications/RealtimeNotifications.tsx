"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, CheckCheck, LogOut, Plane, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { logoutAction } from "@/app/logout/actions";

const rolePath = { admin: "/admin/notificaciones", user: "/user/notificaciones" };
const roleFlightPath = { admin: "/admin/vuelos", user: "/user/vuelos" };

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  created_at: string;
  read?: boolean;
  flight_id?: string | null;
};

type NotificationGroup = {
  key: string;
  flightId?: string | null;
  items: NotificationItem[];
  latest: NotificationItem;
  unread: number;
};

function shortId(value?: string | null) {
  return value ? value.slice(0, 8).toUpperCase() : "SIN ID";
}

function groupItems(items: NotificationItem[]) {
  const map = new Map<string, NotificationGroup>();
  for (const item of items) {
    const key = item.flight_id ? `flight:${item.flight_id}` : `single:${item.id}`;
    const current = map.get(key);
    if (!current) {
      map.set(key, { key, flightId: item.flight_id, items: [item], latest: item, unread: item.read ? 0 : 1 });
      continue;
    }
    current.items.push(item);
    current.unread += item.read ? 0 : 1;
    if (new Date(item.created_at) > new Date(current.latest.created_at)) current.latest = item;
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.latest.created_at).getTime() - new Date(a.latest.created_at).getTime()
  );
}

// ─── Sheet de notificaciones ──────────────────────────────────────────────────

function NotificationsSheet({
  groups,
  unread,
  role,
  onClose,
  onMarkAllRead,
  onMarkGroupRead,
}: {
  groups: NotificationGroup[];
  unread: number;
  role: "admin" | "user";
  onClose: () => void;
  onMarkAllRead: () => void;
  onMarkGroupRead: (group: NotificationGroup) => void;
}) {
  // Swipe para cerrar en móvil
  const sheetRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const currentY = useRef(0);

  function onTouchStart(e: React.TouchEvent) {
    startY.current = e.touches[0].clientY;
  }

  function onTouchMove(e: React.TouchEvent) {
    currentY.current = e.touches[0].clientY;
    const delta = currentY.current - startY.current;
    if (delta > 0 && sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${delta}px)`;
      sheetRef.current.style.transition = "none";
    }
  }

  function onTouchEnd() {
    const delta = currentY.current - startY.current;
    if (sheetRef.current) {
      sheetRef.current.style.transition = "transform 0.3s ease";
      if (delta > 100) {
        sheetRef.current.style.transform = "translateY(100%)";
        setTimeout(onClose, 280);
      } else {
        sheetRef.current.style.transform = "translateY(0)";
      }
    }
  }

  // Solo mostrar no leídas en el panel flotante
  const visibleGroups = groups.filter((g) => g.unread > 0);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] bg-slate-950/30"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet — bottom en móvil, dropdown en desktop */}
      <div
        ref={sheetRef}
        className="fixed z-[70] flex flex-col
          bottom-0 left-0 right-0 max-h-[80dvh] rounded-t-[2rem]
          md:bottom-auto md:left-auto md:right-5 md:top-20 md:w-96 md:max-h-[70vh] md:rounded-[2rem]
          border border-slate-200 bg-white shadow-2xl shadow-slate-900/20"
        style={{ transform: "translateY(0)", transition: "transform 0.3s ease" }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Handle móvil */}
        <div className="flex justify-center pt-3 md:hidden" aria-hidden="true">
          <div className="h-1 w-10 rounded-full bg-slate-300" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Bell size={17} className="text-sky-700" />
            <p className="font-black text-slate-950">Notificaciones</p>
            {unread > 0 && (
              <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-black text-white">
                {unread}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unread > 0 && (
              <button
                type="button"
                onClick={onMarkAllRead}
                className="flex items-center gap-1.5 rounded-xl bg-sky-50 px-3 py-1.5 text-xs font-black text-sky-700 transition hover:bg-sky-100"
              >
                <CheckCheck size={13} />
                Marcar vistas
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Lista — solo no leídas */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-2">
          {!visibleGroups.length ? (
            <div className="rounded-2xl bg-slate-50 px-4 py-6 text-center">
              <CheckCheck size={22} className="mx-auto mb-2 text-emerald-500" />
              <p className="text-sm font-black text-slate-700">Todo al día</p>
              <p className="mt-1 text-xs text-slate-400">No tienes notificaciones pendientes</p>
            </div>
          ) : (
            visibleGroups.map((group) => (
              <button
                key={group.key}
                type="button"
                onClick={() => onMarkGroupRead(group)}
                className="block w-full rounded-2xl border border-sky-100 bg-sky-50/80 px-4 py-3 text-left transition hover:bg-sky-100 active:scale-[0.98]"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-xl bg-white p-2 text-sky-700 shadow-sm">
                    {group.flightId ? <Plane size={14} /> : <Bell size={14} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-black text-slate-900">
                        {group.flightId ? `Vuelo ${shortId(group.flightId)}` : group.latest.title}
                      </p>
                      {group.unread > 0 && (
                        <span className="shrink-0 rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-black text-white">
                          {group.unread}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                      {group.latest.body}
                    </p>
                    <p className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                      {new Date(group.latest.created_at).toLocaleString("es-MX")}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 p-4">
          <Link
            href={rolePath[role]}
            onClick={onClose}
            className="block w-full rounded-2xl border border-sky-200 bg-sky-50 py-2.5 text-center text-sm font-black text-sky-800 transition hover:bg-sky-100"
          >
            Ver centro de notificaciones
          </Link>
        </div>
      </div>
    </>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function RealtimeNotifications({
  userId,
  role = "user",
  userName,
}: {
  userId: string;
  role?: "admin" | "user";
  userName?: string;
}) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [latest, setLatest] = useState<NotificationItem | null>(null);
  const [open, setOpen] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let mounted = true;
    supabase
      .from("notifications")
      .select("id, title, body, created_at, read, flight_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => { if (mounted) setItems((data ?? []) as NotificationItem[]); });

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          const n = payload.new as NotificationItem;
          setItems((cur) => [n, ...cur].slice(0, 20));
          setLatest(n);
        }
      )
      .subscribe();

    return () => { mounted = false; supabase.removeChannel(channel); };
  }, [supabase, userId]);

  async function markAllRead() {
    const ids = items.filter((i) => !i.read).map((i) => i.id);
    if (!ids.length) return;
    await supabase.from("notifications").update({ read: true }).in("id", ids).eq("user_id", userId);
    setItems((cur) => cur.map((i) => ({ ...i, read: true })));
  }

  async function markGroupRead(group: NotificationGroup) {
    const ids = group.items.map((i) => i.id);
    await supabase.from("notifications").update({ read: true }).in("id", ids).eq("user_id", userId);
    setItems((cur) => cur.map((i) => (ids.includes(i.id) ? { ...i, read: true } : i)));
    if (group.flightId) window.location.assign(`${roleFlightPath[role]}/${group.flightId}`);
  }

  const unread = items.filter((i) => !i.read).length;
  const groups = groupItems(items);

  return (
    <>
      {/* Botón campana flotante */}
      <div className="fixed bottom-5 right-4 z-50 flex flex-col items-end gap-3 pb-[env(safe-area-inset-bottom)] md:bottom-auto md:right-5 md:top-5 md:pb-0">
        <div className="flex items-center gap-2 rounded-3xl border border-sky-100 bg-white/95 p-1.5 shadow-2xl shadow-slate-300/60 backdrop-blur">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-900 ring-1 ring-sky-100 transition hover:bg-sky-100"
            aria-label="Abrir notificaciones"
          >
            <Bell size={19} />
            {unread > 0 && (
              <span className="absolute -right-1 -top-1 rounded-full border-2 border-white bg-rose-500 px-1.5 py-0.5 text-[10px] font-black text-white">
                {unread}
              </span>
            )}
          </button>

          {/* Logout solo en móvil */}
          <form action={logoutAction} className="md:hidden">
            <button
              type="submit"
              className="inline-flex h-11 items-center gap-2 rounded-2xl bg-sky-950 px-3 text-xs font-black text-white ring-1 ring-sky-900 transition hover:bg-sky-900"
              aria-label="Cerrar sesión"
            >
              <LogOut size={16} />
              <span>Salir</span>
            </button>
          </form>
        </div>

        {/* Toast nueva notificación */}
        {latest && (
          <div className="w-[calc(100vw-2rem)] max-w-80 rounded-3xl border border-sky-200 bg-white p-4 text-sm shadow-2xl shadow-slate-300/60 md:max-w-xs">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-black text-slate-950 truncate">{latest.title}</p>
                <p className="mt-1 leading-5 text-slate-500 line-clamp-2">{latest.body}</p>
              </div>
              <button type="button" onClick={() => setLatest(null)} className="shrink-0 text-slate-400 transition hover:text-slate-700">
                <X size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sheet de notificaciones */}
      {open && (
        <NotificationsSheet
          groups={groups}
          unread={unread}
          role={role}
          onClose={() => setOpen(false)}
          onMarkAllRead={markAllRead}
          onMarkGroupRead={markGroupRead}
        />
      )}
    </>
  );
}
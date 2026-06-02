"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Bell, LogOut, Plane, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { logoutAction } from "@/app/logout/actions";

const rolePath = {
  admin: "/admin/notificaciones",
  user: "/user/notificaciones",
};

const roleFlightPath = {
  admin: "/admin/vuelos",
  user: "/user/vuelos",
};

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
      map.set(key, {
        key,
        flightId: item.flight_id,
        items: [item],
        latest: item,
        unread: item.read ? 0 : 1,
      });
      continue;
    }

    current.items.push(item);
    current.unread += item.read ? 0 : 1;
    if (new Date(item.created_at).getTime() > new Date(current.latest.created_at).getTime()) {
      current.latest = item;
    }
  }

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.latest.created_at).getTime() - new Date(a.latest.created_at).getTime()
  );
}

export function RealtimeNotifications({ userId, role = "user", userName }: { userId: string; role?: "admin" | "user"; userName?: string }) {
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
      .limit(12)
      .then(({ data }) => {
        if (mounted) setItems((data ?? []) as NotificationItem[]);
      });

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const notification = payload.new as NotificationItem;
          setItems((current) => [notification, ...current].slice(0, 12));
          setLatest(notification);
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [supabase, userId]);

  async function markVisibleAsRead() {
    const ids = items.filter((item) => !item.read).map((item) => item.id);
    if (!ids.length) return;

    await supabase.from("notifications").update({ read: true }).in("id", ids).eq("user_id", userId);
    setItems((current) => current.map((item) => ({ ...item, read: true })));
  }

  async function openGroup(group: NotificationGroup) {
    const ids = group.items.map((item) => item.id);
    if (ids.length) {
      await supabase.from("notifications").update({ read: true }).in("id", ids).eq("user_id", userId);
      setItems((current) => current.map((item) => (ids.includes(item.id) ? { ...item, read: true } : item)));
    }

    window.location.assign(group.flightId ? `${roleFlightPath[role]}/${group.flightId}` : rolePath[role]);
  }

  const unread = items.filter((item) => !item.read).length;
  const groups = groupItems(items);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex max-w-[calc(100vw-1.5rem)] flex-col items-end gap-3 pb-[env(safe-area-inset-bottom)] md:bottom-auto md:right-5 md:top-5 md:pb-0">
      <div className="flex items-center gap-2 rounded-3xl border border-sky-100 bg-white/95 p-1.5 shadow-2xl shadow-slate-300/60 backdrop-blur">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-900 ring-1 ring-sky-100 transition hover:bg-sky-100"
          aria-label="Abrir notificaciones"
        >
          <Bell size={19} />
          {unread > 0 ? (
            <span className="absolute -right-1 -top-1 rounded-full border-2 border-white bg-rose-500 px-1.5 py-0.5 text-[10px] font-black text-white">
              {unread}
            </span>
          ) : null}
        </button>
        <form action={logoutAction}>
          <button
            type="submit"
            className="inline-flex h-11 items-center gap-2 rounded-2xl bg-sky-950 px-3 text-xs font-black text-white ring-1 ring-sky-900 transition hover:bg-sky-900"
            aria-label="Cerrar sesión"
            title={userName ? `Cerrar sesión de ${userName}` : "Cerrar sesión"}
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </form>
      </div>

      {latest ? (
        <div className="w-[calc(100vw-2rem)] max-w-80 rounded-3xl border border-sky-200 bg-white p-4 text-sm shadow-2xl shadow-slate-300/60">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-black text-slate-950">{latest.title}</p>
              <p className="mt-1 leading-5 text-slate-600">{latest.body}</p>
            </div>
            <button type="button" onClick={() => setLatest(null)} className="text-slate-400 transition hover:text-slate-700">
              <X size={16} />
            </button>
          </div>
        </div>
      ) : null}

      {open ? (
        <div className="w-[calc(100vw-2rem)] max-w-80 rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-300/60">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="font-black text-slate-950">Notificaciones agrupadas</p>
            <button type="button" onClick={() => setOpen(false)} className="text-slate-400 transition hover:text-slate-700">
              <X size={16} />
            </button>
          </div>

          {!groups.length ? (
            <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-500">
              No hay notificaciones todavía.
            </p>
          ) : (
            <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
              {groups.map((group) => (
                <button
                  key={group.key}
                  type="button"
                  onClick={() => openGroup(group)}
                  className={
                    group.unread > 0
                      ? "block w-full rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-left transition hover:bg-sky-100"
                      : "block w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-left transition hover:bg-slate-100"
                  }
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 text-sky-800">{group.flightId ? <Plane size={15} /> : <Bell size={15} />}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-black text-slate-900">
                          {group.flightId ? `Vuelo ${shortId(group.flightId)}` : group.latest.title}
                        </p>
                        {group.unread > 0 ? <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-black text-sky-900">{group.unread}</span> : null}
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">{group.latest.body}</p>
                      <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                        {new Date(group.latest.created_at).toLocaleString("es-MX")} · {group.items.length} aviso{group.items.length === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={markVisibleAsRead}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={unread === 0}
            >
              Marcar vistas
            </button>
            <Link
              href={rolePath[role]}
              className="rounded-2xl border border-sky-200 bg-sky-50 px-3 py-2 text-center text-xs font-black text-sky-900 transition hover:bg-sky-100"
            >
              Ver centro
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}

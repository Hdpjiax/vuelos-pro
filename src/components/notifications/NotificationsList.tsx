import { Bell, CheckCircle2, ExternalLink, Plane } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { buttonPrimary, buttonSecondarySmall } from "@/lib/styles";
import { formatDate, formatDateTime, statusLabel } from "@/lib/utils";
import { markAllNotificationsReadAction, markNotificationGroupReadAction } from "@/app/notifications/actions";

export type NotificationItem = {
  id: string;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
  flight_id?: string | null;
  flights?: {
    id?: string | null;
    flight_date?: string | null;
    flight_time?: string | null;
    status?: string | null;
  } | null;
};

type NotificationGroup = {
  key: string;
  flightId?: string | null;
  flight?: NotificationItem["flights"];
  items: NotificationItem[];
  latest: NotificationItem;
  unread: number;
};

type NotificationsListProps = {
  role: "admin" | "user";
  notifications: NotificationItem[];
};

function shortId(value?: string | null) {
  return value ? value.slice(0, 8).toUpperCase() : "SIN ID";
}

function groupNotifications(notifications: NotificationItem[]) {
  const map = new Map<string, NotificationGroup>();

  for (const item of notifications) {
    const key = item.flight_id ? `flight:${item.flight_id}` : `single:${item.id}`;
    const current = map.get(key);

    if (!current) {
      map.set(key, {
        key,
        flightId: item.flight_id,
        flight: item.flights,
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

  return Array.from(map.values())
    .map((group) => ({
      ...group,
      items: group.items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    }))
    .sort((a, b) => new Date(b.latest.created_at).getTime() - new Date(a.latest.created_at).getTime());
}

export function NotificationsList({ role, notifications }: NotificationsListProps) {
  const unread = notifications.filter((item) => !item.read).length;
  const groups = groupNotifications(notifications);
  const basePath = role === "admin" ? "/admin" : "/user";
  const currentPath = `${basePath}/notificaciones`;

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/60 backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.24em] text-sky-700">
              {role === "admin" ? "Panel administrativo" : "Panel de usuario"}
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Notificaciones</h2>
            <p className="mt-2 text-slate-500">
              Avisos agrupados por vuelo. Al abrir un grupo se marcan como leídas sus notificaciones pendientes.
            </p>
          </div>

          <form action={markAllNotificationsReadAction}>
            <input type="hidden" name="redirect_to" value={currentPath} />
            <button className={buttonPrimary} disabled={unread === 0}>
              <CheckCircle2 size={18} />
              Marcar todas como leídas
            </button>
          </form>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-4">
        <article className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/60">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Grupos</p>
          <p className="mt-3 text-3xl font-black text-slate-950">{groups.length}</p>
          <p className="mt-1 text-sm text-slate-500">Vuelos o avisos únicos</p>
        </article>
        <article className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/60">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Total</p>
          <p className="mt-3 text-3xl font-black text-slate-950">{notifications.length}</p>
          <p className="mt-1 text-sm text-slate-500">Avisos cargados</p>
        </article>
        <article className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6 shadow-xl shadow-amber-100/60">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-600">Sin leer</p>
          <p className="mt-3 text-3xl font-black text-amber-900">{unread}</p>
          <p className="mt-1 text-sm text-amber-700">Requieren revisión</p>
        </article>
        <article className="rounded-[2rem] border border-emerald-200 bg-emerald-50 p-6 shadow-xl shadow-emerald-100/60">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600">Leídas</p>
          <p className="mt-3 text-3xl font-black text-emerald-900">{notifications.length - unread}</p>
          <p className="mt-1 text-sm text-emerald-700">Ya revisadas</p>
        </article>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/60 backdrop-blur">
        {!groups.length ? (
          <EmptyState title="No hay notificaciones todavía." description="Cuando haya movimientos importantes aparecerán en esta pantalla." />
        ) : (
          <div className="grid gap-4">
            {groups.map((group) => {
              const ids = group.items.map((item) => item.id).join(",");
              const groupIsRead = group.unread === 0;
              const redirectTo = group.flightId ? `${basePath}/vuelos/${group.flightId}` : currentPath;
              const title = group.flightId ? `Vuelo ${shortId(group.flightId)}` : group.latest.title;
              const date = group.flight?.flight_date ? formatDate(group.flight.flight_date) : null;
              const hour = group.flight?.flight_time ? String(group.flight.flight_time).slice(0, 5) : null;
              const status = group.flight?.status ? statusLabel(group.flight.status) : null;

              return (
                <article
                  key={group.key}
                  className={
                    groupIsRead
                      ? "rounded-3xl border border-slate-200 bg-white p-5"
                      : "rounded-3xl border border-sky-200 bg-sky-50/80 p-5 shadow-sm shadow-sky-100"
                  }
                >
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="flex gap-4">
                      <div className={groupIsRead ? "mt-1 rounded-2xl bg-slate-100 p-3 text-slate-500" : "mt-1 rounded-2xl bg-white p-3 text-sky-800"}>
                        {group.flightId ? <Plane size={18} /> : <Bell size={18} />}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-black text-slate-950">{title}</h3>
                          {!groupIsRead ? (
                            <span className="rounded-full border border-sky-200 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-sky-800">
                              {group.unread} nueva{group.unread === 1 ? "" : "s"}
                            </span>
                          ) : null}
                          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                            {group.items.length} aviso{group.items.length === 1 ? "" : "s"}
                          </span>
                        </div>

                        {group.flightId ? (
                          <p className="mt-2 text-sm font-semibold text-slate-500">
                            {date ?? "Sin fecha"}{hour ? ` · ${hour}` : ""}{status ? ` · ${status}` : ""}
                          </p>
                        ) : null}

                        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-700">
                          <span className="font-black text-slate-950">{group.latest.title}:</span> {group.latest.body}
                        </p>
                        <p className="mt-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                          Último movimiento: {formatDateTime(group.latest.created_at)}
                        </p>

                        {group.items.length > 1 ? (
                          <div className="mt-4 rounded-2xl border border-slate-200 bg-white/80 p-3">
                            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Resumen del grupo</p>
                            <div className="space-y-2">
                              {group.items.slice(0, 3).map((item) => (
                                <div key={item.id} className="flex items-start justify-between gap-3 text-xs">
                                  <p className="line-clamp-1 font-bold text-slate-700">{item.title}</p>
                                  <p className="shrink-0 font-semibold text-slate-400">{formatDateTime(item.created_at)}</p>
                                </div>
                              ))}
                              {group.items.length > 3 ? (
                                <p className="text-xs font-bold text-slate-400">+ {group.items.length - 3} aviso{group.items.length - 3 === 1 ? "" : "s"} más</p>
                              ) : null}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <form action={markNotificationGroupReadAction} className="shrink-0">
                      <input type="hidden" name="notification_ids" value={ids} />
                      <input type="hidden" name="redirect_to" value={redirectTo} />
                      <button className={buttonSecondarySmall}>
                        <ExternalLink size={15} />
                        {group.flightId ? "Abrir vuelo" : "Abrir aviso"}
                      </button>
                    </form>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

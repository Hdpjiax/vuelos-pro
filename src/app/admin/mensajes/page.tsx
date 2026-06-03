import Link from "next/link";
import { MessageSquare, Plane, UserRound, Headphones } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { createClient } from "@/lib/supabase/server";
import { buttonPrimarySmall, buttonSecondarySmall } from "@/lib/styles";
import { formatDateTime } from "@/lib/utils";

function shortId(value?: string | null) {
  return value ? value.slice(0, 8).toUpperCase() : "SIN ID";
}

function getFlight(row: any) {
  return Array.isArray(row?.flights) ? row.flights[0] : row?.flights;
}

export default async function AdminMessagesPage() {
  const supabase = await createClient();

  const [{ data: flightMessages }, { data: flights }, { data: supportMessages }] = await Promise.all([
    supabase
      .from("flight_messages")
      .select("id, message, message_type, created_at, flight_id, sender_id, flights(id, user_id, flight_date, flight_time, status)")
      .order("created_at", { ascending: false })
      .limit(120),
    supabase
      .from("flights")
      .select("id, user_id, profiles(full_name, email)")
      .order("created_at", { ascending: false }),
    supabase
      .from("support_messages")
      .select("id, message, sender_id, created_at, user_id, profiles:user_id(full_name, email)")
      .order("created_at", { ascending: false })
      .limit(120),
  ]);

  // Mapa owner por vuelo
  const ownerByFlight = new Map<string, { id: string; full_name?: string | null; email?: string | null }>();
  for (const flight of flights ?? []) {
    const profile = Array.isArray((flight as any).profiles) ? (flight as any).profiles[0] : (flight as any).profiles;
    ownerByFlight.set((flight as any).id, {
      id: (flight as any).user_id,
      full_name: profile?.full_name,
      email: profile?.email,
    });
  }

  // Agrupar mensajes de vuelos por usuario
  type FlightGroup = {
    userId: string; userName: string; userEmail: string;
    messages: any[]; flightIds: Set<string>; latest: any;
  };
  const flightGrouped = new Map<string, FlightGroup>();
  for (const message of flightMessages ?? []) {
    const flight = getFlight(message);
    const owner = ownerByFlight.get(message.flight_id) ?? {
      id: flight?.user_id ?? "sin-usuario", full_name: null, email: null,
    };
    if (!flightGrouped.has(owner.id)) {
      flightGrouped.set(owner.id, {
        userId: owner.id,
        userName: owner.full_name || owner.email || "Usuario",
        userEmail: owner.email || "Sin correo",
        messages: [], flightIds: new Set<string>(), latest: message,
      });
    }
    const group = flightGrouped.get(owner.id)!;
    group.messages.push(message);
    if (message.flight_id) group.flightIds.add(message.flight_id);
    if (new Date(message.created_at) > new Date(group.latest.created_at)) group.latest = message;
  }
  const flightGroups = Array.from(flightGrouped.values()).sort(
    (a, b) => new Date(b.latest.created_at).getTime() - new Date(a.latest.created_at).getTime()
  );

  // Agrupar mensajes de soporte por usuario
  type SupportGroup = {
    userId: string; userName: string; userEmail: string;
    messages: any[]; latest: any;
  };
  const supportGrouped = new Map<string, SupportGroup>();
  for (const msg of supportMessages ?? []) {
    const uid = msg.user_id;
    const profile = Array.isArray((msg as any).profiles) ? (msg as any).profiles[0] : (msg as any).profiles;
    if (!supportGrouped.has(uid)) {
      supportGrouped.set(uid, {
        userId: uid,
        userName: profile?.full_name || profile?.email || "Usuario",
        userEmail: profile?.email || "Sin correo",
        messages: [], latest: msg,
      });
    }
    const g = supportGrouped.get(uid)!;
    g.messages.push(msg);
    if (new Date(msg.created_at) > new Date(g.latest.created_at)) g.latest = msg;
  }
  const supportGroups = Array.from(supportGrouped.values()).sort(
    (a, b) => new Date(b.latest.created_at).getTime() - new Date(a.latest.created_at).getTime()
  );

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/60 backdrop-blur">
        <p className="text-sm font-black uppercase tracking-[0.24em] text-sky-700">Panel administrativo</p>
        <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Mensajes</h2>
        <p className="mt-2 text-slate-500">Conversaciones de vuelos y mensajes de soporte general agrupados por usuario.</p>
      </section>

      {/* Stats */}
      <section className="grid gap-5 md:grid-cols-4">
        <article className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/60">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Usuarios (vuelos)</p>
          <p className="mt-3 text-3xl font-black text-slate-950">{flightGroups.length}</p>
        </article>
        <article className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/60">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Mensajes vuelos</p>
          <p className="mt-3 text-3xl font-black text-slate-950">{flightMessages?.length ?? 0}</p>
        </article>
        <article className="rounded-[2rem] border border-slate-200 bg-white/90 p-5 shadow-xl shadow-slate-200/60">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Soporte general</p>
          <p className="mt-3 text-3xl font-black text-slate-950">{supportGroups.length}</p>
          <p className="mt-1 text-sm text-slate-500">Usuarios con chat</p>
        </article>
        <article className="rounded-[2rem] border border-slate-200 bg-white/90 p-5 shadow-xl shadow-slate-200/60">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Mensajes soporte</p>
          <p className="mt-3 text-3xl font-black text-slate-950">{supportMessages?.length ?? 0}</p>
        </article>
      </section>

      {/* ── SOPORTE GENERAL ── */}
      <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/60 backdrop-blur">
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-2xl bg-sky-50 p-2.5 text-sky-700"><Headphones size={18} /></div>
          <div>
            <h3 className="text-lg font-black text-slate-950">Soporte general</h3>
            <p className="text-xs text-slate-400">Mensajes directos sin vuelo asociado</p>
          </div>
        </div>
        {!supportGroups.length ? (
          <EmptyState title="No hay mensajes de soporte." description="Cuando un usuario escriba desde el chat flotante aparecerá aquí." />
        ) : (
          <div className="grid gap-4">
            {supportGroups.map((group) => (
              <article key={group.userId} className="rounded-3xl border border-sky-100 bg-sky-50/40 p-5 transition hover:border-sky-300 hover:bg-sky-50">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="flex gap-4">
                    <div className="mt-1 rounded-2xl bg-sky-100 p-3 text-sky-700"><Headphones size={19} /></div>
                    <div>
                      <h3 className="font-black text-slate-950">{group.userName}</h3>
                      <p className="mt-1 text-sm text-slate-500">{group.userEmail}</p>
                      <span className="mt-2 inline-block rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-black text-sky-700">
                        {group.messages.length} mensaje{group.messages.length === 1 ? "" : "s"}
                      </span>
                      <p className="mt-3 line-clamp-2 max-w-3xl text-sm leading-6 text-slate-700">{group.latest.message}</p>
                      <p className="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                        Último: {formatDateTime(group.latest.created_at)}
                      </p>
                    </div>
                  </div>
                  <Link href={`/admin/mensajes/${group.userId}?tab=soporte`} className={buttonPrimarySmall}>
                    <MessageSquare size={15} />
                    Responder
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* ── MENSAJES POR VUELO ── */}
      <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/60 backdrop-blur">
        <h3 className="mb-5 text-lg font-black text-slate-950">Mensajes por vuelo</h3>
        {!flightGroups.length ? (
          <EmptyState title="No hay mensajes de vuelos todavía." description="Los mensajes de cuentas bancarias, comprobantes y QR aparecerán agrupados por usuario." />
        ) : (
          <div className="grid gap-4">
            {flightGroups.map((group) => {
              const latestFlight = getFlight(group.latest);
              return (
                <article key={group.userId} className="rounded-3xl border border-slate-200 bg-white p-5 transition hover:border-sky-200 hover:bg-sky-50/40">
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="flex gap-4">
                      <div className="mt-1 rounded-2xl bg-sky-50 p-3 text-sky-800"><UserRound size={19} /></div>
                      <div>
                        <h3 className="font-black text-slate-950">{group.userName}</h3>
                        <p className="mt-1 text-sm font-semibold text-slate-500">{group.userEmail}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-600">
                            {group.messages.length} mensaje{group.messages.length === 1 ? "" : "s"}
                          </span>
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-600">
                            {group.flightIds.size} vuelo{group.flightIds.size === 1 ? "" : "s"}
                          </span>
                        </div>
                        <p className="mt-4 line-clamp-2 max-w-3xl text-sm leading-6 text-slate-700">{group.latest.message}</p>
                        <p className="mt-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                          Último: {formatDateTime(group.latest.created_at)} · Vuelo {shortId(group.latest.flight_id)}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 xl:justify-end">
                      <Link href={`/admin/mensajes/${group.userId}`} className={buttonPrimarySmall}>
                        <MessageSquare size={15} />
                        Ver conversación
                      </Link>
                      {latestFlight?.id ? (
                        <Link href={`/admin/vuelos/${latestFlight.id}`} className={buttonSecondarySmall}>
                          <Plane size={15} />
                          Último vuelo
                        </Link>
                      ) : null}
                    </div>
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
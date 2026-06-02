import Link from "next/link";
import { MessageSquare, Plane, UserRound } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { createClient } from "@/lib/supabase/server";
import { buttonPrimarySmall, buttonSecondarySmall } from "@/lib/styles";
import { formatDateTime } from "@/lib/utils";

type MessageGroup = {
  userId: string;
  userName: string;
  userEmail: string;
  messages: any[];
  flightIds: Set<string>;
  latest: any;
};

function shortId(value?: string | null) {
  return value ? value.slice(0, 8).toUpperCase() : "SIN ID";
}

function getFlight(row: any) {
  return Array.isArray(row?.flights) ? row.flights[0] : row?.flights;
}

export default async function AdminMessagesPage() {
  const supabase = await createClient();

  const [{ data: messages }, { data: flights }] = await Promise.all([
    supabase
      .from("flight_messages")
      .select("id, message, message_type, created_at, flight_id, sender_id, flights(id, user_id, flight_date, flight_time, status)")
      .order("created_at", { ascending: false })
      .limit(120),
    supabase
      .from("flights")
      .select("id, user_id, profiles(full_name, email)")
      .order("created_at", { ascending: false }),
  ]);

  const ownerByFlight = new Map<string, { id: string; full_name?: string | null; email?: string | null }>();

  for (const flight of flights ?? []) {
    const profile = Array.isArray((flight as any).profiles) ? (flight as any).profiles[0] : (flight as any).profiles;
    ownerByFlight.set((flight as any).id, {
      id: (flight as any).user_id,
      full_name: profile?.full_name,
      email: profile?.email,
    });
  }

  const grouped = new Map<string, MessageGroup>();

  for (const message of messages ?? []) {
    const flight = getFlight(message);
    const owner = ownerByFlight.get(message.flight_id) ?? {
      id: flight?.user_id ?? "sin-usuario",
      full_name: null,
      email: null,
    };

    if (!grouped.has(owner.id)) {
      grouped.set(owner.id, {
        userId: owner.id,
        userName: owner.full_name || owner.email || "Usuario",
        userEmail: owner.email || "Sin correo",
        messages: [],
        flightIds: new Set<string>(),
        latest: message,
      });
    }

    const group = grouped.get(owner.id)!;
    group.messages.push(message);
    if (message.flight_id) group.flightIds.add(message.flight_id);
    if (new Date(message.created_at).getTime() > new Date(group.latest.created_at).getTime()) {
      group.latest = message;
    }
  }

  const groups = Array.from(grouped.values()).sort(
    (a, b) => new Date(b.latest.created_at).getTime() - new Date(a.latest.created_at).getTime()
  );

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/60 backdrop-blur">
        <p className="text-sm font-black uppercase tracking-[0.24em] text-sky-700">Panel administrativo</p>
        <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Mensajes</h2>
        <p className="mt-2 text-slate-500">Conversaciones agrupadas por usuario para evitar listas extensas de mensajes sueltos.</p>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        <article className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/60">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Usuarios con conversación</p>
          <p className="mt-3 text-3xl font-black text-slate-950">{groups.length}</p>
          <p className="mt-1 text-sm text-slate-500">Grupos visibles</p>
        </article>
        <article className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/60">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Mensajes</p>
          <p className="mt-3 text-3xl font-black text-slate-950">{messages?.length ?? 0}</p>
          <p className="mt-1 text-sm text-slate-500">Últimos cargados</p>
        </article>
        <article className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/60">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Vuelos con mensajes</p>
          <p className="mt-3 text-3xl font-black text-slate-950">
            {new Set((messages ?? []).map((message: any) => message.flight_id).filter(Boolean)).size}
          </p>
          <p className="mt-1 text-sm text-slate-500">Conversaciones por vuelo</p>
        </article>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/60 backdrop-blur">
        {!groups.length ? (
          <EmptyState title="No hay mensajes todavía." description="Los mensajes de cuentas bancarias, comprobantes y QR aparecerán agrupados por usuario." />
        ) : (
          <div className="grid gap-4">
            {groups.map((group) => {
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
                          Último mensaje: {formatDateTime(group.latest.created_at)} · Vuelo {shortId(group.latest.flight_id)}
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

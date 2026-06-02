import Link from "next/link";
import { MessageSquare, Plane } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { createClient } from "@/lib/supabase/server";
import { buttonPrimarySmall } from "@/lib/styles";
import { formatDate, formatDateTime } from "@/lib/utils";

type FlightMessageGroup = {
  flightId: string;
  flight: any;
  messages: any[];
  latest: any;
};

function shortId(value?: string | null) {
  return value ? value.slice(0, 8).toUpperCase() : "SIN ID";
}

function getFlight(row: any) {
  return Array.isArray(row?.flights) ? row.flights[0] : row?.flights;
}

export default async function UserMessagesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: messages } = await supabase
    .from("flight_messages")
    .select("id, message, message_type, created_at, flight_id, sender_id, flights!inner(id, user_id, flight_date, flight_time, status), profiles:sender_id(full_name, email)")
    .eq("flights.user_id", user?.id)
    .order("created_at", { ascending: false })
    .limit(120);

  const grouped = new Map<string, FlightMessageGroup>();

  for (const message of messages ?? []) {
    const flight = getFlight(message);
    const flightId = message.flight_id ?? flight?.id;
    if (!flightId) continue;

    if (!grouped.has(flightId)) {
      grouped.set(flightId, {
        flightId,
        flight,
        messages: [],
        latest: message,
      });
    }

    const group = grouped.get(flightId)!;
    group.messages.push(message);
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
        <p className="text-sm font-black uppercase tracking-[0.24em] text-sky-700">Panel de usuario</p>
        <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Mensajes</h2>
        <p className="mt-2 text-slate-500">Tus mensajes están agrupados por vuelo para encontrar rápido cuentas, confirmaciones y QR.</p>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        <article className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/60">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Conversaciones</p>
          <p className="mt-3 text-3xl font-black text-slate-950">{groups.length}</p>
          <p className="mt-1 text-sm text-slate-500">Agrupadas por vuelo</p>
        </article>
        <article className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/60">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Mensajes</p>
          <p className="mt-3 text-3xl font-black text-slate-950">{messages?.length ?? 0}</p>
          <p className="mt-1 text-sm text-slate-500">Últimos recibidos</p>
        </article>
        <article className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/60">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Última actividad</p>
          <p className="mt-3 text-xl font-black text-slate-950">{groups[0]?.latest ? formatDateTime(groups[0].latest.created_at) : "Sin actividad"}</p>
          <p className="mt-1 text-sm text-slate-500">Mensaje más reciente</p>
        </article>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/60 backdrop-blur">
        {!groups.length ? (
          <EmptyState title="No tienes mensajes todavía." description="Cuando el administrador envíe cuenta bancaria, confirmaciones o QR, aparecerán aquí por vuelo." />
        ) : (
          <div className="grid gap-4">
            {groups.map((group) => (
              <article key={group.flightId} className="rounded-3xl border border-slate-200 bg-white p-5 transition hover:border-sky-200 hover:bg-sky-50/40">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div className="flex gap-4">
                    <div className="mt-1 rounded-2xl bg-sky-50 p-3 text-sky-800"><Plane size={19} /></div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-black text-slate-950">Vuelo {shortId(group.flightId)}</h3>
                        {group.flight?.status ? <StatusBadge status={group.flight.status} /> : null}
                      </div>
                      <p className="mt-2 text-sm font-semibold text-slate-500">
                        {group.flight?.flight_date ? formatDate(group.flight.flight_date) : "Sin fecha"} · {String(group.flight?.flight_time ?? "").slice(0, 5) || "Sin hora"}
                      </p>
                      <p className="mt-4 line-clamp-2 max-w-3xl text-sm leading-6 text-slate-700">{group.latest.message}</p>
                      <p className="mt-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                        {group.messages.length} mensaje{group.messages.length === 1 ? "" : "s"} · último: {formatDateTime(group.latest.created_at)}
                      </p>

                      {group.messages.length > 1 ? (
                        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Últimos mensajes</p>
                          <div className="space-y-2">
                            {group.messages.slice(0, 3).map((message) => (
                              <div key={message.id} className="text-xs leading-5 text-slate-600">
                                <span className="font-black text-slate-800">{message.profiles?.full_name || message.profiles?.email || "Sistema"}: </span>
                                <span className="line-clamp-1">{message.message}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <Link href={`/user/vuelos/${group.flightId}`} className={buttonPrimarySmall}>
                    <MessageSquare size={15} />
                    Abrir vuelo
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

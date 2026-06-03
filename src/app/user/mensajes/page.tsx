import Link from "next/link";
import { MessageSquare, Plane, Plus, Headphones } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { createClient } from "@/lib/supabase/server";
import { buttonPrimarySmall } from "@/lib/styles";
import { formatDate, formatDateTime } from "@/lib/utils";
import { OpenSupportChatButton } from "@/components/ui/OpenSupportChatButton";
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
  const { data: { user } } = await supabase.auth.getUser();

  // Mensajes de vuelos
  const { data: messages } = await supabase
    .from("flight_messages")
    .select("id, message, message_type, created_at, flight_id, sender_id, flights!inner(id, user_id, flight_date, flight_time, status), profiles:sender_id(full_name, email)")
    .eq("flights.user_id", user?.id)
    .order("created_at", { ascending: false })
    .limit(120);

  // Mensajes de soporte general
  const { data: supportMessages } = await supabase
    .from("support_messages")
    .select("id, message, sender_id, created_at, profiles:sender_id(full_name, email)")
    .eq("user_id", user?.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const grouped = new Map<string, FlightMessageGroup>();
  for (const message of messages ?? []) {
    const flight = getFlight(message);
    const flightId = message.flight_id ?? flight?.id;
    if (!flightId) continue;
    if (!grouped.has(flightId)) {
      grouped.set(flightId, { flightId, flight, messages: [], latest: message });
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
        <p className="mt-2 text-slate-500">Tus mensajes de vuelos y conversaciones de soporte general.</p>
      </section>

      {/* Stats */}
      <section className="grid gap-5 md:grid-cols-3">
        <article className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/60">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Vuelos con mensajes</p>
          <p className="mt-3 text-3xl font-black text-slate-950">{groups.length}</p>
          <p className="mt-1 text-sm text-slate-500">Agrupados por vuelo</p>
        </article>
        <article className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/60">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Mensajes totales</p>
          <p className="mt-3 text-3xl font-black text-slate-950">{messages?.length ?? 0}</p>
          <p className="mt-1 text-sm text-slate-500">En todos tus vuelos</p>
        </article>
        <article className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/60">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Soporte general</p>
          <p className="mt-3 text-3xl font-black text-slate-950">{supportMessages?.length ?? 0}</p>
          <p className="mt-1 text-sm text-slate-500">Mensajes directos</p>
        </article>
      </section>

      {/* ── SOPORTE GENERAL ── */}
      <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/60 backdrop-blur">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-sky-50 p-2.5 text-sky-700"><Headphones size={18} /></div>
            <div>
              <h3 className="text-lg font-black text-slate-950">Soporte general</h3>
              <p className="text-xs text-slate-400">Conversa con soporte sin necesidad de un vuelo</p>
            </div>
          </div>
          {/* Botón nueva conversación — abre el chat flotante */}
          <OpenSupportChatButton />

        </div>

        {!supportMessages?.length ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-8 text-center">
            <Headphones size={28} className="mx-auto mb-3 text-slate-300" />
            <p className="font-black text-slate-500">Sin mensajes de soporte aún</p>
            <p className="mt-1 text-sm text-slate-400">Usa el botón azul abajo a la derecha para escribirnos</p>
          </div>
        ) : (
          <div className="space-y-3">
            {supportMessages.slice(0, 5).map((msg: any) => {
              const isMine = msg.sender_id === user?.id;
              return (
                <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-3xl px-4 py-3 ${isMine
                    ? 'bg-sky-600 text-white rounded-br-md'
                    : 'border border-slate-200 bg-white text-slate-900 rounded-bl-md'
                    }`}>
                    {!isMine && (
                      <p className="mb-1 text-[10px] font-black uppercase tracking-wide text-sky-700">
                        {msg.profiles?.full_name || 'Soporte'}
                      </p>
                    )}
                    <p className="text-sm leading-relaxed">{msg.message}</p>
                    <p className={`mt-1 text-right text-[10px] font-bold ${isMine ? 'text-sky-200' : 'text-slate-400'}`}>
                      {formatDateTime(msg.created_at)}
                    </p>
                  </div>
                </div>
              );
            })}
            {supportMessages.length > 5 && (
              <p className="text-center text-xs text-slate-400 font-bold pt-1">
                + {supportMessages.length - 5} mensajes anteriores — ábrelos en el chat flotante
              </p>
            )}
          </div>
        )}
      </section>

      {/* ── MENSAJES POR VUELO ── */}
      <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/60 backdrop-blur">
        <h3 className="mb-5 text-lg font-black text-slate-950">Mensajes por vuelo</h3>
        {!groups.length ? (
          <EmptyState title="No tienes mensajes de vuelos todavía." description="Cuando el administrador envíe cuenta bancaria, confirmaciones o QR, aparecerán aquí." />
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
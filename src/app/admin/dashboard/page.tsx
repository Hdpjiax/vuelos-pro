import Link from "next/link";
import { AlertTriangle, CheckCircle2, CreditCard, MessageSquare, QrCode } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { createClient } from "@/lib/supabase/server";
import { buttonPrimary, buttonSecondarySmall } from "@/lib/styles";
import { maybeNotifyUpcomingFlights } from "@/lib/flight-operations";
import { addDaysISO, flightTypeLabel, formatCurrency, formatFlightFolio, formatDate, formatTime, getAmountToPay, getTodayISO } from "@/lib/utils";
import type { Flight, Profile, FlightMessage } from "@/lib/types";
export const revalidate = 60;
export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const today = getTodayISO();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: settingsRow } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "operations")
    .maybeSingle();
  const settings = settingsRow?.value as Record<string, unknown> | null;
  const urgentWindowDays = Number(settings?.urgent_window_days ?? 3);
  const urgentDays = Number.isFinite(urgentWindowDays) ? urgentWindowDays : 3;
  const urgentLimit = addDaysISO(urgentDays);

  const [
    { count: usersCount },
    { data: paidFlights },
    { data: rawUrgentFlights },
    { count: pendingFlights },
    { count: paymentUploaded },
    { count: pendingQr },
    { count: unreadNotifications },
    { data: rawLatestMessages },
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "user"),
    supabase
      .from("flights")
      .select("total_amount, amount_to_pay")
      .in("status", ["pago_confirmado", "pendiente_qr", "qr_enviado", "completado"]),
    supabase
      .from("flights")
      .select("id, flight_folio, user_id, flight_type, flight_date, flight_time, return_flight_date, return_flight_time, fare_type, total_amount, payment_percentage, amount_to_pay, status")
      .gte("flight_date", today)
      .lte("flight_date", urgentLimit)
      .in("status", ["pendiente_revision", "esperando_pago", "pago_subido", "pago_confirmado", "pendiente_qr", "qr_enviado"])
      .order("flight_date", { ascending: true })
      .order("flight_time", { ascending: true })
      .limit(8),
    supabase
      .from("flights")
      .select("id", { count: "exact", head: true })
      .eq("status", "pendiente_revision"),
    supabase
      .from("flights")
      .select("id", { count: "exact", head: true })
      .eq("status", "pago_subido"),
    supabase
      .from("flights")
      .select("id", { count: "exact", head: true })
      .eq("status", "pendiente_qr"),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user?.id)
      .eq("read", false),
    supabase
      .from("flight_messages")
      .select("id, message, created_at, flight_id, sender_id")
      .order("created_at", { ascending: false })
      .limit(4),
  ]);

  type UrgentFlight = Pick<Flight, "id" | "user_id" | "flight_folio" | "flight_type" | "flight_date" | "flight_time" | "return_flight_date" | "return_flight_time" | "fare_type" | "total_amount" | "payment_percentage" | "amount_to_pay" | "status"> & { profiles: Pick<Profile, "id" | "full_name" | "email"> | null };
  type LatestMessage = Pick<FlightMessage, "id" | "message" | "created_at" | "flight_id" | "sender_id"> & { profiles: Pick<Profile, "id" | "full_name" | "email"> | null; flights: { id: string; flight_date: string } | null };
  const urgentUserIds = (rawUrgentFlights ?? []).map((flight) => (flight as UrgentFlight).user_id).filter(Boolean);
  const messageSenderIds = (rawLatestMessages ?? []).map((msg) => (msg as LatestMessage).sender_id).filter(Boolean);
  const latestFlightIds = (rawLatestMessages ?? []).map((msg) => (msg as LatestMessage).flight_id).filter(Boolean);


  const [{ data: relatedProfiles }, { data: latestMessageFlights }] = await Promise.all([
    [...urgentUserIds, ...messageSenderIds].length
      ? supabase.from("profiles").select("id, full_name, email").in("id", Array.from(new Set([...urgentUserIds, ...messageSenderIds])))
      : Promise.resolve({ data: [] }),
    latestFlightIds.length
      ? supabase.from("flights").select("id, flight_date").in("id", Array.from(new Set(latestFlightIds)))
      : Promise.resolve({ data: [] }),
  ]);

  const profileMap = new Map((relatedProfiles ?? []).map((p) => [p.id, p]));
  const latestFlightMap = new Map((latestMessageFlights ?? []).map((f) => [f.id, f]));

  const urgentFlights: UrgentFlight[] = (rawUrgentFlights ?? []).map((f) => {
    const flight = f as UrgentFlight;
    return {
      ...flight,
      profiles: profileMap.get(flight.user_id) ?? null,
    };
  });
  void maybeNotifyUpcomingFlights(supabase, urgentFlights, urgentDays);

  const latestMessages: LatestMessage[] = (rawLatestMessages ?? []).map((msg) => ({
    ...(msg as LatestMessage),
    profiles: profileMap.get(msg.sender_id) ?? null,
    flights: latestFlightMap.get(msg.flight_id) ?? null,
  }));

  const totalCollected = (paidFlights ?? []).reduce(
    (sum, flight) => sum + getAmountToPay(flight),
    0
  );

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/40 bg-white/90 p-6 shadow-xl shadow-slate-900/5 backdrop-blur">
        <p className="text-sm font-black uppercase tracking-[0.24em] text-sky-700">Panel administrativo</p>
        <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">General / Estadísticas</h2>
        <p className="mt-2 max-w-3xl text-slate-500">
          Resumen de usuarios, recaudación, vuelos próximos, notificaciones y acciones pendientes del día.
        </p>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Usuarios únicos" value={usersCount ?? 0} helper="Usuarios registrados" />
        <StatCard title="Total recaudado" value={formatCurrency(totalCollected)} helper="Pagos confirmados" />
        <StatCard title={`Urgentes 0 a ${urgentDays} días`} value={urgentFlights?.length ?? 0} helper={`${today} a ${urgentLimit}`} />
        <StatCard title="Por cotizar" value={pendingFlights ?? 0} helper="Pendientes de revisión" />
      </section>

      <section className="grid gap-5 lg:grid-cols-4">
        <PendingActionCard icon={<AlertTriangle size={20} />} title="Revisar vuelos" value={pendingFlights ?? 0} href="/admin/vuelos?status=pendiente_revision" />
        <PendingActionCard icon={<CreditCard size={20} />} title="Validar pagos" value={paymentUploaded ?? 0} href="/admin/vuelos?status=pago_subido" />
        <PendingActionCard icon={<QrCode size={20} />} title="Enviar QR" value={pendingQr ?? 0} href="/admin/vuelos?status=pendiente_qr" />
        <PendingActionCard icon={<MessageSquare size={20} />} title="Notificaciones" value={unreadNotifications ?? 0} href="/admin/notificaciones" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/60 backdrop-blur">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-xl font-black text-slate-950">Vuelos urgentes</h3>
              <p className="text-sm text-slate-500">
                Vuelos enviados por usuarios con fecha entre hoy y el rango configurado.
              </p>
            </div>
            <Link href="/admin/vuelos?urgentes=1" className={buttonPrimary}>Ver urgentes</Link>
          </div>

          {!urgentFlights?.length ? (
            <EmptyState title="No hay vuelos urgentes por ahora." description="Cuando los usuarios suban vuelos cercanos, aparecerán aquí." />
          ) : (
            <div className="overflow-x-auto rounded-3xl border border-slate-200">
              <table className="w-full min-w-[760px] border-collapse bg-white text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.16em] text-slate-500">
                  <tr>
                    <th className="px-5 py-4">Folio</th>
                    <th className="px-5 py-4">Usuario</th>
                    <th className="px-5 py-4">Viaje</th>
                    <th className="px-5 py-4">Ida / regreso</th>
                    <th className="px-5 py-4">Total / a pagar</th>
                    <th className="px-5 py-4">Estado</th>
                    <th className="px-5 py-4">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {urgentFlights.map((flight) => (
                    <tr key={flight.id} className="hover:bg-slate-50/70">
                      <td data-label="Folio" className="px-5 py-4 font-black text-slate-900">{formatFlightFolio(flight)}</td>
                      <td data-label="Usuario" className="px-5 py-4 font-bold text-slate-800">
                        {flight.profiles?.full_name || flight.profiles?.email || "Usuario"}
                      </td>
                      <td data-label="Viaje" className="px-5 py-4 font-bold text-slate-700">{flightTypeLabel(flight.flight_type)}</td>
                      <td data-label="Ida / regreso" className="px-5 py-4 text-slate-600">
                        <p>Ida: {formatDate(flight.flight_date)} · {formatTime(flight.flight_time)}</p>
                        {flight.flight_type === "redondo" ? (
                          <p className="mt-1 text-xs font-semibold text-slate-500">Regreso: {formatDate(flight.return_flight_date)} · {formatTime(flight.return_flight_time)}</p>
                        ) : null}
                      </td>
                      <td data-label="Total / a pagar" className="px-5 py-4">
                        <p className="font-bold text-slate-900">{formatCurrency(flight.total_amount)}</p>
                        <p className="text-xs font-black text-sky-700">A pagar: {formatCurrency(getAmountToPay(flight))}</p>
                      </td>
                      <td data-label="Estado" className="px-5 py-4"><StatusBadge status={flight.status} /></td>
                      <td data-label="Acción" className="px-5 py-4"><Link href={`/admin/vuelos/${flight.id}`} className={buttonSecondarySmall}>Abrir</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/60 backdrop-blur">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-xl font-black text-slate-950">Mensajes recientes</h3>
              <p className="text-sm text-slate-500">Última actividad de conversaciones.</p>
            </div>
            <Link href="/admin/mensajes" className={buttonSecondarySmall}>Ver</Link>
          </div>

          {!latestMessages?.length ? (
            <EmptyState title="Aún no hay mensajes." />
          ) : (
            <div className="space-y-3">
              {latestMessages.map((message) => (
                <article key={message.id} className="rounded-3xl border border-slate-200 bg-white p-4">
                  <p className="text-sm font-black text-slate-900">
                    {message.profiles?.full_name || message.profiles?.email || "Usuario"}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">{message.message}</p>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                      {formatDate(message.flights?.flight_date)}
                    </p>
                    <Link href={`/admin/vuelos/${message.flights?.id}`} className={buttonSecondarySmall}>Abrir</Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function PendingActionCard({ icon, title, value, href }: { icon: React.ReactNode; title: string; value: number; href: string }) {
  return (
    <Link href={href} className="group rounded-[2rem] border border-slate-200 bg-white/90 p-5 shadow-xl shadow-slate-200/60 transition hover:-translate-y-0.5 hover:border-sky-200 hover:bg-sky-50/70">
      <div className="flex items-center justify-between gap-3">
        <div className="rounded-2xl bg-sky-50 p-3 text-sky-800 transition group-hover:bg-white">
          {icon}
        </div>
        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-700">Abrir</span>
      </div>
      <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-slate-400">{title}</p>
      <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
    </Link>
  );
}

import Link from "next/link";
import type { ReactNode } from "react";
import { BarChart3, CalendarClock, CreditCard, PieChart, Plane, TrendingUp, Users } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { createClient } from "@/lib/supabase/server";
import { buttonPrimary, buttonSecondarySmall } from "@/lib/styles";
import { maybeNotifyUpcomingFlights } from "@/lib/flight-operations";
import { addDaysISO, flightTypeLabel, formatCurrency, formatFlightFolio, formatDate, formatTime, getAmountToPay, getTodayISO } from "@/lib/utils";

export const revalidate = 0;

type ChartItem = {
  label: string;
  value: number;
  helper?: string;
  tone: string;
};

type UrgentFlight = {
  id: string;
  user_id: string;
  flight_folio?: string | null;
  flight_type?: string | null;
  flight_date?: string | null;
  flight_time?: string | null;
  return_flight_date?: string | null;
  return_flight_time?: string | null;
  fare_type?: string | null;
  total_amount?: number | string | null;
  payment_percentage?: number | string | null;
  amount_to_pay?: number | string | null;
  status: string;
  profiles?: { id: string; full_name?: string | null; email?: string | null } | null;
};

type LatestMessage = {
  id: string;
  message: string;
  created_at: string;
  flight_id: string;
  sender_id: string;
  profiles?: { id: string; full_name?: string | null; email?: string | null } | null;
  flights?: { id: string; flight_date?: string | null } | null;
};

function percent(value: number, total: number) {
  if (!total) return 0;
  return Math.max(4, Math.round((value / total) * 100));
}

function MiniMetric({ icon, label, value, helper, tone }: { icon: ReactNode; label: string; value: string | number; helper: string; tone: string }) {
  return (
    <article className="group rounded-[2rem] border border-slate-200 bg-white/90 p-5 shadow-xl shadow-slate-200/60 transition hover:-translate-y-1 hover:shadow-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
          <p className="mt-3 text-3xl font-black text-slate-950">{value}</p>
          <p className="mt-2 text-sm font-semibold text-slate-500">{helper}</p>
        </div>
        <div className={`rounded-2xl p-3 text-white shadow-lg ${tone}`}>{icon}</div>
      </div>
    </article>
  );
}

function BarChartCard({ title, subtitle, items }: { title: string; subtitle: string; items: ChartItem[] }) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/60 backdrop-blur">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-700">Estadística</p>
          <h3 className="mt-1 text-xl font-black text-slate-950">{title}</h3>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>
        <div className="rounded-2xl bg-sky-50 p-3 text-sky-700"><BarChart3 size={20} /></div>
      </div>
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.label}>
            <div className="mb-2 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black text-slate-800">{item.label}</p>
                {item.helper ? <p className="text-xs font-semibold text-slate-400">{item.helper}</p> : null}
              </div>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-700">{item.value}</span>
            </div>
            <div className="h-4 overflow-hidden rounded-full bg-slate-100 shadow-inner">
              <div className={`h-full rounded-full bg-gradient-to-r ${item.tone} shadow-lg transition-all duration-700`} style={{ width: `${percent(item.value, total)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function DonutCard({ title, subtitle, items }: { title: string; subtitle: string; items: ChartItem[] }) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  const first = items[0]?.value ?? 0;
  const second = items[1]?.value ?? 0;
  const third = items[2]?.value ?? 0;
  const firstStop = total ? Math.round((first / total) * 100) : 34;
  const secondStop = total ? firstStop + Math.round((second / total) * 100) : 67;
  const thirdStop = total ? secondStop + Math.round((third / total) * 100) : 100;
  const donut = `conic-gradient(#06b6d4 0 ${firstStop}%, #8b5cf6 ${firstStop}% ${secondStop}%, #ec4899 ${secondStop}% ${thirdStop}%, #f59e0b ${thirdStop}% 100%)`;

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/60 backdrop-blur">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-700">Distribución</p>
          <h3 className="mt-1 text-xl font-black text-slate-950">{title}</h3>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>
        <div className="rounded-2xl bg-violet-50 p-3 text-violet-700"><PieChart size={20} /></div>
      </div>
      <div className="grid items-center gap-6 md:grid-cols-[180px_1fr]">
        <div className="relative mx-auto flex h-44 w-44 items-center justify-center rounded-full shadow-xl" style={{ background: donut }}>
          <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full border border-white/70 bg-white/90 text-center shadow-inner backdrop-blur">
            <span className="text-3xl font-black text-slate-950">{total}</span>
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Total</span>
          </div>
        </div>
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/70 px-4 py-3">
              <div className="flex items-center gap-3">
                <span className={`h-3 w-3 rounded-full bg-gradient-to-br ${item.tone}`} />
                <div>
                  <p className="text-sm font-black text-slate-800">{item.label}</p>
                  {item.helper ? <p className="text-xs text-slate-400">{item.helper}</p> : null}
                </div>
              </div>
              <p className="text-lg font-black text-slate-950">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function RevenueCard({ totalCollected, pendingAmount }: { totalCollected: number; pendingAmount: number }) {
  const max = Math.max(totalCollected, pendingAmount, 1);
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/60 backdrop-blur">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-700">Finanzas</p>
          <h3 className="mt-1 text-xl font-black text-slate-950">Recaudación</h3>
          <p className="mt-1 text-sm text-slate-500">Comparativo entre pagos confirmados y montos pendientes.</p>
        </div>
        <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700"><TrendingUp size={20} /></div>
      </div>
      <div className="space-y-5">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="font-black text-slate-800">Confirmado</span>
            <span className="text-lg font-black text-emerald-600">{formatCurrency(totalCollected)}</span>
          </div>
          <div className="h-5 overflow-hidden rounded-full bg-slate-100 shadow-inner">
            <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-500 shadow-lg" style={{ width: `${percent(totalCollected, max)}%` }} />
          </div>
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="font-black text-slate-800">Pendiente por cobrar</span>
            <span className="text-lg font-black text-fuchsia-600">{formatCurrency(pendingAmount)}</span>
          </div>
          <div className="h-5 overflow-hidden rounded-full bg-slate-100 shadow-inner">
            <div className="h-full rounded-full bg-gradient-to-r from-orange-400 via-fuchsia-500 to-violet-500 shadow-lg" style={{ width: `${percent(pendingAmount, max)}%` }} />
          </div>
        </div>
      </div>
    </section>
  );
}

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const today = getTodayISO();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: settingsRow } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "operations")
    .maybeSingle();

  const settings = settingsRow?.value as Record<string, unknown> | null;
  const configuredDays = Number(settings?.urgent_window_days ?? 3);
  const urgentDays = Number.isFinite(configuredDays) && configuredDays > 0 ? configuredDays : 3;
  const urgentLimit = addDaysISO(urgentDays);

  const [
    { count: usersCount },
    { data: paidFlights },
    { data: allFlights },
    { data: rawUrgentFlights, error: urgentError },
    { count: pendingFlights },
    { count: paymentUploaded },
    { count: pendingQr },
    { count: unreadNotifications },
    { data: rawLatestMessages },
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "user"),
    supabase.from("flights").select("total_amount, amount_to_pay").in("status", ["pago_confirmado", "pendiente_qr", "qr_enviado", "completado"]),
    supabase.from("flights").select("id, status, flight_type, total_amount, amount_to_pay"),
    supabase
      .from("flights")
      .select("id, flight_folio, user_id, flight_type, flight_date, flight_time, return_flight_date, return_flight_time, fare_type, total_amount, payment_percentage, amount_to_pay, status")
      .gte("flight_date", today)
      .lte("flight_date", urgentLimit)
      .neq("status", "cancelado")
      .order("flight_date", { ascending: true })
      .order("flight_time", { ascending: true })
      .limit(12),
    supabase.from("flights").select("id", { count: "exact", head: true }).eq("status", "pendiente_revision"),
    supabase.from("flights").select("id", { count: "exact", head: true }).eq("status", "pago_subido"),
    supabase.from("flights").select("id", { count: "exact", head: true }).eq("status", "pendiente_qr"),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user?.id).eq("read", false),
    supabase.from("flight_messages").select("id, message, created_at, flight_id, sender_id").order("created_at", { ascending: false }).limit(4),
  ]);

  const urgentUserIds = (rawUrgentFlights ?? []).map((flight: any) => flight.user_id).filter(Boolean);
  const messageSenderIds = (rawLatestMessages ?? []).map((msg: any) => msg.sender_id).filter(Boolean);
  const latestFlightIds = (rawLatestMessages ?? []).map((msg: any) => msg.flight_id).filter(Boolean);

  const [{ data: relatedProfiles }, { data: latestMessageFlights }] = await Promise.all([
    [...urgentUserIds, ...messageSenderIds].length
      ? supabase.from("profiles").select("id, full_name, email").in("id", Array.from(new Set([...urgentUserIds, ...messageSenderIds])))
      : Promise.resolve({ data: [] }),
    latestFlightIds.length
      ? supabase.from("flights").select("id, flight_date").in("id", Array.from(new Set(latestFlightIds)))
      : Promise.resolve({ data: [] }),
  ]);

  const profileMap = new Map((relatedProfiles ?? []).map((p: any) => [p.id, p]));
  const latestFlightMap = new Map((latestMessageFlights ?? []).map((f: any) => [f.id, f]));

  const urgentFlights: UrgentFlight[] = (rawUrgentFlights ?? []).map((flight: any) => ({
    ...flight,
    profiles: profileMap.get(flight.user_id) ?? null,
  }));

  void maybeNotifyUpcomingFlights(supabase, urgentFlights as any, urgentDays);

  const latestMessages: LatestMessage[] = (rawLatestMessages ?? []).map((msg: any) => ({
    ...msg,
    profiles: profileMap.get(msg.sender_id) ?? null,
    flights: latestFlightMap.get(msg.flight_id) ?? null,
  }));

  const totalCollected = (paidFlights ?? []).reduce((sum: number, flight: any) => sum + getAmountToPay(flight), 0);
  const pendingAmount = (allFlights ?? [])
    .filter((flight: any) => !["pago_confirmado", "pendiente_qr", "qr_enviado", "completado", "cancelado"].includes(flight.status))
    .reduce((sum: number, flight: any) => sum + getAmountToPay(flight), 0);

  const totalFlights = allFlights?.length ?? 0;
  const completed = (allFlights ?? []).filter((flight: any) => ["completado", "qr_enviado"].includes(flight.status)).length;
  const waitingPayment = (allFlights ?? []).filter((flight: any) => ["esperando_pago", "pago_subido"].includes(flight.status)).length;
  const simpleFlights = (allFlights ?? []).filter((flight: any) => flight.flight_type === "sencillo").length;
  const roundFlights = (allFlights ?? []).filter((flight: any) => flight.flight_type === "redondo").length;

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/40 bg-white/90 p-6 shadow-xl shadow-slate-900/5 backdrop-blur">
        <p className="text-sm font-black uppercase tracking-[0.24em] text-sky-700">Panel administrativo</p>
        <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">General / Estadísticas</h2>
        <p className="mt-2 max-w-3xl text-slate-500">Vista profesional de actividad, vuelos, pagos y conversaciones de la plataforma.</p>
        {urgentError ? <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">No se pudieron cargar vuelos urgentes: {urgentError.message}</p> : null}
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <MiniMetric icon={<Users size={22} />} label="Usuarios" value={usersCount ?? 0} helper="Cuentas de clientes" tone="bg-gradient-to-br from-cyan-400 to-blue-600" />
        <MiniMetric icon={<Plane size={22} />} label="Vuelos" value={totalFlights} helper="Registros totales" tone="bg-gradient-to-br from-violet-500 to-fuchsia-600" />
        <MiniMetric icon={<CreditCard size={22} />} label="Recaudado" value={formatCurrency(totalCollected)} helper="Pagos confirmados" tone="bg-gradient-to-br from-emerald-400 to-teal-600" />
        <MiniMetric icon={<CalendarClock size={22} />} label="Urgentes" value={urgentFlights.length} helper={`Próximos ${urgentDays} días`} tone="bg-gradient-to-br from-orange-400 to-rose-600" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <BarChartCard
          title="Flujo operativo"
          subtitle="Tareas activas que requieren seguimiento administrativo."
          items={[
            { label: "Revisar vuelos", value: pendingFlights ?? 0, helper: "Pendientes de revisión", tone: "from-orange-400 to-rose-500" },
            { label: "Validar pagos", value: paymentUploaded ?? 0, helper: "Comprobantes subidos", tone: "from-emerald-400 to-teal-500" },
            { label: "Enviar QR", value: pendingQr ?? 0, helper: "QR pendientes", tone: "from-violet-500 to-fuchsia-500" },
            { label: "Notificaciones", value: unreadNotifications ?? 0, helper: "Sin leer", tone: "from-cyan-400 to-blue-500" },
          ]}
        />
        <DonutCard
          title="Estado de vuelos"
          subtitle="Distribución general de vuelos registrados."
          items={[
            { label: "Completados / QR", value: completed, helper: "Listos o cerrados", tone: "from-cyan-400 to-blue-500" },
            { label: "En pago", value: waitingPayment, helper: "Cuenta o comprobante", tone: "from-violet-500 to-fuchsia-500" },
            { label: "Por revisar", value: pendingFlights ?? 0, helper: "Cotización inicial", tone: "from-orange-400 to-rose-500" },
            { label: "Otros", value: Math.max(totalFlights - completed - waitingPayment - (pendingFlights ?? 0), 0), helper: "Resto del flujo", tone: "from-amber-400 to-orange-500" },
          ]}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <RevenueCard totalCollected={totalCollected} pendingAmount={pendingAmount} />
        <BarChartCard
          title="Tipo de viaje"
          subtitle="Preferencia de viajes sencillos contra redondos."
          items={[
            { label: "Vuelos sencillos", value: simpleFlights, helper: "Solo ida", tone: "from-cyan-400 to-blue-500" },
            { label: "Vuelos redondos", value: roundFlights, helper: "Ida y vuelta", tone: "from-fuchsia-500 to-violet-600" },
          ]}
        />
      </section>

      <section className="grid gap-6 items-start xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/60 backdrop-blur">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-xl font-black text-slate-950">Vuelos urgentes</h3>
              <p className="text-sm text-slate-500">Vuelos no cancelados con fecha entre hoy y el rango configurado.</p>
            </div>
            <Link href="/admin/vuelos?urgentes=1" className={buttonPrimary}>Ver urgentes</Link>
          </div>

          {!urgentFlights.length ? (
            <EmptyState title="No hay vuelos urgentes por ahora." description="Cuando los usuarios suban vuelos cercanos, aparecerán aquí." />
          ) : (
            <div className="w-full overflow-x-auto rounded-3xl border border-slate-200">
              <table className="w-full min-w-[920px] border-collapse bg-white text-sm">
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
                      <td data-label="Usuario" className="px-5 py-4 font-bold text-slate-800">{flight.profiles?.full_name || flight.profiles?.email || "Usuario"}</td>
                      <td data-label="Viaje" className="px-5 py-4 font-bold text-slate-700">{flightTypeLabel(flight.flight_type)}</td>
                      <td data-label="Ida / regreso" className="px-5 py-4 text-slate-600">
                        <p>Ida: {formatDate(flight.flight_date)} · {formatTime(flight.flight_time)}</p>
                        {flight.flight_type === "redondo" ? <p className="mt-1 text-xs font-semibold text-slate-500">Regreso: {formatDate(flight.return_flight_date)} · {formatTime(flight.return_flight_time)}</p> : null}
                      </td>
                      <td data-label="Total / a pagar" className="px-5 py-4">
                        <p className="font-bold text-slate-900">{formatCurrency(flight.total_amount)}</p>
                        <p className="text-xs font-black text-sky-700">A pagar: {formatCurrency(getAmountToPay(flight))}</p>
                      </td>
                      <td data-label="Estado" className="px-5 py-4"><StatusBadge status={flight.status as any} /></td>
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

          {!latestMessages.length ? (
            <EmptyState title="Aún no hay mensajes." />
          ) : (
            <div className="space-y-3 min-w-0 w-full">
              {latestMessages.map((message) => (
                <article key={message.id} className="min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white p-4">
                  <p className="text-sm font-black text-slate-900">{message.profiles?.full_name || message.profiles?.email || "Usuario"}</p>
                  <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">{message.message}</p>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{formatDate(message.flights?.flight_date)}</p>
                    <Link href={message.flights?.id ? `/admin/vuelos/${message.flights.id}` : "/admin/mensajes"} className={buttonSecondarySmall}>Abrir</Link>
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

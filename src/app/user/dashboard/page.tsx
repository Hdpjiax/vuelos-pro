import Link from "next/link";
import { Bell, CreditCard, Plane, QrCode } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { createClient } from "@/lib/supabase/server";
import { buttonPrimary, buttonSecondarySmall } from "@/lib/styles";
import { flightTypeLabel, formatCurrency, formatFlightFolio, formatDate, formatTime, getAmountToPay } from "@/lib/utils";
export const revalidate = 30;

export default async function UserDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: flights }, { data: notifications }] = await Promise.all([
    supabase
      .from("flights")
      .select("id, flight_folio, flight_type, flight_date, flight_time, return_flight_date, return_flight_time, fare_type, total_amount, payment_percentage, amount_to_pay, status")
      .eq("user_id", user?.id)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("notifications")
      .select("id, title, body, read, created_at, flight_id")
      .eq("user_id", user?.id)
      .order("created_at", { ascending: false })
      .limit(4),
  ]);

  const safeFlights = flights ?? [];
  const totalFlights = safeFlights.length;
  const waitingPayment = safeFlights.filter((f) => f.status === "esperando_pago").length;
  const qrSent = safeFlights.filter((f) => f.status === "qr_enviado" || f.status === "completado").length;
  const totalAmount = safeFlights.reduce((sum, f) => sum + getAmountToPay(f), 0);
  const nextActions = safeFlights.filter((f) => ["esperando_pago", "pago_subido", "pendiente_qr", "qr_enviado"].includes(f.status)).slice(0, 3);
  const unreadNotifications = notifications?.filter((item) => !item.read).length ?? 0;

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/60 backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.24em] text-sky-700">Panel de usuario</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Mi resumen</h2>
            <p className="mt-2 max-w-3xl text-slate-500">
              Sube vuelos, revisa estados, recibe cuenta bancaria, envía comprobantes y consulta tus QR.
            </p>
          </div>
          <Link href="/user/vuelos/nuevo" className={buttonPrimary}>
            <Plane size={18} />
            Subir nuevo vuelo
          </Link>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Mis vuelos" value={totalFlights} helper="Últimos registros" />
        <StatCard title="Esperando pago" value={waitingPayment} helper="Cuenta enviada por admin" />
        <StatCard title="QR recibidos" value={qrSent} helper="Vuelos listos" />
        <StatCard title="Total acumulado" value={formatCurrency(totalAmount)} helper="Últimos movimientos" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/60 backdrop-blur">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-xl font-black text-slate-950">Últimos vuelos</h3>
              <p className="text-sm text-slate-500">Seguimiento rápido de tus solicitudes recientes.</p>
            </div>
            <Link href="/user/vuelos" className={buttonSecondarySmall}>Ver todos</Link>
          </div>

          {!safeFlights.length ? (
            <EmptyState title="Aún no has subido vuelos." description="Ya puedes registrar vuelos con fecha, pasajeros, extras, total e imagen." />
          ) : (
            <div className="overflow-x-auto rounded-3xl border border-slate-200">
              <table className="w-full min-w-[680px] border-collapse bg-white text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.16em] text-slate-500">
                  <tr>
                    <th className="px-5 py-4">Folio</th>
                    <th className="px-5 py-4">Viaje</th>
                    <th className="px-5 py-4">Ida / regreso</th>
                    <th className="px-5 py-4">Tarifa</th>
                    <th className="px-5 py-4">Total / a pagar</th>
                    <th className="px-5 py-4">Estado</th>
                    <th className="px-5 py-4">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {safeFlights.map((flight) => (
                    <tr key={flight.id} className="hover:bg-slate-50/70">
                      <td data-label="Folio" className="px-5 py-4 font-black text-slate-900">{formatFlightFolio(flight)}</td>
                      <td data-label="Viaje" className="px-5 py-4 font-bold text-slate-700">{flightTypeLabel(flight.flight_type)}</td>
                      <td data-label="Ida / regreso" className="px-5 py-4 text-slate-600">
                        <p>Ida: {formatDate(flight.flight_date)} · {formatTime(flight.flight_time)}</p>
                        {flight.flight_type === "redondo" ? (
                          <p className="mt-1 text-xs font-semibold text-slate-500">Regreso: {formatDate(flight.return_flight_date)} · {formatTime(flight.return_flight_time)}</p>
                        ) : null}
                      </td>
                      <td data-label="Tarifa" className="px-5 py-4 text-slate-600">{flight.fare_type}</td>
                      <td data-label="Total / a pagar" className="px-5 py-4">
                        <p className="font-bold text-slate-900">{formatCurrency(flight.total_amount)}</p>
                        <p className="text-xs font-black text-sky-700">A pagar: {formatCurrency(getAmountToPay(flight))}</p>
                      </td>
                      <td data-label="Estado" className="px-5 py-4"><StatusBadge status={flight.status} /></td>
                      <td data-label="Acción" className="px-5 py-4"><Link href={`/user/vuelos/${flight.id}`} className={buttonSecondarySmall}>Ver</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/60 backdrop-blur">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-black text-slate-950">Acciones pendientes</h3>
                <p className="text-sm text-slate-500">Vuelos que necesitan seguimiento.</p>
              </div>
              <CreditCard className="text-sky-800" size={22} />
            </div>

            {!nextActions.length ? (
              <EmptyState title="No hay acciones pendientes." />
            ) : (
              <div className="space-y-3">
                {nextActions.map((flight) => (
                  <Link key={flight.id} href={`/user/vuelos/${flight.id}`} className="block rounded-3xl border border-slate-200 bg-white p-4 transition hover:border-sky-200 hover:bg-sky-50/70">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-black text-slate-900">{formatFlightFolio(flight)}</p>
                        <p className="text-sm font-semibold text-slate-600">{formatDate(flight.flight_date)} · {formatTime(flight.flight_time)}</p>
                        <p className="mt-1 text-sm text-slate-500">{formatCurrency(getAmountToPay(flight))}</p>
                      </div>
                      <StatusBadge status={flight.status} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/60 backdrop-blur">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-black text-slate-950">Notificaciones</h3>
                <p className="text-sm text-slate-500">{unreadNotifications} sin leer</p>
              </div>
              <Bell className="text-sky-800" size={22} />
            </div>

            {!notifications?.length ? (
              <EmptyState title="No hay notificaciones." />
            ) : (
              <div className="space-y-3">
                {notifications.map((item: any) => (
                  <article key={item.id} className={item.read ? "rounded-3xl border border-slate-200 bg-white p-4" : "rounded-3xl border border-sky-200 bg-sky-50 p-4"}>
                    <p className="font-black text-slate-900">{item.title}</p>
                    <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">{item.body}</p>
                  </article>
                ))}
              </div>
            )}

            <Link href="/user/notificaciones" className={`${buttonSecondarySmall} mt-4 w-full`}>Abrir centro</Link>
          </div>
        </div>
      </section>
    </div>
  );
}

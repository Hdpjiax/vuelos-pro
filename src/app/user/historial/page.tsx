import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { createClient } from "@/lib/supabase/server";
import { buttonSecondarySmall } from "@/lib/styles";
import { flightTypeLabel, formatCurrency, formatFlightFolio, formatDate, formatTime, getAmountToPay } from "@/lib/utils";

export const revalidate = 0;

export default async function UserHistoryPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: flights, error } = user?.id
    ? await supabase
        .from("flights")
        .select("id, flight_folio, flight_type, flight_date, flight_time, return_flight_date, return_flight_time, fare_type, total_amount, payment_percentage, amount_to_pay, status, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
    : { data: [], error: null };

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/60 backdrop-blur">
        <h2 className="text-3xl font-black tracking-tight text-slate-950">Historial</h2>
        <p className="mt-2 text-slate-500">Todos tus vuelos registrados, estados, QR enviados y solicitudes cerradas.</p>
        {error ? (
          <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
            No se pudo cargar el historial: {error.message}
          </p>
        ) : null}
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/60 backdrop-blur">
        {!flights?.length ? (
          <EmptyState title="No hay historial disponible." description="Cuando subas vuelos, aparecerán aquí con su estado actual." />
        ) : (
          <div className="space-y-3">
            {flights.map((flight) => (
              <article key={flight.id} className="rounded-3xl border border-slate-200 bg-white p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-black uppercase tracking-[0.14em] text-sky-700">{formatFlightFolio(flight)}</p>
                    <p className="mt-1 font-black text-slate-900">{flightTypeLabel(flight.flight_type)} · Ida: {formatDate(flight.flight_date)} · {formatTime(flight.flight_time)}</p>
                    {flight.flight_type === "redondo" ? (
                      <p className="mt-1 text-xs font-semibold text-slate-500">Regreso: {formatDate(flight.return_flight_date)} · {formatTime(flight.return_flight_time)}</p>
                    ) : null}
                    <p className="mt-1 text-sm text-slate-500">{flight.fare_type} · a pagar {formatCurrency(getAmountToPay(flight))}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={flight.status} />
                    <Link href={`/user/vuelos/${flight.id}`} className={buttonSecondarySmall}>Ver detalle</Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

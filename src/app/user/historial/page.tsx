import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { createClient } from "@/lib/supabase/server";
import { flightTypeLabel, formatCurrency, formatFlightFolio, formatDate, formatTime, getAmountToPay } from "@/lib/utils";

export default async function UserHistoryPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: flights } = await supabase
    .from("flights")
    .select("id, flight_folio, flight_type, flight_date, flight_time, return_flight_date, return_flight_time, fare_type, total_amount, payment_percentage, amount_to_pay, status")
    .eq("user_id", user?.id)
    .in("status", ["qr_enviado", "completado", "cancelado"])
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/60 backdrop-blur">
        <h2 className="text-3xl font-black tracking-tight text-slate-950">Historial</h2>
        <p className="mt-2 text-slate-500">Vuelos completados, QR enviados y solicitudes cerradas.</p>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/60 backdrop-blur">
        {!flights?.length ? (
          <EmptyState title="No hay historial disponible." />
        ) : (
          <div className="space-y-3">
            {flights.map((flight) => (
              <article key={flight.id} className="rounded-3xl border border-slate-200 bg-white p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-black text-slate-900">{flightTypeLabel(flight.flight_type)} · Ida: {formatDate(flight.flight_date)} · {formatTime(flight.flight_time)}</p>
                    {flight.flight_type === "redondo" ? (
                      <p className="mt-1 text-xs font-semibold text-slate-500">Regreso: {formatDate(flight.return_flight_date)} · {formatTime(flight.return_flight_time)}</p>
                    ) : null}
                    <p className="mt-1 text-sm text-slate-500">{flight.fare_type} · a pagar {formatCurrency(getAmountToPay(flight))}</p>
                  </div>
                  <StatusBadge status={flight.status} />
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

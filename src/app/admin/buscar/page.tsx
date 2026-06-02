import Link from "next/link";
import { Search, UserRound } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { createClient } from "@/lib/supabase/server";
import { buttonPrimarySmall, inputClass, labelClass, panelClass } from "@/lib/styles";
import { flightTypeLabel, formatCurrency, formatDate, formatFlightFolio, formatTime, getAmountToPay, passengerSearchText, statusLabel } from "@/lib/utils";

type PageProps = {
  searchParams: Promise<{ q?: string }>;
};

function passengerCount(value: unknown) {
  return Array.isArray(value) ? value.length : 0;
}

function matchedPassengers(passengers: unknown, q: string) {
  if (!Array.isArray(passengers) || !q) return [];
  return passengers.filter((passenger: any) =>
    [passenger.full_name, passenger.document, passenger.phone, passenger.birth_date, passenger.nationality]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(q)
  );
}

export default async function AdminGlobalSearchPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const q = (query.q || "").trim().toLowerCase();
  const supabase = await createClient();

  const { data: rawFlights, error } = q
    ? await supabase
        .from("flights")
        .select("id, flight_folio, user_id, flight_type, flight_date, flight_time, return_flight_date, return_flight_time, passengers, fare_type, total_amount, amount_to_pay, status, created_at")
        .order("created_at", { ascending: false })
        .limit(160)
    : { data: [], error: null };

  const userIds = Array.from(new Set((rawFlights ?? []).map((flight: any) => flight.user_id).filter(Boolean)));
  const { data: profiles } = userIds.length
    ? await supabase.from("profiles").select("id, full_name, email").in("id", userIds)
    : { data: [] };
  const profileMap = new Map((profiles ?? []).map((profile: any) => [profile.id, profile]));

  const flights = (rawFlights ?? [])
    .map((flight: any) => ({ ...flight, profiles: profileMap.get(flight.user_id) ?? null }))
    .filter((flight: any) => {
      if (!q) return false;
      const haystack = [
        formatFlightFolio(flight),
        flight.id,
        flight.fare_type,
        flight.flight_date,
        statusLabel(flight.status),
        flightTypeLabel(flight.flight_type),
        flight.profiles?.full_name,
        flight.profiles?.email,
        passengerSearchText(flight.passengers),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    })
    .slice(0, 80);

  return (
    <div className="space-y-6">
      <section className={panelClass}>
        <p className="text-sm font-black uppercase tracking-[0.24em] text-sky-700">Panel administrativo</p>
        <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Buscador global</h2>
        <p className="mt-2 max-w-3xl text-slate-500">
          Busca vuelos por folio, pasajero, nacionalidad, documento, usuario, correo, estado o tarifa.
        </p>
      </section>

      <section className={panelClass}>
        <form className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <label className="space-y-2">
            <span className={labelClass}>Buscar en vuelos, pasajeros y usuarios</span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input className={`${inputClass} pl-11`} name="q" defaultValue={query.q || ""} placeholder="Ejemplo: VP-2026, Maria, mexicana, correo, pasaporte..." autoFocus />
            </div>
          </label>
          <button className={buttonPrimarySmall}>Buscar</button>
        </form>
      </section>

      {error ? (
        <section className="rounded-[2rem] border border-amber-200 bg-amber-50 p-5 text-amber-900 shadow-xl shadow-amber-100/60">
          <p className="font-black">No se pudo buscar.</p>
          <p className="mt-1 text-sm font-semibold">{error.message}</p>
        </section>
      ) : null}

      <section className={panelClass}>
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-black text-slate-950">Resultados</h3>
            <p className="text-sm text-slate-500">{q ? `${flights.length} resultado(s) para "${query.q}".` : "Escribe una búsqueda para empezar."}</p>
          </div>
        </div>

        {!q ? (
          <EmptyState title="Busca un folio, pasajero o usuario." description="Este buscador te ayuda a localizar cualquier vuelo sin navegar por filtros." />
        ) : !flights.length ? (
          <EmptyState title="Sin resultados." description="Prueba con otro dato del pasajero, folio, correo o usuario." />
        ) : (
          <div className="grid gap-4">
            {flights.map((flight: any) => {
              const matches = matchedPassengers(flight.passengers, q);
              return (
                <article key={flight.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-900 ring-1 ring-slate-200">{formatFlightFolio(flight)}</span>
                        <StatusBadge status={flight.status} />
                        <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-700 ring-1 ring-sky-100">{flightTypeLabel(flight.flight_type)}</span>
                      </div>
                      <p className="font-black text-slate-950">{flight.profiles?.full_name || "Usuario"}</p>
                      <p className="text-xs font-semibold text-slate-500">{flight.profiles?.email || "Sin correo"}</p>
                      <p className="mt-2 text-sm font-semibold text-slate-600">
                        Ida: {formatDate(flight.flight_date)} · {formatTime(flight.flight_time)} · {passengerCount(flight.passengers)} pasajero(s)
                      </p>
                      {matches.length ? (
                        <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                          <p className="font-black">Pasajeros encontrados</p>
                          <p className="mt-1 font-semibold">{matches.map((passenger: any) => `${passenger.full_name || "Pasajero"} · ${passenger.nationality || "Sin nacionalidad"}`).join(" | ")}</p>
                        </div>
                      ) : null}
                    </div>
                    <div className="grid gap-3 text-sm md:grid-cols-3 xl:min-w-[420px]">
                      <Mini label="Tarifa" value={flight.fare_type} />
                      <Mini label="A pagar" value={formatCurrency(getAmountToPay(flight))} />
                      <Link href={`/admin/vuelos/${flight.id}`} className={`${buttonPrimarySmall} self-end`}>Abrir vuelo</Link>
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

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-1 font-black text-slate-900">{value}</p>
    </div>
  );
}

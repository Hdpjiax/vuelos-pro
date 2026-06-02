import Link from "next/link";
import { Search, SlidersHorizontal } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { createClient } from "@/lib/supabase/server";
import { buttonPrimary, buttonPrimarySmall, buttonSecondarySmall, inputClass, labelClass, panelClass } from "@/lib/styles";
import { flightTypeLabel, formatCurrency, formatFlightFolio, formatDate, formatTime, getAmountToPay, statusLabel } from "@/lib/utils";
import { getUserFlightsFiltered, type FlightListItem } from "@/lib/repositories";

const statusOptions = [
  { label: "Todos", value: "todos" },
  { label: "Pendiente de revisión", value: "pendiente_revision" },
  { label: "Esperando pago", value: "esperando_pago" },
  { label: "Pago subido", value: "pago_subido" },
  { label: "Pendiente QR", value: "pendiente_qr" },
  { label: "QR enviado", value: "qr_enviado" },
  { label: "Completado", value: "completado" },
  { label: "Cancelado", value: "cancelado" },
];

function passengerCount(passengers: unknown) {
  return Array.isArray(passengers) ? passengers.length : 0;
}

type PageProps = {
  searchParams: Promise<{ status?: string; from?: string; to?: string; q?: string }>;
};

export default async function UserFlightsPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const activeStatus = query.status ?? "todos";
  const search = (query.q ?? "").trim().toLowerCase();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ✅ Query centralizada en el repositorio
  const allFlights: FlightListItem[] = await getUserFlightsFiltered(supabase, user?.id ?? "", {
    status: activeStatus,
    from: query.from,
    to: query.to,
  });

  const flights = allFlights.filter((flight) => {
    if (!search) return true;
    const haystack = [formatFlightFolio(flight), flight.id, flight.fare_type, flight.flight_date, statusLabel(flight.status)]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(search);
  });

  return (
    <div className="space-y-6">
      <section className={panelClass}>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.24em] text-sky-700">Panel de usuario</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Mis vuelos</h2>
            <p className="mt-2 text-slate-500">Consulta, filtra, edita o cancela vuelos disponibles antes del pago.</p>
          </div>
          <Link href="/user/vuelos/nuevo" className={buttonPrimary}>Subir vuelo</Link>
        </div>
      </section>

      <section className={panelClass}>
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-2xl bg-sky-100 p-2 text-sky-800"><SlidersHorizontal size={20} /></div>
          <div>
            <h3 className="font-black text-slate-950">Filtros de mis vuelos</h3>
            <p className="text-sm text-slate-500">Encuentra rápido vuelos por estado, fecha, tarifa o ID.</p>
          </div>
        </div>

        <form className="grid gap-4 xl:grid-cols-[1fr_1fr_1fr_1.3fr_auto] xl:items-end">
          <label className="space-y-2">
            <span className={labelClass}>Estado</span>
            <select className={inputClass} name="status" defaultValue={activeStatus}>
              {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="space-y-2">
            <span className={labelClass}>Desde</span>
            <input className={inputClass} type="date" name="from" defaultValue={query.from ?? ""} />
          </label>
          <label className="space-y-2">
            <span className={labelClass}>Hasta</span>
            <input className={inputClass} type="date" name="to" defaultValue={query.to ?? ""} />
          </label>
          <label className="space-y-2">
            <span className={labelClass}>Buscar</span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input className={`${inputClass} pl-11`} name="q" defaultValue={query.q ?? ""} placeholder="ID, tarifa, estado..." />
            </div>
          </label>
          <button className={buttonPrimarySmall}>Aplicar filtros</button>
        </form>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/user/vuelos" className={buttonSecondarySmall}>Limpiar</Link>
          <Link href="/user/vuelos?status=esperando_pago" className={activeStatus === "esperando_pago" ? buttonPrimarySmall : buttonSecondarySmall}>Esperando pago</Link>
          <Link href="/user/vuelos?status=qr_enviado" className={activeStatus === "qr_enviado" ? buttonPrimarySmall : buttonSecondarySmall}>Con QR recibido</Link>
          <Link href="/user/vuelos?status=cancelado" className={activeStatus === "cancelado" ? buttonPrimarySmall : buttonSecondarySmall}>Cancelados</Link>
        </div>
      </section>

      <section className={panelClass}>
        <div className="mb-5">
          <h3 className="text-xl font-black text-slate-950">Resultados</h3>
          <p className="text-sm text-slate-500">{flights.length} vuelo(s) encontrados.</p>
        </div>

        {!flights.length ? (
          <EmptyState title="No hay vuelos con estos filtros." description="Sube tu primer vuelo o limpia los filtros para ver todos." />
        ) : (
          <div className="overflow-x-auto rounded-3xl border border-slate-200">
            <table className="w-full min-w-[900px] border-collapse bg-white text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.16em] text-slate-500">
                <tr>
                  <th className="px-5 py-4">Folio</th>
                  <th className="px-5 py-4">Viaje</th>
                  <th className="px-5 py-4">Ida / regreso</th>
                  <th className="px-5 py-4">Pasajeros</th>
                  <th className="px-5 py-4">Tarifa</th>
                  <th className="px-5 py-4">Total / a pagar</th>
                  <th className="px-5 py-4">Estado</th>
                  <th className="px-5 py-4">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {flights.map((flight) => (
                  <tr key={flight.id} className="hover:bg-slate-50/70">
                    <td data-label="Folio" className="px-5 py-4 font-black text-slate-900">{formatFlightFolio(flight)}</td>
                    <td data-label="Viaje" className="px-5 py-4 font-bold text-slate-700">{flightTypeLabel(flight.flight_type)}</td>
                    <td data-label="Ida / regreso" className="px-5 py-4 text-slate-600">
                      <p>Ida: {formatDate(flight.flight_date)} · {formatTime(flight.flight_time)}</p>
                      {flight.flight_type === "redondo" ? (
                        <p className="mt-1 text-xs font-semibold text-slate-500">Regreso: {formatDate(flight.return_flight_date)} · {formatTime(flight.return_flight_time)}</p>
                      ) : null}
                    </td>
                    <td data-label="Pasajeros" className="px-5 py-4 text-slate-600">{passengerCount(flight.passengers)}</td>
                    <td data-label="Tarifa" className="px-5 py-4 text-slate-600">{flight.fare_type}</td>
                    <td data-label="Total / a pagar" className="px-5 py-4">
                      <p className="font-bold text-slate-900">{formatCurrency(flight.total_amount)}</p>
                      <p className="text-xs font-black text-sky-700">A pagar: {formatCurrency(getAmountToPay(flight))}</p>
                    </td>
                    <td data-label="Estado" className="px-5 py-4"><StatusBadge status={flight.status} /></td>
                    <td data-label="Acción" className="px-5 py-4">
                      <Link href={`/user/vuelos/${flight.id}`} className={buttonSecondarySmall}>Ver detalle</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

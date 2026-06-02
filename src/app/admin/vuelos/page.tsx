import Link from "next/link";
import { Search, SlidersHorizontal, AlertTriangle } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { createClient } from "@/lib/supabase/server";
import { buttonPrimarySmall, buttonSecondarySmall, inputClass, labelClass, panelClass } from "@/lib/styles";
import { addDaysISO, flightTypeLabel, formatCurrency, formatDate, formatTime, formatFlightFolio, getAmountToPay, getTodayISO, statusLabel } from "@/lib/utils";

const statusOptions = [
  { label: "Todos", value: "todos" },
  { label: "Por cotizar", value: "pendiente_revision" },
  { label: "Esperando pago", value: "esperando_pago" },
  { label: "Pago subido", value: "pago_subido" },
  { label: "Pendiente QR", value: "pendiente_qr" },
  { label: "QR enviado", value: "qr_enviado" },
  { label: "Completados", value: "completado" },
  { label: "Cancelados", value: "cancelado" },
];

const allowedStatuses = new Set(statusOptions.map((option) => option.value));

function passengerCount(passengers: unknown) {
  return Array.isArray(passengers) ? passengers.length : 0;
}

type PageProps = {
  searchParams: Promise<{ status?: string; from?: string; to?: string; q?: string; urgentes?: string }>;
};

export default async function AdminFlightsPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const requestedStatus = query.status ?? "todos";
  const activeStatus = allowedStatuses.has(requestedStatus) ? requestedStatus : "todos";
  const search = (query.q ?? "").trim().toLowerCase();
  const urgentOnly = query.urgentes === "1";
  const from = urgentOnly ? getTodayISO() : query.from;
  const to = urgentOnly ? addDaysISO(3) : query.to;
  const supabase = await createClient();

  let request = supabase
    .from("flights")
    .select("id, flight_folio, user_id, flight_type, flight_date, flight_time, return_flight_date, return_flight_time, passengers, fare_type, total_amount, payment_percentage, amount_to_pay, status, created_at")
    .order("flight_date", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(search ? 180 : 120);

  if (activeStatus !== "todos") request = request.eq("status", activeStatus);
  if (from) request = request.gte("flight_date", from);
  if (to) request = request.lte("flight_date", to);

  const { data: rawFlights, error: flightsError } = await request;
  const userIds = Array.from(new Set((rawFlights ?? []).map((flight: any) => flight.user_id).filter(Boolean)));

  const { data: profiles, error: profilesError } = userIds.length
    ? await supabase.from("profiles").select("id, full_name, email").in("id", userIds)
    : { data: [], error: null };

  const profileMap = new Map((profiles ?? []).map((profile: any) => [profile.id, profile]));

  const flightsWithProfiles = (rawFlights ?? []).map((flight: any) => ({
    ...flight,
    profiles: profileMap.get(flight.user_id) ?? null,
  }));

  const flights = flightsWithProfiles.filter((flight: any) => {
    if (!search) return true;
    const haystack = [
      formatFlightFolio(flight),
      flight.id,
      flight.fare_type,
      flight.profiles?.full_name,
      flight.profiles?.email,
      statusLabel(flight.status),
      flight.flight_date,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(search);
  });

  return (
    <div className="space-y-6">
      <section className={panelClass}>
        <p className="text-sm font-black uppercase tracking-[0.24em] text-sky-700">Panel administrativo</p>
        <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Vuelos recibidos</h2>
        <p className="mt-2 text-slate-500">Listado general con búsqueda avanzada por estado, fecha, usuario o ID de vuelo.</p>
      </section>

      {(flightsError || profilesError) ? (
        <section className="rounded-[2rem] border border-amber-200 bg-amber-50 p-5 text-amber-900 shadow-xl shadow-amber-100/60">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 shrink-0" size={20} />
            <div>
              <p className="font-black">No se pudo cargar la información completa.</p>
              <p className="mt-1 text-sm font-semibold">
                {flightsError?.message || profilesError?.message || "Error desconocido al consultar vuelos."}
              </p>
              <p className="mt-1 text-xs font-bold text-amber-700">
                Revisa que el usuario tenga rol admin y que el SQL de la Etapa 9 esté ejecutado en Supabase.
              </p>
            </div>
          </div>
        </section>
      ) : null}

      <section className={panelClass}>
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-2xl bg-sky-100 p-2 text-sky-800"><SlidersHorizontal size={20} /></div>
          <div>
            <h3 className="font-black text-slate-950">Filtros operativos</h3>
            <p className="text-sm text-slate-500">Usa estos filtros para revisar urgencias, pagos pendientes o vuelos por usuario.</p>
          </div>
        </div>

        <form className="grid gap-4 xl:grid-cols-[1fr_1fr_1fr_1.3fr_auto] xl:items-end">
          <label className="space-y-2">
            <span className={labelClass}>Estado</span>
            <select className={inputClass} name="status" defaultValue={activeStatus}>
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className={labelClass}>Desde</span>
            <input className={inputClass} type="date" name="from" defaultValue={from ?? ""} />
          </label>

          <label className="space-y-2">
            <span className={labelClass}>Hasta</span>
            <input className={inputClass} type="date" name="to" defaultValue={to ?? ""} />
          </label>

          <label className="space-y-2">
            <span className={labelClass}>Buscar</span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input className={`${inputClass} pl-11`} name="q" defaultValue={query.q ?? ""} placeholder="Usuario, correo, ID, tarifa..." />
            </div>
          </label>

          <button className={buttonPrimarySmall}>Aplicar filtros</button>
        </form>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/admin/vuelos" className={buttonSecondarySmall}>Limpiar / ver todos</Link>
          <Link href="/admin/vuelos?urgentes=1" className={urgentOnly ? buttonPrimarySmall : buttonSecondarySmall}>Urgentes 0 a 3 días</Link>
          <Link href="/admin/vuelos?status=pago_subido" className={activeStatus === "pago_subido" ? buttonPrimarySmall : buttonSecondarySmall}>Pagos por validar</Link>
          <Link href="/admin/vuelos?status=pendiente_qr" className={activeStatus === "pendiente_qr" ? buttonPrimarySmall : buttonSecondarySmall}>QR pendientes</Link>
        </div>
      </section>

      <section className={panelClass}>
        <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-xl font-black text-slate-950">Resultados</h3>
            <p className="text-sm text-slate-500">{flights.length} vuelo(s) encontrados.</p>
          </div>
        </div>

        {!flights.length ? (
          <EmptyState title="No hay vuelos con estos filtros." description="Pulsa Limpiar / ver todos o prueba con otro estado, fecha o búsqueda." />
        ) : (
          <div className="overflow-x-auto rounded-3xl border border-slate-200">
            <table className="w-full min-w-[1040px] border-collapse bg-white text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.16em] text-slate-500">
                <tr>
                  <th className="px-5 py-4">Folio</th>
                  <th className="px-5 py-4">Usuario</th>
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
                {flights.map((flight: any) => (
                  <tr key={flight.id} className="hover:bg-slate-50/70">
                    <td data-label="Folio" className="px-5 py-4 font-black text-slate-900">{formatFlightFolio(flight)}</td>
                    <td data-label="Usuario" className="px-5 py-4">
                      <p className="font-black text-slate-800">{flight.profiles?.full_name || "Usuario"}</p>
                      <p className="text-xs font-semibold text-slate-500">{flight.profiles?.email || "Sin correo"}</p>
                    </td>
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
                    <td data-label="Estado" className="px-5 py-4" title={statusLabel(flight.status)}><StatusBadge status={flight.status} /></td>
                    <td data-label="Acción" className="px-5 py-4">
                      <Link href={`/admin/vuelos/${flight.id}`} className={buttonPrimarySmall}>Revisar</Link>
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

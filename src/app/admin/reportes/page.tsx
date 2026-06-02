import Link from "next/link";
import { BarChart3, Download, FileText, TrendingUp } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { PrintButton } from "@/components/ui/PrintButton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { createClient } from "@/lib/supabase/server";
import { buttonPrimarySmall, buttonSecondarySmall, inputClass, labelClass, panelClass } from "@/lib/styles";
import { flightTypeLabel, formatCurrency, formatDate, formatFlightFolio, formatTime, getAmountToPay, getTodayISO, statusLabel } from "@/lib/utils";
export const revalidate = 60;
const paidStatuses = new Set(["pago_confirmado", "pendiente_qr", "qr_enviado", "completado"]);
const pendingCollectionStatuses = new Set(["esperando_pago", "pago_subido"]);

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

type PageProps = {
  searchParams: Promise<{ from?: string; to?: string; status?: string; q?: string }>;
};

function firstDayOfCurrentMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
}

function buildExportHref(params: { from: string; to: string; status: string; q: string }) {
  const search = new URLSearchParams();
  search.set("from", params.from);
  search.set("to", params.to);
  search.set("status", params.status);
  if (params.q) search.set("q", params.q);
  return `/admin/reportes/export?${search.toString()}`;
}

export default async function AdminReportsPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const from = query.from || firstDayOfCurrentMonth();
  const to = query.to || getTodayISO();
  const requestedStatus = query.status || "todos";
  const activeStatus = allowedStatuses.has(requestedStatus) ? requestedStatus : "todos";
  const searchText = (query.q || "").trim().toLowerCase();
  const supabase = await createClient();

  let request = supabase
    .from("flights")
    .select("id, flight_folio, user_id, flight_type, flight_date, flight_time, return_flight_date, return_flight_time, passengers, fare_type, total_amount, payment_percentage, amount_to_pay, status, created_at")
    .gte("flight_date", from)
    .lte("flight_date", to)
    .order("flight_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(searchText ? 250 : 180);

  if (activeStatus !== "todos") request = request.eq("status", activeStatus);

  const { data: rawFlights, error } = await request;
  const userIds = Array.from(new Set((rawFlights ?? []).map((flight: any) => flight.user_id).filter(Boolean)));
  const { data: profiles } = userIds.length
    ? await supabase.from("profiles").select("id, full_name, email").in("id", userIds)
    : { data: [] };
  const profileMap = new Map((profiles ?? []).map((profile: any) => [profile.id, profile]));

  const flights = (rawFlights ?? [])
    .map((flight: any) => ({ ...flight, profiles: profileMap.get(flight.user_id) ?? null }))
    .filter((flight: any) => {
      if (!searchText) return true;
      const haystack = [
        formatFlightFolio(flight),
        flight.id,
        flight.fare_type,
        statusLabel(flight.status),
        flight.profiles?.full_name,
        flight.profiles?.email,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(searchText);
    });

  const totalFlights = flights.length;
  const completedFlights = flights.filter((flight: any) => flight.status === "completado").length;
  const cancelledFlights = flights.filter((flight: any) => flight.status === "cancelado").length;
  const paidFlights = flights.filter((flight: any) => paidStatuses.has(flight.status));
  const pendingCollectionFlights = flights.filter((flight: any) => pendingCollectionStatuses.has(flight.status));
  const totalOriginal = flights.reduce((sum: number, flight: any) => sum + Number(flight.total_amount ?? 0), 0);
  const totalCollected = paidFlights.reduce((sum: number, flight: any) => sum + getAmountToPay(flight), 0);
  const pendingCollection = pendingCollectionFlights.reduce((sum: number, flight: any) => sum + getAmountToPay(flight), 0);
  const totalDiscount = flights.reduce((sum: number, flight: any) => sum + Math.max(0, Number(flight.total_amount ?? 0) - getAmountToPay(flight)), 0);
  const averageTicket = totalFlights ? totalOriginal / totalFlights : 0;

  const statusRows = statusOptions
    .filter((option) => option.value !== "todos")
    .map((option) => {
      const groupedFlights = flights.filter((flight: any) => flight.status === option.value);
      return {
        status: option.value,
        label: option.label,
        count: groupedFlights.length,
        amount: groupedFlights.reduce((sum: number, flight: any) => sum + getAmountToPay(flight), 0),
      };
    })
    .filter((row) => row.count > 0);

  const fareMap = new Map<string, { count: number; original: number; payable: number }>();
  for (const flight of flights as any[]) {
    const key = flight.fare_type || "Sin tarifa";
    const current = fareMap.get(key) ?? { count: 0, original: 0, payable: 0 };
    current.count += 1;
    current.original += Number(flight.total_amount ?? 0);
    current.payable += getAmountToPay(flight);
    fareMap.set(key, current);
  }
  const fareRows = Array.from(fareMap.entries()).sort((a, b) => b[1].payable - a[1].payable);
  const exportHref = buildExportHref({ from, to, status: activeStatus, q: query.q || "" });

  return (
    <div className="space-y-6">
      <section className={panelClass}>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.24em] text-sky-700">Panel administrativo</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Reportes operativos</h2>
            <p className="mt-2 max-w-3xl text-slate-500">
              Consulta ventas, descuentos, vuelos por estado y exporta el historial para administración.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 print:hidden">
            <Link href={exportHref} className={buttonPrimarySmall}><Download size={16} /> Exportar CSV</Link>
            <PrintButton />
          </div>
        </div>
      </section>

      <section className={`${panelClass} print:hidden`}>
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-2xl bg-sky-100 p-2 text-sky-800"><BarChart3 size={20} /></div>
          <div>
            <h3 className="font-black text-slate-950">Filtros de reporte</h3>
            <p className="text-sm text-slate-500">Filtra por fechas, estado, folio, usuario o tarifa.</p>
          </div>
        </div>

        <form className="grid gap-4 xl:grid-cols-[1fr_1fr_1fr_1.4fr_auto] xl:items-end">
          <label className="space-y-2">
            <span className={labelClass}>Desde</span>
            <input className={inputClass} type="date" name="from" defaultValue={from} />
          </label>
          <label className="space-y-2">
            <span className={labelClass}>Hasta</span>
            <input className={inputClass} type="date" name="to" defaultValue={to} />
          </label>
          <label className="space-y-2">
            <span className={labelClass}>Estado</span>
            <select className={inputClass} name="status" defaultValue={activeStatus}>
              {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="space-y-2">
            <span className={labelClass}>Buscar</span>
            <input className={inputClass} name="q" defaultValue={query.q || ""} placeholder="Folio, usuario, correo, tarifa..." />
          </label>
          <button className={buttonPrimarySmall}>Aplicar</button>
        </form>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/admin/reportes" className={buttonSecondarySmall}>Mes actual</Link>
          <Link href={`/admin/reportes?from=${from}&to=${to}&status=pago_subido`} className={buttonSecondarySmall}>Pagos por validar</Link>
          <Link href={`/admin/reportes?from=${from}&to=${to}&status=completado`} className={buttonSecondarySmall}>Completados</Link>
          <Link href={`/admin/reportes?from=${from}&to=${to}&status=cancelado`} className={buttonSecondarySmall}>Cancelados</Link>
        </div>
      </section>

      {error ? (
        <section className="rounded-[2rem] border border-amber-200 bg-amber-50 p-5 text-amber-900 shadow-xl shadow-amber-100/60">
          <p className="font-black">No se pudo cargar el reporte.</p>
          <p className="mt-1 text-sm font-semibold">{error.message}</p>
        </section>
      ) : null}

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Vuelos del periodo" value={totalFlights} helper={`${formatDate(from)} a ${formatDate(to)}`} />
        <StatCard title="Recaudado" value={formatCurrency(totalCollected)} helper="Estados con pago confirmado" />
        <StatCard title="Por cobrar" value={formatCurrency(pendingCollection)} helper="Esperando pago o comprobante" />
        <StatCard title="Ticket promedio" value={formatCurrency(averageTicket)} helper="Sobre total original" />
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <MiniMetric icon={<TrendingUp size={18} />} label="Total original" value={formatCurrency(totalOriginal)} />
        <MiniMetric icon={<FileText size={18} />} label="Descuentos aplicados" value={formatCurrency(totalDiscount)} />
        <MiniMetric icon={<FileText size={18} />} label="Completados" value={completedFlights} />
        <MiniMetric icon={<FileText size={18} />} label="Cancelados" value={cancelledFlights} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className={panelClass}>
          <h3 className="text-xl font-black text-slate-950">Resumen por estado</h3>
          {!statusRows.length ? <EmptyState title="Sin movimientos por estado." /> : (
            <div className="mt-5 space-y-3">
              {statusRows.map((row) => (
                <div key={row.status} className="flex items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white p-4">
                  <div className="min-w-0">
                    <StatusBadge status={row.status} />
                    <p className="mt-2 text-xs font-bold text-slate-500">{row.count} vuelo(s)</p>
                  </div>
                  <p className="text-right text-lg font-black text-slate-950">{formatCurrency(row.amount)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={panelClass}>
          <h3 className="text-xl font-black text-slate-950">Resumen por tarifa</h3>
          {!fareRows.length ? <EmptyState title="Sin tarifas en este periodo." /> : (
            <div className="mt-5 space-y-3">
              {fareRows.map(([fare, data]) => (
                <div key={fare} className="rounded-3xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-black text-slate-900">{fare}</p>
                    <p className="text-sm font-black text-sky-700">{data.count} vuelo(s)</p>
                  </div>
                  <div className="mt-2 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                    <p>Original: <strong>{formatCurrency(data.original)}</strong></p>
                    <p>A pagar: <strong>{formatCurrency(data.payable)}</strong></p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className={panelClass}>
        <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-xl font-black text-slate-950">Detalle de vuelos</h3>
            <p className="text-sm text-slate-500">Listado base para auditoría y operación diaria.</p>
          </div>
          <Link href={exportHref} className={`${buttonSecondarySmall} print:hidden`}><Download size={16} /> Descargar detalle</Link>
        </div>

        {!flights.length ? (
          <EmptyState title="No hay vuelos en este reporte." description="Cambia fechas o filtros para revisar otro periodo." />
        ) : (
          <div className="overflow-x-auto rounded-3xl border border-slate-200">
            <table className="w-full min-w-[1040px] border-collapse bg-white text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.16em] text-slate-500">
                <tr>
                  <th className="px-5 py-4">Folio</th>
                  <th className="px-5 py-4">Usuario</th>
                  <th className="px-5 py-4">Viaje</th>
                  <th className="px-5 py-4">Fecha</th>
                  <th className="px-5 py-4">Tarifa</th>
                  <th className="px-5 py-4">Total</th>
                  <th className="px-5 py-4">% / a pagar</th>
                  <th className="px-5 py-4">Estado</th>
                  <th className="px-5 py-4 print:hidden">Acción</th>
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
                    <td data-label="Fecha" className="px-5 py-4 text-slate-600">
                      <p>Ida: {formatDate(flight.flight_date)} · {formatTime(flight.flight_time)}</p>
                      {flight.flight_type === "redondo" ? <p className="mt-1 text-xs font-bold text-slate-500">Regreso: {formatDate(flight.return_flight_date)} · {formatTime(flight.return_flight_time)}</p> : null}
                    </td>
                    <td data-label="Tarifa" className="px-5 py-4 text-slate-600">{flight.fare_type}</td>
                    <td data-label="Total" className="px-5 py-4 font-bold text-slate-900">{formatCurrency(flight.total_amount)}</td>
                    <td data-label="% / a pagar" className="px-5 py-4">
                      <p className="font-black text-sky-700">{formatCurrency(getAmountToPay(flight))}</p>
                      <p className="text-xs font-bold text-slate-500">{Number(flight.payment_percentage ?? 100)}%</p>
                    </td>
                    <td data-label="Estado" className="px-5 py-4"><StatusBadge status={flight.status} /></td>
                    <td data-label="Acción" className="px-5 py-4 print:hidden"><Link href={`/admin/vuelos/${flight.id}`} className={buttonSecondarySmall}>Abrir</Link></td>
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

function MiniMetric({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-5 shadow-xl shadow-slate-200/60">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 text-sky-800">{icon}</div>
      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
    </div>
  );
}

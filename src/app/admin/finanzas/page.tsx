import Link from "next/link";
import { BarChart3, CalendarDays, Download, FileSpreadsheet, TrendingDown, TrendingUp, WalletCards } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { PrintButton } from "@/components/ui/PrintButton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { createClient } from "@/lib/supabase/server";
import { DownloadButton } from "@/components/ui/DownloadButton";

import { buttonPrimarySmall, buttonSecondarySmall, inputClass, labelClass, panelClass } from "@/lib/styles";
import {
  firstDayOfCurrentMonth,
  firstDayOfCurrentWeek,
  formatCurrency,
  formatDate,
  formatFlightFolio,
  formatPercent,
  getAmountToPay,
  getCommissionAmount,
  getDiscountAmount,
  getFlightProfit,
  getProviderCostAmount,
  getTodayISO,
  passengerSearchText,
  statusLabel,
} from "@/lib/utils";

const paidStatuses = new Set(["pago_confirmado", "pendiente_qr", "qr_enviado", "completado"]);
const pendingStatuses = new Set(["esperando_pago", "pago_subido"]);

const cutOptions = [
  { label: "Hoy", value: "diario" },
  { label: "Semana", value: "semanal" },
  { label: "Mes", value: "mensual" },
  { label: "Personalizado", value: "custom" },
];

const financialStatusOptions = [
  { label: "Todos", value: "todos" },
  { label: "Pendiente", value: "pendiente" },
  { label: "Revisar", value: "revisar" },
  { label: "Liquidado", value: "liquidado" },
];

function resolveRange(params: { cut?: string; from?: string; to?: string }) {
  const cut = params.cut || "mensual";
  if (cut === "diario") return { cut, from: getTodayISO(), to: getTodayISO() };
  if (cut === "semanal") return { cut, from: firstDayOfCurrentWeek(), to: getTodayISO() };
  if (cut === "custom") return { cut, from: params.from || firstDayOfCurrentMonth(), to: params.to || getTodayISO() };
  return { cut: "mensual", from: firstDayOfCurrentMonth(), to: getTodayISO() };
}

function buildHref(path: string, params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  return `${path}?${search.toString()}`;
}

function passengerCount(value: unknown) {
  return Array.isArray(value) ? value.length : 0;
}

type PageProps = {
  searchParams: Promise<{ cut?: string; from?: string; to?: string; q?: string; financial_status?: string }>;
};

export default async function AdminFinancesPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const range = resolveRange(query);
  const searchText = (query.q || "").trim().toLowerCase();
  const requestedFinancialStatus = query.financial_status || "todos";
  const financialStatus = financialStatusOptions.some((option) => option.value === requestedFinancialStatus) ? requestedFinancialStatus : "todos";
  const supabase = await createClient();

  let request = supabase
    .from("flights")
    .select("id, flight_folio, user_id, flight_type, flight_date, flight_time, passengers, fare_type, total_amount, payment_percentage, amount_to_pay, provider_cost_amount, admin_commission_amount, profit_amount, financial_status, financial_notes, status, created_at")
    .gte("flight_date", range.from)
    .lte("flight_date", range.to)
    .order("flight_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(searchText ? 250 : 180);

  if (financialStatus !== "todos") request = request.eq("financial_status", financialStatus);

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
        flight.financial_status,
        flight.profiles?.full_name,
        flight.profiles?.email,
        passengerSearchText(flight.passengers),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(searchText);
    });

  const paidFlights = flights.filter((flight: any) => paidStatuses.has(flight.status));
  const pendingFlights = flights.filter((flight: any) => pendingStatuses.has(flight.status));
  const totalOriginal = flights.reduce((sum: number, flight: any) => sum + Number(flight.total_amount ?? 0), 0);
  const totalCollected = paidFlights.reduce((sum: number, flight: any) => sum + getAmountToPay(flight), 0);
  const totalPending = pendingFlights.reduce((sum: number, flight: any) => sum + getAmountToPay(flight), 0);
  const totalDiscounts = flights.reduce((sum: number, flight: any) => sum + getDiscountAmount(flight), 0);
  const totalProviderCost = flights.reduce((sum: number, flight: any) => sum + getProviderCostAmount(flight), 0);
  const totalCommissions = flights.reduce((sum: number, flight: any) => sum + getCommissionAmount(flight), 0);
  const totalProfit = flights.reduce((sum: number, flight: any) => sum + getFlightProfit(flight), 0);
  const profitMargin = totalCollected > 0 ? (totalProfit / totalCollected) * 100 : 0;

  const userSummary = new Map<string, { name: string; email: string; flights: number; collected: number; pending: number; discounts: number; profit: number }>();
  for (const flight of flights as any[]) {
    const profile = flight.profiles;
    const key = flight.user_id || "sin-usuario";
    const current = userSummary.get(key) ?? {
      name: profile?.full_name || "Usuario",
      email: profile?.email || "Sin correo",
      flights: 0,
      collected: 0,
      pending: 0,
      discounts: 0,
      profit: 0,
    };
    current.flights += 1;
    current.discounts += getDiscountAmount(flight);
    current.profit += getFlightProfit(flight);
    if (paidStatuses.has(flight.status)) current.collected += getAmountToPay(flight);
    if (pendingStatuses.has(flight.status)) current.pending += getAmountToPay(flight);
    userSummary.set(key, current);
  }
  const userRows = Array.from(userSummary.values()).sort((a, b) => b.collected - a.collected);

  const exportParams = { cut: range.cut, from: range.from, to: range.to, q: query.q, financial_status: financialStatus };
  const exportFlightsHref = buildHref("/admin/finanzas/export", { ...exportParams, type: "flights" });
  const exportUsersHref = buildHref("/admin/finanzas/export", { ...exportParams, type: "users" });

  return (
    <div className="space-y-6">
      <section className={panelClass}>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.24em] text-sky-700">Panel administrativo</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Panel financiero</h2>
            <p className="mt-2 max-w-3xl text-slate-500">
              Controla cortes diarios, semanales y mensuales, ganancias por vuelo, comisiones, descuentos y exportaciones por usuario.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 print:hidden">
            <DownloadButton href={exportFlightsHref} filename="finanzas-vuelos.csv" className={buttonPrimarySmall}>
              Exportar Vuelos
            </DownloadButton>
            <DownloadButton href={exportUsersHref} filename="finanzas-usuarios.csv" className={buttonPrimarySmall}>
              Exportar Usuarios
            </DownloadButton>
          </div>
        </div>
      </section>

      <section className={`${panelClass} print:hidden`}>
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-2xl bg-sky-100 p-2 text-sky-800"><CalendarDays size={20} /></div>
          <div>
            <h3 className="font-black text-slate-950">Corte financiero</h3>
            <p className="text-sm text-slate-500">Selecciona corte, fechas, estatus financiero o busca por folio, pasajero o usuario.</p>
          </div>
        </div>
        <form className="grid gap-4 xl:grid-cols-[1fr_1fr_1fr_1fr_1.4fr_auto] xl:items-end">
          <label className="space-y-2">
            <span className={labelClass}>Corte</span>
            <select className={inputClass} name="cut" defaultValue={range.cut}>
              {cutOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="space-y-2">
            <span className={labelClass}>Desde</span>
            <input className={inputClass} type="date" name="from" defaultValue={range.from} />
          </label>
          <label className="space-y-2">
            <span className={labelClass}>Hasta</span>
            <input className={inputClass} type="date" name="to" defaultValue={range.to} />
          </label>
          <label className="space-y-2">
            <span className={labelClass}>Finanzas</span>
            <select className={inputClass} name="financial_status" defaultValue={financialStatus}>
              {financialStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="space-y-2">
            <span className={labelClass}>Buscar</span>
            <input className={inputClass} name="q" defaultValue={query.q || ""} placeholder="Folio, pasajero, usuario, tarifa..." />
          </label>
          <button className={buttonPrimarySmall}>Aplicar</button>
        </form>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/admin/finanzas?cut=diario" className={range.cut === "diario" ? buttonPrimarySmall : buttonSecondarySmall}>Corte diario</Link>
          <Link href="/admin/finanzas?cut=semanal" className={range.cut === "semanal" ? buttonPrimarySmall : buttonSecondarySmall}>Corte semanal</Link>
          <Link href="/admin/finanzas?cut=mensual" className={range.cut === "mensual" ? buttonPrimarySmall : buttonSecondarySmall}>Corte mensual</Link>
        </div>
      </section>

      {error ? (
        <section className="rounded-[2rem] border border-amber-200 bg-amber-50 p-5 text-amber-900 shadow-xl shadow-amber-100/60">
          <p className="font-black">No se pudo cargar el panel financiero.</p>
          <p className="mt-1 text-sm font-semibold">{error.message}</p>
        </section>
      ) : null}

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Vuelos del corte" value={flights.length} helper={`${formatDate(range.from)} a ${formatDate(range.to)}`} />
        <StatCard title="Recaudado" value={formatCurrency(totalCollected)} helper="Pagos confirmados o completados" />
        <StatCard title="Ganancia estimada" value={formatCurrency(totalProfit)} helper={`Margen ${formatPercent(profitMargin)}`} />
        <StatCard title="Por cobrar" value={formatCurrency(totalPending)} helper="Esperando pago o comprobante" />
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <MiniFinance icon={<WalletCards size={18} />} label="Total original" value={formatCurrency(totalOriginal)} />
        <MiniFinance icon={<TrendingDown size={18} />} label="Descuentos" value={formatCurrency(totalDiscounts)} />
        <MiniFinance icon={<FileSpreadsheet size={18} />} label="Costo proveedor" value={formatCurrency(totalProviderCost)} />
        <MiniFinance icon={<BarChart3 size={18} />} label="Comisiones / gastos" value={formatCurrency(totalCommissions)} />
      </section>

      <section className={panelClass}>
        <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-xl font-black text-slate-950">Ganancia por vuelo</h3>
            <p className="text-sm text-slate-500">Cada vuelo muestra total, descuento, costo, comisión y ganancia.</p>
          </div>
        </div>
        {!flights.length ? (
          <EmptyState title="No hay vuelos en este corte." description="Cambia el rango, estatus financiero o búsqueda." />
        ) : (
          <div className="overflow-x-auto rounded-3xl border border-slate-200">
            <table className="w-full min-w-[1180px] border-collapse bg-white text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.16em] text-slate-500">
                <tr>
                  <th className="px-5 py-4">Folio</th>
                  <th className="px-5 py-4">Usuario</th>
                  <th className="px-5 py-4">Fecha</th>
                  <th className="px-5 py-4">Estado</th>
                  <th className="px-5 py-4">Total</th>
                  <th className="px-5 py-4">A pagar</th>
                  <th className="px-5 py-4">Descuento</th>
                  <th className="px-5 py-4">Costo</th>
                  <th className="px-5 py-4">Comisión</th>
                  <th className="px-5 py-4">Ganancia</th>
                  <th className="px-5 py-4">Finanzas</th>
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
                    <td data-label="Fecha" className="px-5 py-4 text-slate-600">{formatDate(flight.flight_date)}</td>
                    <td data-label="Estado" className="px-5 py-4"><StatusBadge status={flight.status} /></td>
                    <td data-label="Total" className="px-5 py-4 font-bold text-slate-700">{formatCurrency(flight.total_amount)}</td>
                    <td data-label="A pagar" className="px-5 py-4 font-black text-sky-700">{formatCurrency(getAmountToPay(flight))}</td>
                    <td data-label="Descuento" className="px-5 py-4 font-bold text-emerald-700">{formatCurrency(getDiscountAmount(flight))}</td>
                    <td data-label="Costo" className="px-5 py-4 text-slate-600">{formatCurrency(getProviderCostAmount(flight))}</td>
                    <td data-label="Comisión" className="px-5 py-4 text-slate-600">{formatCurrency(getCommissionAmount(flight))}</td>
                    <td data-label="Ganancia" className="px-5 py-4 font-black text-slate-950">{formatCurrency(getFlightProfit(flight))}</td>
                    <td data-label="Finanzas" className="px-5 py-4">
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-slate-600">
                        {flight.financial_status || "pendiente"}
                      </span>
                    </td>
                    <td data-label="Acción" className="px-5 py-4"><Link className={buttonPrimarySmall} href={`/admin/vuelos/${flight.id}`}>Editar</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={panelClass}>
        <div className="mb-5">
          <h3 className="text-xl font-black text-slate-950">Reporte por usuario</h3>
          <p className="text-sm text-slate-500">Resumen exportable de recaudado, pendiente, descuentos y ganancia por usuario.</p>
        </div>
        {!userRows.length ? (
          <EmptyState title="No hay usuarios en este corte." description="Ajusta los filtros para ver un resumen por usuario." />
        ) : (
          <div className="grid gap-3">
            {userRows.map((row) => (
              <article key={`${row.email}-${row.name}`} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <p className="font-black text-slate-950">{row.name}</p>
                    <p className="text-xs font-semibold text-slate-500">{row.email}</p>
                  </div>
                  <div className="grid gap-3 text-sm md:grid-cols-5 xl:min-w-[780px]">
                    <Metric label="Vuelos" value={String(row.flights)} />
                    <Metric label="Recaudado" value={formatCurrency(row.collected)} />
                    <Metric label="Por cobrar" value={formatCurrency(row.pending)} />
                    <Metric label="Descuentos" value={formatCurrency(row.discounts)} />
                    <Metric label="Ganancia" value={formatCurrency(row.profit)} strong />
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

function MiniFinance({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-5 shadow-xl shadow-slate-200/60">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-100 text-sky-800">{icon}</div>
      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-black text-slate-950">{value}</p>
    </div>
  );
}

function Metric({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className={strong ? "font-black text-slate-950" : "font-bold text-slate-700"}>{value}</p>
    </div>
  );
}

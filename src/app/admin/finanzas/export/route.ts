import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  csvEscape,
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
const financialStatuses = new Set(["todos", "pendiente", "revisar", "liquidado"]);

function resolveRange(params: URLSearchParams) {
  const cut = params.get("cut") || "mensual";
  if (cut === "diario") return { cut, from: getTodayISO(), to: getTodayISO() };
  if (cut === "semanal") return { cut, from: firstDayOfCurrentWeek(), to: getTodayISO() };
  if (cut === "custom") return { cut, from: params.get("from") || firstDayOfCurrentMonth(), to: params.get("to") || getTodayISO() };
  return { cut: "mensual", from: firstDayOfCurrentMonth(), to: getTodayISO() };
}
export const revalidate = 60;
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const searchParams = request.nextUrl.searchParams;
  const range = resolveRange(searchParams);
  const type = searchParams.get("type") === "users" ? "users" : "flights";
  const q = (searchParams.get("q") || "").trim().toLowerCase();
  const requestedFinancialStatus = searchParams.get("financial_status") || "todos";
  const financialStatus = financialStatuses.has(requestedFinancialStatus) ? requestedFinancialStatus : "todos";

  let query = supabase
    .from("flights")
    .select("id, flight_folio, user_id, flight_date, flight_time, passengers, fare_type, total_amount, payment_percentage, amount_to_pay, provider_cost_amount, admin_commission_amount, profit_amount, financial_status, status, created_at")
    .gte("flight_date", range.from)
    .lte("flight_date", range.to)
    .order("flight_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (financialStatus !== "todos") query = query.eq("financial_status", financialStatus);

  const { data: rawFlights, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const userIds = Array.from(new Set((rawFlights ?? []).map((flight: any) => flight.user_id).filter(Boolean)));
  const { data: profiles } = userIds.length
    ? await supabase.from("profiles").select("id, full_name, email").in("id", userIds)
    : { data: [] };
  const profileMap = new Map((profiles ?? []).map((item: any) => [item.id, item]));

  const flights = (rawFlights ?? [])
    .map((flight: any) => ({ ...flight, profiles: profileMap.get(flight.user_id) ?? null }))
    .filter((flight: any) => {
      if (!q) return true;
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
      return haystack.includes(q);
    });

  let headers: string[];
  let rows: Array<Array<unknown>>;

  if (type === "users") {
    const userSummary = new Map<string, { name: string; email: string; flights: number; collected: number; pending: number; original: number; discounts: number; providerCost: number; commissions: number; profit: number }>();
    for (const flight of flights as any[]) {
      const profile = flight.profiles;
      const key = flight.user_id || "sin-usuario";
      const current = userSummary.get(key) ?? {
        name: profile?.full_name || "Usuario",
        email: profile?.email || "Sin correo",
        flights: 0,
        collected: 0,
        pending: 0,
        original: 0,
        discounts: 0,
        providerCost: 0,
        commissions: 0,
        profit: 0,
      };
      current.flights += 1;
      current.original += Number(flight.total_amount ?? 0);
      current.discounts += getDiscountAmount(flight);
      current.providerCost += getProviderCostAmount(flight);
      current.commissions += getCommissionAmount(flight);
      current.profit += getFlightProfit(flight);
      if (paidStatuses.has(flight.status)) current.collected += getAmountToPay(flight);
      if (pendingStatuses.has(flight.status)) current.pending += getAmountToPay(flight);
      userSummary.set(key, current);
    }

    headers = ["Usuario", "Correo", "Vuelos", "Total original", "Recaudado", "Por cobrar", "Descuentos", "Costo proveedor", "Comisiones/gastos", "Ganancia"];
    rows = Array.from(userSummary.values())
      .sort((a, b) => b.collected - a.collected)
      .map((item) => [
        item.name,
        item.email,
        item.flights,
        formatCurrency(item.original),
        formatCurrency(item.collected),
        formatCurrency(item.pending),
        formatCurrency(item.discounts),
        formatCurrency(item.providerCost),
        formatCurrency(item.commissions),
        formatCurrency(item.profit),
      ]);
  } else {
    headers = [
      "Folio",
      "ID",
      "Usuario",
      "Correo",
      "Fecha",
      "Pasajeros",
      "Tarifa",
      "Estado vuelo",
      "Estado finanzas",
      "Total original",
      "Porcentaje pago",
      "Total a depositar",
      "Descuento",
      "Costo proveedor",
      "Comisiones/gastos",
      "Ganancia",
      "Creado",
    ];
    rows = flights.map((flight: any) => [
      formatFlightFolio(flight),
      flight.id,
      flight.profiles?.full_name || "Usuario",
      flight.profiles?.email || "",
      formatDate(flight.flight_date),
      Array.isArray(flight.passengers) ? flight.passengers.length : 0,
      flight.fare_type,
      statusLabel(flight.status),
      flight.financial_status || "pendiente",
      formatCurrency(flight.total_amount),
      formatPercent(flight.payment_percentage ?? 100),
      formatCurrency(getAmountToPay(flight)),
      formatCurrency(getDiscountAmount(flight)),
      formatCurrency(getProviderCostAmount(flight)),
      formatCurrency(getCommissionAmount(flight)),
      formatCurrency(getFlightProfit(flight)),
      new Date(flight.created_at).toLocaleString("es-MX"),
    ]);
  }

  const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");

  await supabase.from("audit_logs").insert({
    user_id: user.id,
    action: "report_generated",
    entity_type: "financial_report",
    entity_id: null,
    metadata: { type, from: range.from, to: range.to, q, financial_status: financialStatus, rows: rows.length },
  });

  return new NextResponse(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="vuelos-pro-finanzas-${type}-${range.from}-a-${range.to}.csv"`,
    },
  });
}

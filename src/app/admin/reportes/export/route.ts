import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { csvEscape, flightTypeLabel, formatCurrency, formatDate, formatFlightFolio, formatTime, getAmountToPay, statusLabel } from "@/lib/utils";

const statusOptions = new Set([
  "todos",
  "pendiente_revision",
  "esperando_pago",
  "pago_subido",
  "pago_confirmado",
  "pendiente_qr",
  "qr_enviado",
  "completado",
  "cancelado",
]);

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function firstDayOfCurrentMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const from = searchParams.get("from") || firstDayOfCurrentMonth();
  const to = searchParams.get("to") || todayISO();
  const requestedStatus = searchParams.get("status") || "todos";
  const status = statusOptions.has(requestedStatus) ? requestedStatus : "todos";
  const q = (searchParams.get("q") || "").trim().toLowerCase();

  let query = supabase
    .from("flights")
    .select("id, flight_folio, user_id, flight_type, flight_date, flight_time, return_flight_date, return_flight_time, passengers, fare_type, total_amount, payment_percentage, amount_to_pay, status, created_at")
    .gte("flight_date", from)
    .lte("flight_date", to)
    .order("flight_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (status !== "todos") query = query.eq("status", status);

  const { data: rawFlights, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

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
        flight.profiles?.full_name,
        flight.profiles?.email,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });

  const headers = [
    "Folio",
    "ID",
    "Usuario",
    "Correo",
    "Tipo de viaje",
    "Fecha ida",
    "Hora ida",
    "Fecha regreso",
    "Hora regreso",
    "Pasajeros",
    "Tarifa",
    "Total original",
    "Porcentaje a pagar",
    "Total a depositar",
    "Estado",
    "Creado",
  ];

  const rows = flights.map((flight: any) => [
    formatFlightFolio(flight),
    flight.id,
    flight.profiles?.full_name || "Usuario",
    flight.profiles?.email || "",
    flightTypeLabel(flight.flight_type),
    formatDate(flight.flight_date),
    formatTime(flight.flight_time),
    flight.flight_type === "redondo" ? formatDate(flight.return_flight_date) : "",
    flight.flight_type === "redondo" ? formatTime(flight.return_flight_time) : "",
    Array.isArray(flight.passengers) ? flight.passengers.length : 0,
    flight.fare_type,
    formatCurrency(flight.total_amount),
    `${Number(flight.payment_percentage ?? 100)}%`,
    formatCurrency(getAmountToPay(flight)),
    statusLabel(flight.status),
    new Date(flight.created_at).toLocaleString("es-MX"),
  ]);

  const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");

  await supabase.from("audit_logs").insert({
    user_id: user.id,
    action: "report_generated",
    entity_type: "report",
    entity_id: null,
    metadata: { from, to, status, q, rows: flights.length },
  });

  return new NextResponse(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="vuelos-pro-reporte-${from}-a-${to}.csv"`,
    },
  });
}

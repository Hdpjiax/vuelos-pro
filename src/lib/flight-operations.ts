import { formatCurrency, formatDate, formatFlightFolio, formatTime, getAmountToPay, statusLabel } from "@/lib/utils";
import type { Flight, FlightStatus, Passenger, Profile } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export const flightStageOrder: FlightStatus[] = [
  "pendiente_revision",
  "esperando_pago",
  "pago_subido",
  "pago_confirmado",
  "pendiente_qr",
  "qr_enviado",
  "completado",
];

// ✅ Unificado con FlightStatus — ya no hay discrepancia entre los dos tipos
export type FlightStageStatus = FlightStatus;

export const flightStageLabels: Record<FlightStatus, string> = {
  pendiente_revision: "Recibido",
  esperando_pago: "Cuenta enviada",
  pago_subido: "Pago subido",
  pago_confirmado: "Pago confirmado",
  pendiente_qr: "Preparar QR",
  qr_enviado: "QR enviado",
  completado: "Completado",
  cancelado: "Cancelado",
};

export const flightStageDescriptions: Record<FlightStatus, string> = {
  pendiente_revision: "Administración revisa datos, pasajeros y tarifa.",
  esperando_pago: "El usuario ya recibió cuenta bancaria y total a depositar.",
  pago_subido: "El usuario subió comprobante para validación.",
  pago_confirmado: "Administración confirmó el pago.",
  pendiente_qr: "Falta adjuntar QR o fotos finales del vuelo.",
  qr_enviado: "Los QR o archivos de vuelo fueron enviados al usuario.",
  completado: "Proceso cerrado correctamente.",
  cancelado: "Proceso cancelado. Revisa motivo, mensajes e historial.",
};

// ✅ Sin "as any" — usa el índice del array tipado correctamente
export function getFlightStageIndex(status: FlightStatus): number {
  if (status === "cancelado") return -1;
  const index = flightStageOrder.indexOf(status);
  return index < 0 ? 0 : index;
}

export function isFlightLockedForUser(status: FlightStatus): boolean {
  return !["pendiente_revision", "esperando_pago"].includes(status);
}

export function buildStatusNotification(status: FlightStatus): { title: string; body: string } {
  const labels: Record<FlightStatus, { title: string; body: string }> = {
    pendiente_revision: {
      title: "Vuelo recibido",
      body: "Tu vuelo fue recibido y queda pendiente de revisión por administración.",
    },
    esperando_pago: {
      title: "Cuenta bancaria enviada",
      body: "Administración envió la cuenta bancaria y el total a depositar.",
    },
    pago_subido: {
      title: "Comprobante recibido",
      body: "El comprobante fue recibido. Administración lo validará a la brevedad.",
    },
    pago_confirmado: {
      title: "Pago confirmado",
      body: "Administración confirmó tu pago. Ahora preparará los QR del vuelo.",
    },
    pendiente_qr: {
      title: "QR en preparación",
      body: "Tu vuelo está en etapa de preparación de QR o archivos finales.",
    },
    qr_enviado: {
      title: "QR enviados",
      body: "Administración envió los QR de tu vuelo. Revisa el detalle del vuelo.",
    },
    completado: {
      title: "Vuelo completado",
      body: "El proceso del vuelo fue marcado como completado.",
    },
    cancelado: {
      title: "Vuelo cancelado",
      body: "El vuelo fue cancelado. Revisa mensajes, motivo o contacta a soporte.",
    },
  };

  return labels[status] ?? { title: "Estado actualizado", body: `El vuelo cambió a ${statusLabel(status)}.` };
}

// ✅ SupabaseClient tipado en lugar de any
export async function getAdminProfiles(supabase: SupabaseClient): Promise<Pick<Profile, "id" | "full_name" | "email">[]> {
  const { data } = await supabase.from("profiles").select("id, full_name, email").eq("role", "admin");
  return data ?? [];
}

export async function notifyAdmins(
  supabase: SupabaseClient,
  payload: { flight_id?: string | null; title: string; body: string; excludeUserId?: string | null }
): Promise<void> {
  const admins = await getAdminProfiles(supabase);
  const rows = admins
    .filter((admin) => admin.id !== payload.excludeUserId)
    .map((admin) => ({
      user_id: admin.id,
      flight_id: payload.flight_id ?? null,
      title: payload.title,
      body: payload.body,
    }));

  if (rows.length) await supabase.from("notifications").insert(rows);
}

export async function notifyUser(
  supabase: SupabaseClient,
  payload: { user_id: string; flight_id?: string | null; title: string; body: string }
): Promise<void> {
  await supabase.from("notifications").insert({
    user_id: payload.user_id,
    flight_id: payload.flight_id ?? null,
    title: payload.title,
    body: payload.body,
  });
}

export async function logFlightAction(
  supabase: SupabaseClient,
  payload: { user_id?: string | null; action: string; flight_id: string; metadata?: Record<string, unknown> }
): Promise<void> {
  await supabase.from("audit_logs").insert({
    user_id: payload.user_id ?? null,
    action: payload.action,
    entity_type: "flight",
    entity_id: payload.flight_id,
    metadata: payload.metadata ?? {},
  });
}

// ✅ flights: Flight[] en lugar de any[]
export async function maybeNotifyUpcomingFlights(
  supabase: SupabaseClient,
  flights: Pick<Flight, "id" | "status" | "flight_date" | "flight_time" | "flight_folio">[],
  daysWindow = 3
): Promise<void> {
  if (!flights.length) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const flight of flights) {
    if (!flight?.id || !flight.flight_date || flight.status === "cancelado" || flight.status === "completado") continue;

    const date = new Date(`${flight.flight_date}T12:00:00`);
    const diffDays = Math.ceil((date.getTime() - today.getTime()) / 86400000);
    if (diffDays < 0 || diffDays > daysWindow) continue;

    const { data: existing } = await supabase
      .from("audit_logs")
      .select("id")
      .eq("action", "flight_upcoming_alert")
      .eq("entity_type", "flight")
      .eq("entity_id", flight.id)
      .gte("created_at", new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString())
      .limit(1)
      .maybeSingle();

    if (existing?.id) continue;

    const folio = formatFlightFolio(flight);
    await notifyAdmins(supabase, {
      flight_id: flight.id,
      title: "Vuelo próximo",
      body: `${folio} está programado para ${formatDate(flight.flight_date)} a las ${formatTime(flight.flight_time)}. Estado actual: ${statusLabel(flight.status)}.`,
    });

    await logFlightAction(supabase, {
      action: "flight_upcoming_alert",
      flight_id: flight.id,
      metadata: { days_before: diffDays, window_days: daysWindow, folio },
    });
  }
}

// ✅ flight: Flight y userProfile: Profile en lugar de any
export function buildFlightCreatedAdminMessage(
  flight: Pick<Flight, "id" | "flight_folio" | "flight_date" | "flight_time" | "total_amount" | "passengers">,
  userProfile?: Pick<Profile, "full_name" | "email">
): string {
  const passengerCount = Array.isArray(flight.passengers) ? flight.passengers.length : 0;
  const userName = userProfile?.full_name || userProfile?.email || "Usuario";
  return `${userName} subió ${formatFlightFolio(flight)} con ${passengerCount} pasajero(s), total ${formatCurrency(flight.total_amount)}. Fecha ida: ${formatDate(flight.flight_date)} ${formatTime(flight.flight_time)}.`;
}

// ✅ Solo pide los campos que realmente usa — compatible con selects parciales
export function buildPaymentProofAdminMessage(
  flight: Pick<Flight, "id" | "flight_folio" | "total_amount" | "amount_to_pay">
): string {
  return `${formatFlightFolio(flight)} recibió comprobante de pago por revisar. Total esperado: ${formatCurrency(getAmountToPay(flight))}.`;
}
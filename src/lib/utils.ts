import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Passenger } from "@/lib/types"; 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "Sin fecha";
  return new Date(`${value}T12:00:00`).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "Sin fecha";
  return new Date(value).toLocaleString("es-MX", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getTodayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function addDaysISO(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function firstDayOfCurrentMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
}

export function firstDayOfCurrentWeek() {
  const now = new Date();
  const day = now.getDay() || 7;
  now.setDate(now.getDate() - day + 1);
  return now.toISOString().slice(0, 10);
}

export function flightTypeLabel(value: string | null | undefined) {
  return value === "redondo" ? "Vuelo redondo" : "Vuelo sencillo";
}

export function formatTime(value: string | null | undefined) {
  if (!value) return "Sin hora";
  return String(value).slice(0, 5);
}

export function asNumber(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

export function roundMoney(value: number) {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}

export function getAmountToPay(flight: { amount_to_pay?: number | string | null; total_amount?: number | string | null }) {
  const amountToPay = asNumber(flight.amount_to_pay);
  if (amountToPay > 0) return amountToPay;
  return asNumber(flight.total_amount);
}

export function getDiscountAmount(flight: { amount_to_pay?: number | string | null; total_amount?: number | string | null }) {
  return Math.max(0, asNumber(flight.total_amount) - getAmountToPay(flight));
}

export function getFlightProfit(flight: {
  amount_to_pay?: number | string | null;
  total_amount?: number | string | null;
  provider_cost_amount?: number | string | null;
  admin_commission_amount?: number | string | null;
  profit_amount?: number | string | null;
}) {
  const storedProfit = flight.profit_amount;
  if (storedProfit !== null && storedProfit !== undefined && String(storedProfit).trim() !== "") {
    return asNumber(storedProfit);
  }

  return roundMoney(
    getAmountToPay(flight) - asNumber(flight.provider_cost_amount) - asNumber(flight.admin_commission_amount)
  );
}

export function getCommissionAmount(flight: { admin_commission_amount?: number | string | null }) {
  return asNumber(flight.admin_commission_amount);
}

export function getProviderCostAmount(flight: { provider_cost_amount?: number | string | null }) {
  return asNumber(flight.provider_cost_amount);
}

export function formatPercent(value: number | string | null | undefined) {
  const number = Number(value ?? 0);
  if (!Number.isFinite(number)) return "0%";
  return `${new Intl.NumberFormat("es-MX", { maximumFractionDigits: 2 }).format(number)}%`;
}

export function financialStatusLabel(status: string | null | undefined) {
  const labels: Record<string, string> = {
    pendiente: "Pendiente",
    revisar: "Revisar",
    liquidado: "Liquidado",
  };

  return labels[status ?? ""] ?? "Pendiente";
}

export function formatFlightRoute(flight: {
  flight_type?: string | null;
  flight_date?: string | null;
  flight_time?: string | null;
  return_flight_date?: string | null;
  return_flight_time?: string | null;
}) {
  const outbound = `${formatDate(flight.flight_date)} · ${formatTime(flight.flight_time)}`;
  if (flight.flight_type !== "redondo") return outbound;
  const returned = `${formatDate(flight.return_flight_date)} · ${formatTime(flight.return_flight_time)}`;
  return `${outbound} / Regreso: ${returned}`;
}

export function statusLabel(status: string) {
  const labels: Record<string, string> = {
    pendiente_revision: "Pendiente de revisión",
    esperando_pago: "Esperando pago",
    pago_subido: "Pago subido",
    pago_confirmado: "Pago confirmado",
    pendiente_qr: "Pendiente por enviar QR",
    qr_enviado: "QR enviado",
    completado: "Completado",
    cancelado: "Cancelado",
  };

  return labels[status] ?? status;
}

export function actionLabel(action: string) {
  const labels: Record<string, string> = {
    flight_created: "Vuelo creado",
    flight_status_changed: "Estado de vuelo actualizado",
    payment_proof_uploaded: "Comprobante de pago subido",
    qr_uploaded: "QR enviados",
    user_role_updated: "Rol de usuario actualizado",
    notification_read: "Notificación marcada como leída",
    notifications_read_all: "Notificaciones marcadas como leídas",
    notification_group_read: "Grupo de notificaciones marcado como leído",
    bank_account_sent: "Cuenta bancaria enviada",
    flight_user_edited: "Vuelo editado por usuario",
    flight_user_cancelled: "Vuelo cancelado por usuario",
    app_settings_updated: "Configuración actualizada",
    production_settings_updated: "Configuración de producción actualizada",
    read_notifications_cleaned: "Notificaciones leídas limpiadas",
    attachment_deleted: "Archivo eliminado",
    report_generated: "Reporte generado",
    financials_updated: "Finanzas del vuelo actualizadas",
    files_report_viewed: "Archivos revisados",
    payment_confirmed: "Pago confirmado por admin",
    internal_note_created: "Nota interna creada",
    internal_files_uploaded: "Archivos internos subidos",
    flight_upcoming_alert: "Alerta de vuelo próximo",
  };

  return labels[action] ?? action;
}

export function safeJsonPreview(value: unknown) {
  if (!value || typeof value !== "object") return "Sin detalles";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "Sin detalles";
  }
}

export function formatFlightFolio(flight: { flight_folio?: string | null; id?: string | null }) {
  const folio = String(flight.flight_folio ?? "").trim();
  if (folio) return folio;
  const id = String(flight.id ?? "");
  return id ? `VP-${id.slice(0, 8).toUpperCase()}` : "Sin folio";
}

export function statusHelper(status: string) {
  const helpers: Record<string, string> = {
    pendiente_revision: "Administración debe revisar datos, tarifa, pasajeros y porcentaje a pagar.",
    esperando_pago: "Cuenta bancaria enviada. El usuario debe subir comprobante.",
    pago_subido: "El usuario subió comprobante. Administración debe validar el pago.",
    pago_confirmado: "Pago confirmado. Falta preparar o enviar QR.",
    pendiente_qr: "Pago confirmado. Administración debe adjuntar QR o fotos del vuelo.",
    qr_enviado: "QR enviado. Usuario ya puede consultar sus archivos.",
    completado: "Proceso cerrado correctamente.",
    cancelado: "Proceso cancelado. Revisa el motivo y el historial.",
  };

  return helpers[status] ?? "Estado operativo del vuelo.";
}



export function normalizePassengers(value: unknown): Passenger[] {
  return Array.isArray(value) ? (value as Passenger[]) : [];
}

export function passengerSearchText(passengers: unknown) {
  return normalizePassengers(passengers)
    .map((passenger) => [passenger.full_name, passenger.document, passenger.phone, passenger.birth_date, passenger.nationality].filter(Boolean).join(" "))
    .join(" ");
}

export function csvEscape(value: unknown) {
  const text = String(value ?? "");
  if (/[",\n\r;]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

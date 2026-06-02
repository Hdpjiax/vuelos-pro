export type AppRole = "user" | "admin";

export type FlightStatus =
  | "pendiente_revision"
  | "esperando_pago"
  | "pago_subido"
  | "pago_confirmado"
  | "pendiente_qr"
  | "qr_enviado"
  | "completado"
  | "cancelado";

export type FlightType = "sencillo" | "redondo";

// ✅ NUEVO: union type en lugar de string libre
export type FareType =
  | "economica"
  | "business"
  | "primera_clase"
  | "basica"
  | string; // fallback para compatibilidad con datos existentes

// ✅ NUEVO: union type en lugar de string libre
export type MessageType =
  | "texto"
  | "imagen"
  | "archivo"
  | "sistema"
  | string; // fallback para compatibilidad

export type FinancialStatus = "pendiente" | "revisar" | "liquidado";

export type AttachmentCategory = "vuelo" | "comprobante_pago" | "qr" | "interno" | "otro";

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  role: AppRole;
  phone?: string | null;
  company_name?: string | null;
};

export type Passenger = {
  full_name: string;
  document?: string;
  phone?: string;
  birth_date?: string;
  nationality?: string;
};

export type FlightExtras = {
  checked_bags?: number;
  carry_on_bags?: number;
  seats?: number;
  other?: string;
  notes?: string;
};

export type Flight = {
  id: string;
  user_id: string;
  flight_folio?: string | null;
  flight_type?: FlightType | null;
  flight_date: string;
  flight_time: string;
  return_flight_date?: string | null;
  return_flight_time?: string | null;
  passengers: Passenger[];
  fare_type: FareType; // ✅ antes era string
  total_amount: number;
  payment_percentage?: number | null;
  amount_to_pay?: number | null;
  provider_cost_amount?: number | null;
  admin_commission_amount?: number | null;
  profit_amount?: number | null;
  financial_status?: FinancialStatus | null; // ✅ extraído como tipo propio
  financial_notes?: string | null;
  financial_updated_at?: string | null;
  financial_updated_by?: string | null;
  extras: FlightExtras;
  flight_image_path: string | null;
  status: FlightStatus;
  created_at: string;
  user_cancel_reason?: string | null;
  cancelled_at?: string | null;
  cancelled_by?: string | null;
};

export type AppOperationsSettings = {
  support_email?: string;
  support_whatsapp?: string;
  default_bank_note?: string;
  qr_delivery_note?: string;
  urgent_window_days?: number;
};

export type AppProductionSettings = {
  site_url?: string;
  support_escalation_email?: string;
  legal_notice?: string;
  public_registration_enabled?: boolean;
  max_upload_mb?: number;
  cleanup_read_notifications_days?: number;
};

export type FlightAttachment = {
  id: string;
  flight_id: string;
  uploaded_by: string;
  file_path: string;
  file_name: string;
  file_type: string;
  category: AttachmentCategory;
  created_at: string;
};

export type FlightMessage = {
  id: string;
  flight_id: string;
  sender_id: string;
  receiver_id: string | null;
  message: string;
  message_type: MessageType; // ✅ antes era string libre
  created_at: string;
};

// ✅ NUEVO: tipo Notification que se usa en toda la app
export type Notification = {
  id: string;
  user_id: string;
  flight_id?: string | null;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
};

// ✅ NUEVO: tipo AuditLog que se usa en historial y operaciones
export type AuditLog = {
  id: string;
  user_id?: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  metadata?: Record<string, unknown>;
  created_at: string;
};
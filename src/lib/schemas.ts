import { z } from "zod";

// ─── Reutilizables ────────────────────────────────────────────────────────────

const money = z
    .string()
    .transform((v) => Number(v.replace(/,/g, "")))
    .pipe(z.number().positive("Debe ser mayor a cero").finite());

const integer = z
    .string()
    .optional()
    .transform((v) => Math.max(0, Math.floor(Number(v ?? "0"))))
    .pipe(z.number().nonnegative());

const isoDate = z
    .string()
    .min(1, "Fecha requerida")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)");

const timeHHMM = z
    .string()
    .min(1, "Hora requerida")
    .regex(/^\d{2}:\d{2}$/, "Formato de hora inválido (HH:MM)");

// ─── Pasajero ─────────────────────────────────────────────────────────────────

export const passengerSchema = z.object({
    full_name: z.string().min(2, "Nombre requerido (mínimo 2 caracteres)"),
    document: z.string().optional().default(""),
    phone: z.string().optional().default(""),
    birth_date: z.string().optional().default(""),
    nationality: z.string().optional().default(""),
});

// ─── Crear vuelo ──────────────────────────────────────────────────────────────

export const createFlightSchema = z
    .object({
        flight_type: z.enum(["sencillo", "redondo"]),
        flight_date: isoDate,
        flight_time: timeHHMM,
        return_flight_date: isoDate.optional().or(z.literal("")),
        return_flight_time: timeHHMM.optional().or(z.literal("")),
        fare_type: z.string().min(1, "Tipo de tarifa requerido"),
        total_amount: money,
        notes: z.string().max(600, "Máximo 600 caracteres").optional().default(""),
        checked_bags: integer,
        carry_on_bags: integer,
        seats: integer,
        other_extras: z.string().max(300).optional().default(""),
    })
    .refine(
        (data) =>
            data.flight_type !== "redondo" ||
            (!!data.return_flight_date && !!data.return_flight_time),
        {
            message: "Para un vuelo redondo, agrega fecha y horario de regreso.",
            path: ["return_flight_date"],
        }
    );

export type CreateFlightInput = z.infer<typeof createFlightSchema>;

// ─── Actualizar estado del vuelo (admin) ──────────────────────────────────────

export const updateFlightStatusSchema = z.object({
    flight_id: z.string().uuid("ID de vuelo inválido"),
    status: z.enum([
        "pendiente_revision",
        "esperando_pago",
        "pago_subido",
        "pago_confirmado",
        "pendiente_qr",
        "qr_enviado",
        "completado",
        "cancelado",
    ]),
});

export type UpdateFlightStatusInput = z.infer<typeof updateFlightStatusSchema>;

// ─── Enviar cuenta bancaria (admin) ───────────────────────────────────────────

export const sendBankAccountSchema = z.object({
    flight_id: z.string().uuid("ID de vuelo inválido"),
    bank_account_id: z.string().uuid("ID de cuenta inválido"),
    payment_percentage: z
        .string()
        .transform((v) => Number(v.replace(/,/g, ".")))
        .pipe(
            z.number()
                .positive("El porcentaje debe ser mayor a cero")
                .max(100, "El porcentaje no puede ser mayor a 100")
        ),
    note: z.string().max(500).optional().default(""),
});

export type SendBankAccountInput = z.infer<typeof sendBankAccountSchema>;

// ─── Cancelar vuelo (usuario) ─────────────────────────────────────────────────

export const cancelFlightSchema = z.object({
    flight_id: z.string().uuid("ID de vuelo inválido"),
    reason: z.string().max(500, "Máximo 500 caracteres").optional().default(""),
});

export type CancelFlightInput = z.infer<typeof cancelFlightSchema>;

// ─── Nota interna (admin) ─────────────────────────────────────────────────────

export const internalNoteSchema = z.object({
    flight_id: z.string().uuid("ID de vuelo inválido"),
    note: z
        .string()
        .min(3, "La nota debe tener al menos 3 caracteres")
        .max(1200, "Máximo 1200 caracteres"),
});

export type InternalNoteInput = z.infer<typeof internalNoteSchema>;

// ─── Finanzas (admin) ─────────────────────────────────────────────────────────

export const updateFinancialsSchema = z.object({
    flight_id: z.string().uuid("ID de vuelo inválido"),
    provider_cost_amount: z
        .string()
        .transform((v) => Math.round(Number(v.replace(/,/g, ".")) * 100) / 100)
        .pipe(z.number().nonnegative("No puede ser negativo")),
    admin_commission_amount: z
        .string()
        .transform((v) => Math.round(Number(v.replace(/,/g, ".")) * 100) / 100)
        .pipe(z.number().nonnegative("No puede ser negativo")),
    financial_status: z.enum(["pendiente", "revisar", "liquidado"]).default("pendiente"),
    financial_notes: z.string().max(800).optional().default(""),
});

export type UpdateFinancialsInput = z.infer<typeof updateFinancialsSchema>;
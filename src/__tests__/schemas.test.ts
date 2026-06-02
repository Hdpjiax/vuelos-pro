import { describe, it, expect } from "vitest";
import {
  createFlightSchema,
  passengerSchema,
  updateFlightStatusSchema,
  sendBankAccountSchema,
  cancelFlightSchema,
  internalNoteSchema,
} from "@/lib/schemas";

// ─── createFlightSchema ───────────────────────────────────────────────────────

describe("createFlightSchema", () => {
  const valid = {
    flight_type: "sencillo",
    flight_date: "2026-08-15",
    flight_time: "14:30",
    fare_type: "económica",
    total_amount: "5000",
    notes: "",
    checked_bags: "1",
    carry_on_bags: "1",
    seats: "0",
    other_extras: "",
  };

  it("acepta un vuelo sencillo válido", () => {
    const result = createFlightSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.total_amount).toBe(5000);
      expect(result.data.flight_type).toBe("sencillo");
    }
  });

  it("convierte total_amount string a número", () => {
    const result = createFlightSchema.safeParse({ ...valid, total_amount: "1,500.50" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.total_amount).toBe(1500.5);
  });

  it("rechaza total_amount negativo", () => {
    const result = createFlightSchema.safeParse({ ...valid, total_amount: "-100" });
    expect(result.success).toBe(false);
  });

  it("rechaza total_amount cero", () => {
    const result = createFlightSchema.safeParse({ ...valid, total_amount: "0" });
    expect(result.success).toBe(false);
  });

  it("rechaza fecha vacía", () => {
    const result = createFlightSchema.safeParse({ ...valid, flight_date: "" });
    expect(result.success).toBe(false);
  });

  it("rechaza formato de fecha inválido", () => {
    const result = createFlightSchema.safeParse({ ...valid, flight_date: "15/08/2026" });
    expect(result.success).toBe(false);
  });

  it("rechaza formato de hora inválido", () => {
    const result = createFlightSchema.safeParse({ ...valid, flight_time: "2:30pm" });
    expect(result.success).toBe(false);
  });

  it("vuelo redondo válido con fechas de regreso", () => {
    const result = createFlightSchema.safeParse({
      ...valid,
      flight_type: "redondo",
      return_flight_date: "2026-08-20",
      return_flight_time: "18:00",
    });
    expect(result.success).toBe(true);
  });

  it("vuelo redondo sin fecha de regreso falla", () => {
    const result = createFlightSchema.safeParse({
      ...valid,
      flight_type: "redondo",
      return_flight_date: "",
      return_flight_time: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("return_flight_date");
    }
  });
});

// ─── passengerSchema ──────────────────────────────────────────────────────────

describe("passengerSchema", () => {
  it("acepta pasajero válido", () => {
    const result = passengerSchema.safeParse({ full_name: "Juan Pérez" });
    expect(result.success).toBe(true);
  });

  it("rechaza nombre vacío", () => {
    const result = passengerSchema.safeParse({ full_name: "" });
    expect(result.success).toBe(false);
  });

  it("rechaza nombre de 1 caracter", () => {
    const result = passengerSchema.safeParse({ full_name: "J" });
    expect(result.success).toBe(false);
  });

  it("campos opcionales tienen default vacío", () => {
    const result = passengerSchema.safeParse({ full_name: "Ana López" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.document).toBe("");
      expect(result.data.phone).toBe("");
    }
  });
});

// ─── updateFlightStatusSchema ─────────────────────────────────────────────────

describe("updateFlightStatusSchema", () => {
  it("acepta status y uuid válidos", () => {
    const result = updateFlightStatusSchema.safeParse({
      flight_id: "123e4567-e89b-12d3-a456-426614174000",
      status: "pago_confirmado",
    });
    expect(result.success).toBe(true);
  });

  it("rechaza status desconocido", () => {
    const result = updateFlightStatusSchema.safeParse({
      flight_id: "123e4567-e89b-12d3-a456-426614174000",
      status: "estado_inventado",
    });
    expect(result.success).toBe(false);
  });

  it("rechaza flight_id que no es uuid", () => {
    const result = updateFlightStatusSchema.safeParse({
      flight_id: "no-es-un-uuid",
      status: "completado",
    });
    expect(result.success).toBe(false);
  });
});

// ─── sendBankAccountSchema ────────────────────────────────────────────────────

describe("sendBankAccountSchema", () => {
  const valid = {
    flight_id: "123e4567-e89b-12d3-a456-426614174000",
    bank_account_id: "223e4567-e89b-12d3-a456-426614174001",
    payment_percentage: "75",
  };

  it("acepta porcentaje válido", () => {
    const result = sendBankAccountSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.payment_percentage).toBe(75);
  });

  it("rechaza porcentaje mayor a 100", () => {
    const result = sendBankAccountSchema.safeParse({ ...valid, payment_percentage: "110" });
    expect(result.success).toBe(false);
  });

  it("rechaza porcentaje cero", () => {
    const result = sendBankAccountSchema.safeParse({ ...valid, payment_percentage: "0" });
    expect(result.success).toBe(false);
  });
});

// ─── internalNoteSchema ───────────────────────────────────────────────────────

describe("internalNoteSchema", () => {
  it("acepta nota válida", () => {
    const result = internalNoteSchema.safeParse({
      flight_id: "123e4567-e89b-12d3-a456-426614174000",
      note: "Revisar documentos del pasajero.",
    });
    expect(result.success).toBe(true);
  });

  it("rechaza nota menor a 3 caracteres", () => {
    const result = internalNoteSchema.safeParse({
      flight_id: "123e4567-e89b-12d3-a456-426614174000",
      note: "ok",
    });
    expect(result.success).toBe(false);
  });

  it("rechaza nota mayor a 1200 caracteres", () => {
    const result = internalNoteSchema.safeParse({
      flight_id: "123e4567-e89b-12d3-a456-426614174000",
      note: "a".repeat(1201),
    });
    expect(result.success).toBe(false);
  });
});
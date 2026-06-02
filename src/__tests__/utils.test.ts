import { describe, it, expect } from "vitest";
import { formatCurrency, formatFlightFolio, getAmountToPay, addDaysISO, getTodayISO } from "@/lib/utils";

describe("formatCurrency", () => {
    it("formatea número a moneda MXN", () => {
        const result = formatCurrency(1500);
        expect(result).toContain("1");
        expect(result).toContain("500");
    });

    it("maneja cero", () => {
        const result = formatCurrency(0);
        expect(result).toBeTruthy();
    });
});

describe("getAmountToPay", () => {
    it("retorna amount_to_pay si existe", () => {
        const flight = { total_amount: 5000, amount_to_pay: 2500, payment_percentage: 50 };
        expect(getAmountToPay(flight)).toBe(2500);
    });


    it("retorna total si no hay porcentaje ni amount_to_pay", () => {
        const flight = { total_amount: 5000, amount_to_pay: null, payment_percentage: null };
        expect(getAmountToPay(flight)).toBe(5000);
    });
});

describe("formatFlightFolio", () => {
    it("retorna el folio si existe", () => {
        const flight = { flight_folio: "VP-00042" };
        const result = formatFlightFolio(flight);
        expect(result).toBe("VP-00042");
    });

    it("genera folio desde id si flight_folio es null", () => {
        const flight = { flight_folio: null, id: "123e4567-e89b-12d3-a456-426614174000" };
        const result = formatFlightFolio(flight);
        expect(result).toMatch(/^VP-/);
    });

    it("retorna Sin folio si no hay folio ni id", () => {
        const flight = { flight_folio: null, id: null };
        const result = formatFlightFolio(flight);
        expect(result).toBe("Sin folio");
    });
});

describe("addDaysISO", () => {
    it("agrega días a la fecha actual", () => {
        const result = addDaysISO(3);
        expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
});

describe("getTodayISO", () => {
    it("retorna fecha en formato ISO YYYY-MM-DD", () => {
        const result = getTodayISO();
        expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
});
import { NextRequest, NextResponse } from "next/server";
import { hasAmadeusCredentials, searchAirports, searchFlightOffers } from "@/lib/amadeus";
import { mockSearchFlights, mockSearchAirports } from "@/lib/flights-mock";

export const dynamic = "force-dynamic";

type ApiError = {
  message: string;
};

function parsePositiveNumber(value: string | null, fallback: number) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function shouldUseMock() {
  return process.env.FLIGHT_SEARCH_USE_MOCK === "true" || !hasAmadeusCredentials();
}

function errorResponse(error: unknown, status = 500) {
  const message = error instanceof Error ? error.message : "Error desconocido al buscar vuelos.";
  return NextResponse.json({ error: message } satisfies ApiError, { status });
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const mode = searchParams.get("mode");
  const useMock = shouldUseMock();

  if (mode === "airports") {
    const keyword = searchParams.get("keyword") ?? "";
    if (keyword.trim().length < 2) return NextResponse.json({ data: [] });

    try {
      const data = useMock ? mockSearchAirports(keyword) : await searchAirports(keyword);
      return NextResponse.json({ ...data, meta: { source: useMock ? "mock" : "amadeus" } });
    } catch (error) {
      return errorResponse(error);
    }
  }

  const origin = searchParams.get("origin")?.trim().toUpperCase();
  const destination = searchParams.get("destination")?.trim().toUpperCase();
  const departureDate = searchParams.get("departureDate")?.trim();
  const returnDate = searchParams.get("returnDate")?.trim() || undefined;
  const adults = parsePositiveNumber(searchParams.get("adults"), 1);
  const children = parsePositiveNumber(searchParams.get("children"), 0);
  const infants = parsePositiveNumber(searchParams.get("infants"), 0);
  const travelClass = searchParams.get("travelClass") ?? "ANY";
  const nonStop = searchParams.get("nonStop") === "true" ? true : undefined;

  if (!origin || !destination || !departureDate) {
    return NextResponse.json({ error: "Faltan origen, destino o fecha de salida." }, { status: 400 });
  }

  if (origin === destination) {
    return NextResponse.json({ error: "El origen y el destino deben ser diferentes." }, { status: 400 });
  }

  try {
    const data = useMock
      ? mockSearchFlights({ origin, destination, departureDate, returnDate, adults })
      : await searchFlightOffers({
          origin,
          destination,
          departureDate,
          returnDate,
          adults,
          children,
          infants,
          travelClass,
          nonStop,
          currencyCode: "MXN",
          max: 20,
        });

    return NextResponse.json({
      ...data,
      meta: {
        source: useMock ? "mock" : "amadeus",
        environment: process.env.AMADEUS_ENVIRONMENT === "production" ? "production" : "test",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

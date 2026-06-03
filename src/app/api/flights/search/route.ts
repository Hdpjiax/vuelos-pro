import { NextRequest, NextResponse } from "next/server";
import { mockSearchFlights, mockSearchAirports } from "@/lib/flights-mock";
import { hasSkyScrapperCredentials, searchSkyScrapperAirports, searchSkyScrapperFlights } from "@/lib/sky-scrapper";

export const dynamic = "force-dynamic";

type ApiError = {
  error: string;
};

function parsePositiveNumber(value: string | null, fallback: number) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function shouldUseMock() {
  return process.env.FLIGHT_SEARCH_USE_MOCK === "true" || !hasSkyScrapperCredentials();
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

    if (useMock) {
      return NextResponse.json({ ...mockSearchAirports(keyword), meta: { source: "mock" } });
    }

    try {
      const data = await searchSkyScrapperAirports(keyword);
      return NextResponse.json({ ...data, meta: { source: "sky-scrapper" } });
    } catch (error) {
      console.error("Sky Scrapper airport search failed", error);
      return NextResponse.json({
        ...mockSearchAirports(keyword),
        meta: { source: "mock-fallback", reason: "airport-search-failed" },
      });
    }
  }

  const origin = searchParams.get("origin")?.trim().toUpperCase();
  const destination = searchParams.get("destination")?.trim().toUpperCase();
  const originEntityId = searchParams.get("originEntityId")?.trim() || undefined;
  const destinationEntityId = searchParams.get("destinationEntityId")?.trim() || undefined;
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

  if (useMock) {
    return NextResponse.json({
      ...mockSearchFlights({ origin, destination, departureDate, returnDate, adults }),
      meta: { source: "mock", currency: "MXN" },
    });
  }

  try {
    const data = await searchSkyScrapperFlights({
      originSkyId: origin,
      destinationSkyId: destination,
      originEntityId,
      destinationEntityId,
      departureDate,
      returnDate,
      adults,
      children,
      infants,
      travelClass,
      nonStop,
      currency: "MXN",
    });

    return NextResponse.json({
      ...data,
      meta: { source: "sky-scrapper", currency: "MXN" },
    });
  } catch (error) {
    console.error("Sky Scrapper flight search failed", error);

    if (process.env.FLIGHT_SEARCH_ALLOW_FALLBACK !== "false") {
      return NextResponse.json({
        ...mockSearchFlights({ origin, destination, departureDate, returnDate, adults }),
        meta: { source: "mock-fallback", currency: "MXN", reason: "flight-search-failed" },
      });
    }

    return errorResponse(error);
  }
}

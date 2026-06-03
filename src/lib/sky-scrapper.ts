type SkyScrapperFlightSearchParams = {
  originSkyId: string;
  destinationSkyId: string;
  originEntityId?: string;
  destinationEntityId?: string;
  departureDate: string;
  returnDate?: string;
  adults: number;
  children?: number;
  infants?: number;
  travelClass?: string;
  nonStop?: boolean;
  currency?: string;
};

type NormalizedAirport = {
  iataCode: string;
  skyId: string;
  entityId?: string;
  name: string;
  detailedName?: string;
  address: {
    cityName: string;
    countryName?: string;
    countryCode?: string;
  };
};

type NormalizedSegment = {
  departure: { iataCode: string; at: string };
  arrival: { iataCode: string; at: string };
  carrierCode: string;
  number: string;
  duration: string;
};

type NormalizedOffer = {
  id: string;
  price: { total: string; grandTotal: string; currency: string };
  itineraries: { duration: string; segments: NormalizedSegment[] }[];
  numberOfBookableSeats: number;
  travelerPricings: { fareDetailsBySegment: { cabin: string; includedCheckedBags: { quantity: number } }[] }[];
};

const DEFAULT_HOST = "sky-scrapper.p.rapidapi.com";
const DEFAULT_CURRENCY = "MXN";
const DEFAULT_COUNTRY = "MX";
const DEFAULT_MARKET = "es-MX";

function getRapidApiKey() {
  return process.env.RAPIDAPI_KEY || process.env.SKY_SCRAPPER_RAPIDAPI_KEY;
}

export function hasSkyScrapperCredentials() {
  return Boolean(getRapidApiKey());
}

function getHost() {
  return process.env.SKY_SCRAPPER_RAPIDAPI_HOST || DEFAULT_HOST;
}

function getBaseUrl() {
  return `https://${getHost()}`;
}

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === "object" ? (value as Record<string, any>) : {};
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function readNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^0-9.-]/g, ""));
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function toIsoDuration(minutes?: number, fallback?: string) {
  if (fallback?.startsWith("PT")) return fallback;
  if (!minutes || minutes <= 0) return "PT0H00M";
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `PT${hours}H${String(mins).padStart(2, "0")}M`;
}

function extractApiMessage(payload: unknown, status: number) {
  const body = asRecord(payload);
  const errors = Array.isArray(body.errors) ? body.errors : undefined;
  const firstError = errors?.[0] ? asRecord(errors[0]) : undefined;
  const message =
    readString(body.message) ||
    readString(body.error) ||
    readString(body.error_description) ||
    readString(firstError?.message) ||
    readString(firstError?.detail) ||
    readString(firstError?.title);

  return message ? `Sky Scrapper (${status}): ${message}` : `Sky Scrapper (${status}): no se pudo completar la solicitud.`;
}

async function rapidApiGet(path: string, params: URLSearchParams) {
  const key = getRapidApiKey();
  if (!key) throw new Error("Falta RAPIDAPI_KEY en las variables de entorno.");

  const response = await fetch(`${getBaseUrl()}${path}?${params.toString()}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "x-rapidapi-host": getHost(),
      "x-rapidapi-key": key,
    },
    cache: "no-store",
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(extractApiMessage(payload, response.status));

  const body = asRecord(payload);
  if (body.status === false) throw new Error(extractApiMessage(payload, response.status));

  return payload;
}

function normalizeAirport(item: unknown): NormalizedAirport | null {
  const source = asRecord(item);
  const presentation = asRecord(source.presentation);
  const navigation = asRecord(source.navigation);
  const relevant = asRecord(navigation.relevantFlightParams);

  const skyId =
    readString(source.skyId) ||
    readString(relevant.skyId) ||
    readString(source.iataCode) ||
    readString(source.id);

  if (!skyId) return null;

  const entityId =
    readString(source.entityId) ||
    readString(relevant.entityId) ||
    readString(navigation.entityId);

  const title =
    readString(presentation.title) ||
    readString(relevant.localizedName) ||
    readString(source.name) ||
    skyId;

  const suggestionTitle =
    readString(presentation.suggestionTitle) ||
    readString(source.detailedName) ||
    title;

  const subtitle = readString(presentation.subtitle) || readString(source.countryName);

  return {
    iataCode: skyId,
    skyId,
    entityId,
    name: title,
    detailedName: suggestionTitle,
    address: {
      cityName: title,
      countryName: subtitle,
      countryCode: readString(source.countryCode),
    },
  };
}

export async function searchSkyScrapperAirports(keyword: string) {
  if (keyword.trim().length < 2) return { data: [] as NormalizedAirport[] };

  const params = new URLSearchParams({
    query: keyword.trim(),
    locale: process.env.SKY_SCRAPPER_MARKET || DEFAULT_MARKET,
  });

  const payload = await rapidApiGet(
    process.env.SKY_SCRAPPER_AIRPORTS_ENDPOINT || "/api/v1/flights/searchAirport",
    params,
  );

  const body = asRecord(payload);
  const rawItems = Array.isArray(body.data) ? body.data : [];
  const seen = new Set<string>();
  const data = rawItems
    .map(normalizeAirport)
    .filter((item): item is NormalizedAirport => Boolean(item))
    .filter((item) => {
      const key = `${item.skyId}-${item.entityId || ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 10);

  return { data };
}

function extractPlaceCode(place: unknown, fallback?: string) {
  const item = asRecord(place);
  return (
    readString(item.displayCode) ||
    readString(item.skyId) ||
    readString(item.id) ||
    readString(item.iata) ||
    readString(item.iataCode) ||
    fallback ||
    "---"
  );
}

function extractDateTime(value: unknown, fallback?: unknown) {
  if (typeof value === "string") return value;
  const item = asRecord(value);
  return readString(item.at) || readString(item.time) || readString(item.dateTime) || readString(fallback) || new Date().toISOString();
}

function getCarrier(rawSegment: Record<string, any>, rawLeg: Record<string, any>) {
  const carrierFromSegment = asRecord(rawSegment.marketingCarrier || rawSegment.operatingCarrier || rawSegment.carrier);
  const carriersFromLeg = asRecord(rawLeg.carriers);
  const marketing = Array.isArray(carriersFromLeg.marketing) ? asRecord(carriersFromLeg.marketing[0]) : {};
  const carrier = Object.keys(carrierFromSegment).length ? carrierFromSegment : marketing;

  const code =
    readString(carrier.alternateId) ||
    readString(carrier.displayCode) ||
    readString(carrier.code) ||
    readString(rawSegment.carrierCode) ||
    readString(carrier.id) ||
    "XX";

  const name = readString(carrier.name) || code;
  return { code, name };
}

function normalizeSegment(rawSegmentValue: unknown, rawLegValue: unknown, carriers: Record<string, string>): NormalizedSegment {
  const rawSegment = asRecord(rawSegmentValue);
  const rawLeg = asRecord(rawLegValue);
  const carrier = getCarrier(rawSegment, rawLeg);
  carriers[carrier.code] = carrier.name;

  const origin = rawSegment.origin || rawSegment.departureAirport || rawLeg.origin;
  const destination = rawSegment.destination || rawSegment.arrivalAirport || rawLeg.destination;
  const departureAt = extractDateTime(rawSegment.departure || rawSegment.departureTime, rawLeg.departure);
  const arrivalAt = extractDateTime(rawSegment.arrival || rawSegment.arrivalTime, rawLeg.arrival);
  const durationMinutes = readNumber(rawSegment.durationInMinutes) || readNumber(rawSegment.duration) || readNumber(rawLeg.durationInMinutes);

  return {
    departure: { iataCode: extractPlaceCode(origin), at: departureAt },
    arrival: { iataCode: extractPlaceCode(destination), at: arrivalAt },
    carrierCode: carrier.code,
    number: readString(rawSegment.flightNumber) || readString(rawSegment.number) || "",
    duration: toIsoDuration(durationMinutes, readString(rawSegment.duration)),
  };
}

function normalizeLeg(rawLegValue: unknown, carriers: Record<string, string>) {
  const rawLeg = asRecord(rawLegValue);
  const rawSegments = Array.isArray(rawLeg.segments) && rawLeg.segments.length ? rawLeg.segments : [rawLeg];
  const segments = rawSegments.map((segment) => normalizeSegment(segment, rawLeg, carriers));
  const durationMinutes = readNumber(rawLeg.durationInMinutes) || segments.length * 90;
  return {
    duration: toIsoDuration(durationMinutes, readString(rawLeg.duration)),
    segments,
  };
}

function getPrice(rawOffer: Record<string, any>, currency: string) {
  const price = asRecord(rawOffer.price);
  const amount =
    readNumber(price.raw) ||
    readNumber(price.amount) ||
    readNumber(price.total) ||
    readNumber(price.grandTotal) ||
    readNumber(rawOffer.price) ||
    0;

  return amount.toFixed(2);
}

function normalizeFlightResponse(payload: unknown, params: SkyScrapperFlightSearchParams) {
  const body = asRecord(payload);
  const dataObject = asRecord(body.data);
  const rawOffers = Array.isArray(dataObject.itineraries)
    ? dataObject.itineraries
    : Array.isArray(body.itineraries)
      ? body.itineraries
      : Array.isArray(body.data)
        ? body.data
        : [];

  const carriers: Record<string, string> = {};
  const cabin = params.travelClass && params.travelClass !== "ANY" ? params.travelClass : "ECONOMY";
  const passengerCount = Math.max(1, params.adults + (params.children || 0) + (params.infants || 0));
  const currency = params.currency || DEFAULT_CURRENCY;

  const offers: NormalizedOffer[] = rawOffers.map((rawOfferValue, index) => {
    const rawOffer = asRecord(rawOfferValue);
    const rawLegs = Array.isArray(rawOffer.legs)
      ? rawOffer.legs
      : Array.isArray(rawOffer.itineraries)
        ? rawOffer.itineraries
        : [rawOffer];
    const itineraries = rawLegs.map((leg) => normalizeLeg(leg, carriers));
    const allSegments = itineraries.flatMap((itinerary) => itinerary.segments);
    const grandTotal = getPrice(rawOffer, currency);

    return {
      id: readString(rawOffer.id) || `sky-${index}`,
      price: { total: grandTotal, grandTotal, currency },
      itineraries,
      numberOfBookableSeats: readNumber(rawOffer.numberOfBookableSeats) || 9,
      travelerPricings: Array.from({ length: passengerCount }, () => ({
        fareDetailsBySegment: allSegments.map(() => ({ cabin, includedCheckedBags: { quantity: 0 } })),
      })),
    };
  });

  return { data: offers, dictionaries: { carriers } };
}

function mapCabinClass(value?: string) {
  const cabin = value || "ANY";
  if (cabin === "ANY") return "economy";
  return cabin.toLowerCase();
}

export async function searchSkyScrapperFlights(input: SkyScrapperFlightSearchParams) {
  const currency = (input.currency || process.env.FLIGHT_SEARCH_DEFAULT_CURRENCY || DEFAULT_CURRENCY).toUpperCase();
  const countryCode = process.env.SKY_SCRAPPER_COUNTRY_CODE || DEFAULT_COUNTRY;
  const market = process.env.SKY_SCRAPPER_MARKET || DEFAULT_MARKET;

  const params = new URLSearchParams({
    originSkyId: input.originSkyId.toUpperCase(),
    destinationSkyId: input.destinationSkyId.toUpperCase(),
    date: input.departureDate,
    travelDate: input.departureDate,
    adults: String(Math.max(1, input.adults)),
    cabinClass: mapCabinClass(input.travelClass),
    sortBy: "best",
    currency,
    market,
    countryCode,
    CountryId: countryCode,
    oneWay: String(!input.returnDate),
  });

  if (input.originEntityId) params.set("originEntityId", input.originEntityId);
  if (input.destinationEntityId) params.set("destinationEntityId", input.destinationEntityId);
  if (input.returnDate) params.set("returnDate", input.returnDate);
  if (input.children && input.children > 0) params.set("children", String(input.children));
  if (input.infants && input.infants > 0) params.set("infants", String(input.infants));
  if (input.nonStop) {
    params.set("nonStop", "true");
    params.set("stops", "direct");
  }

  const payload = await rapidApiGet(
    process.env.SKY_SCRAPPER_FLIGHTS_ENDPOINT || "/api/v2/flights/searchFlights",
    params,
  );

  return normalizeFlightResponse(payload, { ...input, currency });
}

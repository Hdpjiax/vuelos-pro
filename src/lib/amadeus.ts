type AmadeusEnvironment = "test" | "production";

type AmadeusTokenResponse = {
  access_token: string;
  expires_in: number;
  token_type: string;
};

export type AmadeusAirport = {
  id?: string;
  type?: string;
  subType?: string;
  name: string;
  detailedName?: string;
  iataCode: string;
  address?: {
    cityName?: string;
    cityCode?: string;
    countryName?: string;
    countryCode?: string;
    regionCode?: string;
  };
};

export type FlightSearchParams = {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  adults: number;
  children?: number;
  infants?: number;
  travelClass?: string;
  currencyCode?: string;
  nonStop?: boolean;
  max?: number;
};

const BASE_URLS: Record<AmadeusEnvironment, string> = {
  test: "https://test.api.amadeus.com",
  production: "https://api.amadeus.com",
};

let cachedToken: { accessToken: string; expiresAt: number } | null = null;

function getEnvironment(): AmadeusEnvironment {
  return process.env.AMADEUS_ENVIRONMENT === "production" ? "production" : "test";
}

function getBaseUrl() {
  return BASE_URLS[getEnvironment()];
}

function getCredentials() {
  return {
    clientId: process.env.AMADEUS_CLIENT_ID,
    clientSecret: process.env.AMADEUS_CLIENT_SECRET,
  };
}

export function hasAmadeusCredentials() {
  const { clientId, clientSecret } = getCredentials();
  return Boolean(clientId && clientSecret);
}

function extractAmadeusError(payload: unknown, status: number) {
  if (payload && typeof payload === "object" && "errors" in payload) {
    const errors = (payload as { errors?: Array<{ title?: string; detail?: string; code?: string }> }).errors;
    const first = errors?.[0];
    if (first?.detail || first?.title) {
      return `Amadeus (${status}): ${first.detail ?? first.title}`;
    }
    if (first?.code) return `Amadeus (${status}): error ${first.code}`;
  }

  if (payload && typeof payload === "object" && "error_description" in payload) {
    const description = (payload as { error_description?: string }).error_description;
    if (description) return `Amadeus (${status}): ${description}`;
  }

  return `Amadeus (${status}): no se pudo completar la solicitud.`;
}

async function getAccessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.accessToken;
  }

  const { clientId, clientSecret } = getCredentials();
  if (!clientId || !clientSecret) {
    throw new Error("Faltan AMADEUS_CLIENT_ID y AMADEUS_CLIENT_SECRET en las variables de entorno.");
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
  });

  const response = await fetch(`${getBaseUrl()}/v1/security/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as AmadeusTokenResponse | null;

  if (!response.ok || !payload?.access_token) {
    throw new Error(extractAmadeusError(payload, response.status));
  }

  cachedToken = {
    accessToken: payload.access_token,
    expiresAt: Date.now() + Math.max(payload.expires_in - 60, 60) * 1000,
  };

  return cachedToken.accessToken;
}

async function amadeusGet<T>(path: string) {
  const token = await getAccessToken();
  const response = await fetch(`${getBaseUrl()}${path}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as T | null;

  if (!response.ok || !payload) {
    throw new Error(extractAmadeusError(payload, response.status));
  }

  return payload;
}

export async function searchAirports(keyword: string) {
  if (keyword.trim().length < 2) return { data: [] as AmadeusAirport[] };

  const params = new URLSearchParams({
    subType: "CITY,AIRPORT",
    keyword: keyword.trim(),
    view: "LIGHT",
  });
  params.set("page[limit]", "10");

  return amadeusGet<{ data: AmadeusAirport[] }>(`/v1/reference-data/locations?${params.toString()}`);
}

export async function searchFlightOffers(input: FlightSearchParams) {
  const params = new URLSearchParams({
    originLocationCode: input.origin.toUpperCase(),
    destinationLocationCode: input.destination.toUpperCase(),
    departureDate: input.departureDate,
    adults: String(Math.max(1, input.adults)),
    currencyCode: input.currencyCode || "MXN",
    max: String(Math.min(Math.max(input.max ?? 20, 1), 50)),
  });

  if (input.returnDate) params.set("returnDate", input.returnDate);
  if (input.children && input.children > 0) params.set("children", String(input.children));
  if (input.infants && input.infants > 0) params.set("infants", String(input.infants));
  if (input.travelClass && input.travelClass !== "ANY") params.set("travelClass", input.travelClass);
  if (typeof input.nonStop === "boolean") params.set("nonStop", String(input.nonStop));

  return amadeusGet(`/v2/shopping/flight-offers?${params.toString()}`);
}

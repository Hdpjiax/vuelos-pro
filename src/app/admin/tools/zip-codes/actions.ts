"use server";

export interface ZillowProperty {
  zpid: string;
  address: string;
  price: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  livingArea: number | null;
  imgSrc: string | null;
  detailUrl: string;
  zestimate: number | null;
  propertyType: string | null;
  daysOnZillow: number | null;
}

type ZillowResult = {
  forSale: ZillowProperty[];
  forRent: ZillowProperty[];
  totalForSale: number;
  totalForRent: number;
  error?: string;
};

const RAPID_HOST = "zillow-scraper-api.p.rapidapi.com";
const ENDPOINT   = "zillow/search/by-zipcode";

function buildAddress(p: any): string {
  return [
    p.address ?? p.streetAddress ?? "",
    p.city ?? "",
    p.state ?? "",
    p.zipcode ?? p.zip ?? "",
  ].filter(Boolean).join(", ") || "Sin direcci\u00f3n";
}

/** Busca recursivamente la primera clave cuyo valor sea un array no vac\u00edo */
function extractList(d: any): any[] {
  if (!d) return [];
  if (Array.isArray(d)) return d;

  // Claves conocidas primero
  const knownKeys = [
    "results", "listings", "properties", "data", "homes",
    "list", "items", "records", "searchResults", "propertyList",
  ];
  for (const k of knownKeys) {
    if (Array.isArray(d[k])) return d[k];
  }

  // Buscar cualquier clave que sea array
  for (const k of Object.keys(d)) {
    if (Array.isArray(d[k]) && d[k].length > 0) return d[k];
  }

  return [];
}

function parseProps(raw: any): ZillowProperty[] {
  const list = extractList(raw);
  return list.map((p: any) => ({
    zpid:         String(p.zpid ?? p.id ?? Math.random()),
    address:      buildAddress(p),
    price:        p.price ?? p.list_price ?? p.unformattedPrice ?? null,
    bedrooms:     p.bedrooms ?? p.beds ?? null,
    bathrooms:    p.bathrooms ?? p.baths ?? null,
    livingArea:   p.livingArea ?? p.sqft ?? p.area ?? null,
    imgSrc:       p.imgSrc ?? p.image_url ?? p.miniCardPhotos?.[0]?.url ?? null,
    detailUrl: (() => {
      const u = p.detailUrl ?? p.listing_url ?? p.url ?? "";
      if (!u) return `https://www.zillow.com/homes/${p.zpid ?? p.id}_zpid/`;
      return u.startsWith("http") ? u : `https://www.zillow.com${u}`;
    })(),
    zestimate:    p.zestimate ?? null,
    propertyType: p.propertyType ?? p.homeType ?? p.home_type ?? null,
    daysOnZillow: p.daysOnZillow ?? p.days_on_market ?? null,
  }));
}

async function fetchZillow(params: Record<string, string>): Promise<any> {
  const url = new URL(`https://${RAPID_HOST}/${ENDPOINT}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  try {
    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type":    "application/json",
        "x-rapidapi-host": RAPID_HOST,
        "x-rapidapi-key":  process.env.RAPIDAPI_KEY ?? "",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[Zillow] ${res.status} ${res.statusText} \u2192 ${ENDPOINT}`, body.slice(0, 300));
      return null;
    }

    const json = await res.json();
    // LOG completo para ver la estructura real de la respuesta
    console.log("[Zillow raw response]", JSON.stringify(json).slice(0, 500));
    return json;
  } catch (e) {
    console.error("[Zillow] fetch error:", e);
    return null;
  }
}

export async function searchZipCodeAction(zip: string): Promise<ZillowResult> {
  if (!zip.match(/^\d{5}$/)) {
    return { forSale: [], forRent: [], totalForSale: 0, totalForRent: 0,
      error: "ZIP code inv\u00e1lido (debe ser 5 d\u00edgitos)." };
  }

  if (!process.env.RAPIDAPI_KEY) {
    return { forSale: [], forRent: [], totalForSale: 0, totalForRent: 0,
      error: "RAPIDAPI_KEY no configurada en .env.local" };
  }

  const [saleData, rentData] = await Promise.all([
    fetchZillow({ zipcode: zip, listing_type: "for_sale", sort: "newest", page: "1" }),
    fetchZillow({ zipcode: zip, listing_type: "for_rent", sort: "newest", page: "1" }),
  ]);

  if (!saleData && !rentData) {
    return { forSale: [], forRent: [], totalForSale: 0, totalForRent: 0,
      error: "No se pudo conectar. Verifica tu RAPIDAPI_KEY y suscripci\u00f3n." };
  }

  const saleProps = parseProps(saleData);
  const rentProps = parseProps(rentData);

  const countFrom = (d: any) =>
    d?.total_count ?? d?.totalResultCount ?? d?.total ?? d?.count ?? 0;

  return {
    forSale:      saleProps,
    forRent:      rentProps,
    totalForSale: countFrom(saleData) || saleProps.length,
    totalForRent: countFrom(rentData) || rentProps.length,
  };
}

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
  ].filter(Boolean).join(", ") || "Sin dirección";
}

function parseProps(raw: any[]): ZillowProperty[] {
  return (raw ?? []).map((p: any) => ({
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
        "Content-Type":   "application/json",
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
    return res.json();
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

  const commonParams = { zipcode: zip, page: "1" };

  const [saleData, rentData] = await Promise.all([
    fetchZillow({ ...commonParams, listing_type: "for_sale", sort: "newest" }),
    fetchZillow({ ...commonParams, listing_type: "for_rent", sort: "newest" }),
  ]);

  // Log para debugging — muestra qué llaves devuelve la API
  console.log("[Zillow sale keys]", saleData ? Object.keys(saleData) : "null");
  console.log("[Zillow rent keys]", rentData ? Object.keys(rentData) : "null");

  if (!saleData && !rentData) {
    return { forSale: [], forRent: [], totalForSale: 0, totalForRent: 0,
      error: "No se pudo conectar. Verifica tu RAPIDAPI_KEY y suscripci\u00f3n a Zillow Scraper (PullAPI) en RapidAPI." };
  }

  const extractList = (d: any): any[] =>
    d?.results ?? d?.listings ?? d?.properties ?? d?.data ?? d?.homes ??
    (Array.isArray(d) ? d : []);

  const saleProps = parseProps(extractList(saleData));
  const rentProps = parseProps(extractList(rentData));

  return {
    forSale:      saleProps,
    forRent:      rentProps,
    totalForSale: saleData?.total_count ?? saleData?.totalResultCount ?? saleData?.total ?? saleProps.length,
    totalForRent: rentData?.total_count ?? rentData?.totalResultCount ?? rentData?.total ?? rentProps.length,
  };
}

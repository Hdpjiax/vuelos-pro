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

function buildAddress(p: any): string {
  const parts = [
    p.address ?? p.streetAddress ?? "",
    p.city ?? "",
    p.state ?? "",
    p.zipcode ?? p.zip ?? "",
  ].filter(Boolean);
  return parts.join(", ") || "Sin dirección";
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
    detailUrl:    p.detailUrl ?? p.listing_url ?? p.url
      ? ((p.detailUrl ?? p.listing_url ?? p.url).startsWith("http")
          ? (p.detailUrl ?? p.listing_url ?? p.url)
          : `https://www.zillow.com${p.detailUrl ?? p.listing_url ?? p.url}`)
      : `https://www.zillow.com/homes/${p.zpid ?? p.id}_zpid/`,
    zestimate:    p.zestimate ?? null,
    propertyType: p.propertyType ?? p.homeType ?? p.home_type ?? null,
    daysOnZillow: p.daysOnZillow ?? p.days_on_market ?? null,
  }));
}

async function fetchZillow(endpoint: string, params: Record<string, string>): Promise<any> {
  const url = new URL(`https://${RAPID_HOST}/${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  try {
    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "x-rapidapi-host": RAPID_HOST,
        "x-rapidapi-key":  process.env.RAPIDAPI_KEY ?? "",
        "Accept":          "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[Zillow] ${res.status} ${res.statusText} \u2192 ${endpoint}`, body.slice(0, 200));
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

  // PullAPI zillow-scraper usa /search/by-zip-code con listing_type
  const [saleData, rentData] = await Promise.all([
    fetchZillow("search/by-zip-code", {
      zip_code:     zip,
      listing_type: "for_sale",
      sort:         "price_high_to_low",
    }),
    fetchZillow("search/by-zip-code", {
      zip_code:     zip,
      listing_type: "for_rent",
      sort:         "price_high_to_low",
    }),
  ]);

  console.log("[Zillow sale raw keys]", saleData ? Object.keys(saleData) : "null");
  console.log("[Zillow rent raw keys]", rentData ? Object.keys(rentData) : "null");

  if (!saleData && !rentData) {
    return { forSale: [], forRent: [], totalForSale: 0, totalForRent: 0,
      error: "No se pudo conectar. Verifica tu RAPIDAPI_KEY y suscripci\u00f3n a Zillow Scraper (PullAPI) en RapidAPI." };
  }

  // La respuesta puede venir como { results: [] } o { listings: [] } o { properties: [] } o array directo
  const extractList = (d: any): any[] =>
    d?.results ?? d?.listings ?? d?.properties ?? d?.data ?? (Array.isArray(d) ? d : []);

  const saleProps = parseProps(extractList(saleData));
  const rentProps = parseProps(extractList(rentData));

  return {
    forSale:      saleProps,
    forRent:      rentProps,
    totalForSale: saleData?.total_count ?? saleData?.totalResultCount ?? saleProps.length,
    totalForRent: rentData?.total_count ?? rentData?.totalResultCount ?? rentProps.length,
  };
}

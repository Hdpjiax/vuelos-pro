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

function parseProps(data: any): ZillowProperty[] {
  // Estructura real: { success, data: { total_results, listings: [...] } }
  const list: any[] = data?.data?.listings ?? [];
  return list.map((p: any) => ({
    zpid:         String(p.zpid ?? ""),
    address:      p.address ?? "Sin direcci\u00f3n",
    price:        p.price ?? null,
    bedrooms:     p.bedrooms ?? null,
    bathrooms:    p.bathrooms ?? null,
    livingArea:   p.living_area_sqft ?? null,
    imgSrc:       p.image_url ?? null,
    detailUrl: (() => {
      const u = p.detail_url ?? p.detailUrl ?? "";
      if (!u) return `https://www.zillow.com/homes/${p.zpid}_zpid/`;
      return u.startsWith("http") ? u : `https://www.zillow.com${u}`;
    })(),
    zestimate:    p.zestimate ?? null,
    propertyType: p.home_type ?? p.homeType ?? null,
    daysOnZillow: p.days_on_zillow ?? null,
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
      console.error(`[Zillow] ${res.status} ${res.statusText}`, body.slice(0, 200));
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

  const [saleData, rentData] = await Promise.all([
    fetchZillow({ zipcode: zip, listing_type: "for_sale", sort: "newest", page: "1" }),
    fetchZillow({ zipcode: zip, listing_type: "for_rent", sort: "newest", page: "1" }),
  ]);

  if (!saleData && !rentData) {
    return { forSale: [], forRent: [], totalForSale: 0, totalForRent: 0,
      error: "No se pudo conectar. Verifica tu RAPIDAPI_KEY." };
  }

  const saleProps = parseProps(saleData);
  const rentProps = parseProps(rentData);

  return {
    forSale:      saleProps,
    forRent:      rentProps,
    totalForSale: saleData?.data?.total_results ?? saleProps.length,
    totalForRent: rentData?.data?.total_results ?? rentProps.length,
  };
}

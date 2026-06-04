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

const RAPID_HOST = "zillow-com1.p.rapidapi.com";

function parseProps(raw: any[]): ZillowProperty[] {
  return (raw ?? []).map((p: any) => ({
    zpid:         String(p.zpid ?? p.id ?? ""),
    address:      [
      p.streetAddress ?? p.address ?? "",
      p.city ?? "",
      p.state ?? "",
      p.zipcode ?? "",
    ].filter(Boolean).join(", "),
    price:        p.price ?? p.unformattedPrice ?? null,
    bedrooms:     p.bedrooms ?? p.beds ?? null,
    bathrooms:    p.bathrooms ?? p.baths ?? null,
    livingArea:   p.livingArea ?? p.area ?? null,
    imgSrc:       p.imgSrc ?? p.miniCardPhotos?.[0]?.url ?? null,
    detailUrl:    p.detailUrl
      ? (p.detailUrl.startsWith("http") ? p.detailUrl : `https://www.zillow.com${p.detailUrl}`)
      : `https://www.zillow.com/homes/${p.zpid ?? p.id}_zpid/`,
    zestimate:    p.zestimate ?? null,
    propertyType: p.propertyType ?? p.homeType ?? null,
    daysOnZillow: p.daysOnZillow ?? null,
  }));
}

async function fetchZillow(
  endpoint: string,
  params: Record<string, string>
): Promise<any> {
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
      console.error(`[Zillow] ${res.status} ${res.statusText} \u2192 ${url.toString()}`);
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
    return { forSale: [], forRent: [], totalForSale: 0, totalForRent: 0, error: "ZIP code inv\u00e1lido (debe ser 5 d\u00edgitos)." };
  }

  if (!process.env.RAPIDAPI_KEY) {
    return {
      forSale: [], forRent: [], totalForSale: 0, totalForRent: 0,
      error: "RAPIDAPI_KEY no configurada. Agg\u00e9gala en tu .env.local",
    };
  }

  const [saleData, rentData] = await Promise.all([
    fetchZillow("propertyExtendedSearch", {
      location:    zip,
      status_type: "ForSale",
      home_type:   "Houses,Apartments,Condos,Townhomes,MultiFamily,Manufactured",
      sort:        "Price_High_Low",
    }),
    fetchZillow("propertyExtendedSearch", {
      location:    zip,
      status_type: "ForRent",
      home_type:   "Houses,Apartments,Condos,Townhomes,MultiFamily,Manufactured",
      sort:        "Price_High_Low",
    }),
  ]);

  if (!saleData && !rentData) {
    return {
      forSale: [], forRent: [], totalForSale: 0, totalForRent: 0,
      error: "No se pudo conectar con Zillow API. Verifica tu RAPIDAPI_KEY y que est\u00e9s suscrito a \u2018Zillow\u2019 (zillow-com1) en RapidAPI.",
    };
  }

  const saleProps = parseProps(saleData?.props ?? []);
  const rentProps = parseProps(rentData?.props ?? []);

  return {
    forSale:      saleProps,
    forRent:      rentProps,
    totalForSale: saleData?.totalResultCount ?? saleProps.length,
    totalForRent: rentData?.totalResultCount ?? rentProps.length,
  };
}

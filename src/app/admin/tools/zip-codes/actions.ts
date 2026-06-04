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
  lotAreaValue?: number | null;
  lotAreaUnit?: string | null;
}

type ZillowResult = {
  forSale: ZillowProperty[];
  forRent: ZillowProperty[];
  totalForSale: number;
  totalForRent: number;
  error?: string;
};

function parseProps(raw: any[]): ZillowProperty[] {
  return (raw ?? []).map((p: any) => ({
    zpid:         String(p.zpid ?? p.id ?? ""),
    address:      p.address ?? p.streetAddress ?? "",
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
    lotAreaValue: p.lotAreaValue ?? null,
    lotAreaUnit:  p.lotAreaUnit ?? null,
  }));
}

async function fetchZillow(
  endpoint: string,
  params: Record<string, string>
): Promise<any> {
  // Intentamos con el host correcto del scraper de PullAPI
  const host = "zillow-scraper-api.p.rapidapi.com";
  const url  = new URL(`https://${host}/${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  try {
    const res = await fetch(url.toString(), {
      method:  "GET",
      headers: {
        "x-rapidapi-host": host,
        "x-rapidapi-key":  process.env.RAPIDAPI_KEY ?? "",
        "Accept":          "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      console.error(`[Zillow] ${res.status} ${res.statusText} → ${url.toString()}`);
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
    return { forSale: [], forRent: [], totalForSale: 0, totalForRent: 0, error: "ZIP code inválido (debe ser 5 dígitos)." };
  }

  if (!process.env.RAPIDAPI_KEY) {
    return { forSale: [], forRent: [], totalForSale: 0, totalForRent: 0, error: "RAPIDAPI_KEY no configurada en variables de entorno." };
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

  const saleProps = parseProps(
    saleData?.props ?? saleData?.results ?? saleData?.listings ?? saleData?.data ?? []
  );
  const rentProps = parseProps(
    rentData?.props ?? rentData?.results ?? rentData?.listings ?? rentData?.data ?? []
  );

  if (!saleData && !rentData) {
    return {
      forSale: [], forRent: [], totalForSale: 0, totalForRent: 0,
      error: "No se pudo conectar con Zillow API. Verifica tu RAPIDAPI_KEY y que estés suscrito a 'Zillow Scraper' en RapidAPI.",
    };
  }

  return {
    forSale:      saleProps,
    forRent:      rentProps,
    totalForSale: saleData?.totalResultCount ?? saleProps.length,
    totalForRent: rentData?.totalResultCount ?? rentProps.length,
  };
}

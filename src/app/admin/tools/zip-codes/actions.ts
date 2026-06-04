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
  const url = new URL(`https://zillow-scraper-api.p.rapidapi.com/${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "x-rapidapi-host": "zillow-scraper-api.p.rapidapi.com",
      "x-rapidapi-key":  process.env.RAPIDAPI_KEY ?? "",
    },
    next: { revalidate: 0 },
  });

  if (!res.ok) return null;
  return res.json();
}

export async function searchZipCodeAction(zip: string): Promise<ZillowResult> {
  if (!zip.match(/^\d{5}$/)) {
    return { forSale: [], forRent: [], totalForSale: 0, totalForRent: 0, error: "ZIP code inválido (debe ser 5 dígitos)." };
  }

  const [saleData, rentData] = await Promise.all([
    fetchZillow("propertyExtendedSearch", {
      location:     zip,
      status_type:  "ForSale",
      home_type:    "Houses,Apartments,Condos,Townhomes,MultiFamily,Manufactured",
      sort:         "Price_High_Low",
    }),
    fetchZillow("propertyExtendedSearch", {
      location:     zip,
      status_type:  "ForRent",
      home_type:    "Houses,Apartments,Condos,Townhomes,MultiFamily,Manufactured",
      sort:         "Price_High_Low",
    }),
  ]);

  const saleProps  = parseProps(saleData?.props ?? saleData?.results ?? saleData?.listings ?? []);
  const rentProps  = parseProps(rentData?.props ?? rentData?.results ?? rentData?.listings ?? []);

  return {
    forSale:      saleProps,
    forRent:      rentProps,
    totalForSale: saleData?.totalResultCount ?? saleProps.length,
    totalForRent: rentData?.totalResultCount ?? rentProps.length,
  };
}

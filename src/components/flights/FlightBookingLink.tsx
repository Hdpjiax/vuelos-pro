"use client";

import { ExternalLink } from "lucide-react";

type Segment = {
  departure: { iataCode: string; at: string };
  arrival: { iataCode: string; at: string };
};

type FlightOfferForLink = {
  bookingUrl?: string;
  itineraries: { segments: Segment[] }[];
};

type SearchSummaryForLink = {
  originLabel: string;
  destinationLabel: string;
  adults: number;
  children?: number;
  infants?: number;
  departureDate: string;
  returnDate?: string;
  travelClass?: string;
  nonStop?: boolean;
} | null;

type Props = {
  offer: FlightOfferForLink;
  searchSummary?: SearchSummaryForLink;
};

function normalizeExternalUrl(url?: string) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("//")) return `https:${url}`;
  return "";
}

function buildFallbackUrl(offer: FlightOfferForLink, searchSummary?: SearchSummaryForLink) {
  const outbound = offer.itineraries[0];
  const first = outbound?.segments?.[0];
  const last = outbound?.segments?.[outbound.segments.length - 1];
  const origin = first?.departure?.iataCode || searchSummary?.originLabel?.split("—")?.[0]?.trim() || "";
  const destination = last?.arrival?.iataCode || searchSummary?.destinationLabel?.split("—")?.[0]?.trim() || "";
  const adults = searchSummary?.adults ?? 1;
  const children = searchSummary?.children ?? 0;
  const infants = searchSummary?.infants ?? 0;
  const passengerText = [
    `${adults} adulto${adults > 1 ? "s" : ""}`,
    children > 0 ? `${children} niño${children > 1 ? "s" : ""}` : "",
    infants > 0 ? `${infants} bebé${infants > 1 ? "s" : ""}` : "",
  ].filter(Boolean).join(" ");
  const dateText = searchSummary?.returnDate
    ? `${searchSummary.departureDate} regreso ${searchSummary.returnDate}`
    : searchSummary?.departureDate ?? "";
  const extras = [
    searchSummary?.travelClass && searchSummary.travelClass !== "ANY" ? searchSummary.travelClass : "",
    searchSummary?.nonStop ? "directo" : "",
  ].filter(Boolean).join(" ");
  const query = `vuelos ${origin} a ${destination} ${dateText} ${passengerText} ${extras}`.replace(/\s+/g, " ").trim();

  return `https://www.google.com/travel/flights?q=${encodeURIComponent(query)}`;
}

export function FlightBookingLink({ offer, searchSummary }: Props) {
  const url = normalizeExternalUrl(offer.bookingUrl) || buildFallbackUrl(offer, searchSummary);

  return (
    <>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-sky-100 transition hover:bg-sky-700 active:scale-[0.98]"
      >
        <ExternalLink size={15} />
        Ver y reservar
      </a>
      <p className="mt-2 text-center text-[10px] font-semibold text-slate-400">
        Abre ruta, fechas y pasajeros en el sitio externo.
      </p>
    </>
  );
}

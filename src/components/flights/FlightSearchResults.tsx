"use client";

import { Plane, Clock, Users, AlertCircle, Zap, Luggage, Info, Route } from "lucide-react";
import { FlightBookingLink } from "@/components/flights/FlightBookingLink";

type Segment = {
  departure: { iataCode: string; at: string };
  arrival: { iataCode: string; at: string };
  carrierCode: string;
  number: string;
  duration: string;
};

type Itinerary = { duration: string; segments: Segment[] };

type FlightOffer = {
  id: string;
  bookingUrl?: string;
  price: { total: string; currency: string; grandTotal: string };
  itineraries: Itinerary[];
  numberOfBookableSeats: number;
  travelerPricings: { fareDetailsBySegment: { cabin: string; includedCheckedBags?: { quantity?: number } }[] }[];
};

type Props = {
  data: {
    data: FlightOffer[];
    dictionaries?: { carriers?: Record<string, string> };
    meta?: { source?: string; environment?: string; currency?: string; reason?: string };
  } | null;
  error?: string;
  searchSummary?: {
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
};

function parseDuration(d: string) {
  const h = d.match(/(\d+)H/)?.[1] ?? "0";
  const m = d.match(/(\d+)M/)?.[1] ?? "0";
  return `${h}h ${m.padStart(2, "0")}m`;
}

function formatTime(dt: string) {
  return new Date(dt).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(dt: string) {
  return new Date(dt).toLocaleDateString("es-MX", { day: "2-digit", month: "short" });
}

function formatPrice(amount: string, currency: string) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency, maximumFractionDigits: 0 }).format(Number(amount));
}

const CABIN_LABEL: Record<string, string> = {
  ECONOMY: "Económica",
  PREMIUM_ECONOMY: "Premium Eco",
  BUSINESS: "Business",
  FIRST: "Primera clase",
};
const CABIN_COLOR: Record<string, string> = {
  ECONOMY: "bg-slate-100 text-slate-600",
  PREMIUM_ECONOMY: "bg-amber-100 text-amber-700",
  BUSINESS: "bg-sky-100 text-sky-700",
  FIRST: "bg-violet-100 text-violet-700",
};

export function FlightSearchResults({ data, error, searchSummary }: Props) {
  if (error) {
    return (
      <div className="mt-6 flex items-start gap-3 rounded-3xl border border-rose-200 bg-rose-50 p-5">
        <AlertCircle size={20} className="mt-0.5 shrink-0 text-rose-500" />
        <div>
          <p className="font-black text-rose-700">No se pudo completar la búsqueda</p>
          <p className="mt-1 text-sm text-rose-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  if (!data.data?.length) {
    return (
      <div className="mt-6 rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-8 py-12 text-center">
        <Plane size={32} className="mx-auto mb-3 text-slate-300" />
        <p className="font-black text-slate-600">Sin resultados</p>
        <p className="mt-1 text-sm text-slate-400">No encontramos vuelos para esa ruta y fecha.</p>
      </div>
    );
  }

  const carriers = data.dictionaries?.carriers ?? {};
  const isMock = data.meta?.source === "mock" || data.meta?.source === "mock-fallback";
  const totalPassengers = (searchSummary?.adults ?? 0) + (searchSummary?.children ?? 0) + (searchSummary?.infants ?? 0);

  return (
    <div className="space-y-4">
      {isMock && (
        <div className="flex items-start gap-3 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
          <Info size={18} className="mt-0.5 shrink-0" />
          <p className="text-sm font-bold">
            Modo demostración o respaldo activo. Revisa RAPIDAPI_KEY para mostrar cotizaciones reales de Sky Scrapper.
          </p>
        </div>
      )}

      {searchSummary && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-sky-50 px-4 py-3">
          <Plane size={15} className="shrink-0 text-sky-600" />
          <p className="text-sm font-black text-sky-800">{searchSummary.originLabel} → {searchSummary.destinationLabel}</p>
          <span className="text-sky-400">·</span>
          <p className="text-sm text-sky-700">{totalPassengers || searchSummary.adults} pasajero{(totalPassengers || searchSummary.adults) > 1 ? "s" : ""}</p>
          <span className="text-sky-400">·</span>
          <p className="text-sm text-sky-700">{new Date(searchSummary.departureDate + "T12:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" })}</p>
          {searchSummary.returnDate && (
            <><span className="text-sky-400">→</span><p className="text-sm text-sky-700">{new Date(searchSummary.returnDate + "T12:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" })}</p></>
          )}
          {searchSummary.nonStop && <span className="flex items-center gap-1 rounded-xl bg-emerald-100 px-2.5 py-0.5 text-xs font-black text-emerald-700"><Route size={11} />Directo</span>}
          {searchSummary.travelClass && searchSummary.travelClass !== "ANY" && <span className="rounded-xl bg-white px-2.5 py-0.5 text-xs font-black text-sky-700">{CABIN_LABEL[searchSummary.travelClass] ?? searchSummary.travelClass}</span>}
          <span className="ml-auto rounded-xl bg-sky-100 px-2.5 py-0.5 text-xs font-black text-sky-700">{data.data.length} opciones</span>
        </div>
      )}

      {data.data.map((offer) => {
        const outbound = offer.itineraries[0];
        const inbound = offer.itineraries[1];
        const cabin = offer.travelerPricings?.[0]?.fareDetailsBySegment?.[0]?.cabin ?? "ECONOMY";
        const bags = offer.travelerPricings?.[0]?.fareDetailsBySegment?.[0]?.includedCheckedBags?.quantity ?? 0;
        const first = outbound.segments[0];
        const carrier = carriers[first.carrierCode] ?? first.carrierCode;

        return (
          <article key={offer.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-sky-300 hover:shadow-lg">
            <div className="flex flex-col gap-5 md:flex-row md:items-stretch">
              <div className="min-w-0 flex-1 space-y-4">
                {[{ itin: outbound, label: inbound ? "Ida" : "" }, ...(inbound ? [{ itin: inbound, label: "Regreso" }] : [])].map(({ itin, label }) => {
                  const seg0 = itin.segments[0];
                  const segLast = itin.segments[itin.segments.length - 1];
                  const itinStops = itin.segments.length - 1;
                  return (
                    <div key={label + seg0.departure.at} className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-2xl bg-sky-50 text-center">
                        <span className="text-[11px] font-black leading-none text-sky-700">{seg0.carrierCode}</span>
                        {label && <span className="mt-0.5 text-[9px] font-bold uppercase text-slate-400">{label}</span>}
                      </div>

                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <div className="text-center">
                          <p className="text-xl font-black leading-none text-slate-900">{formatTime(seg0.departure.at)}</p>
                          <p className="mt-0.5 text-xs font-black text-slate-500">{seg0.departure.iataCode}</p>
                          <p className="text-[10px] text-slate-400">{formatDate(seg0.departure.at)}</p>
                        </div>

                        <div className="flex min-w-[70px] flex-1 flex-col items-center gap-0.5 px-2">
                          <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400"><Clock size={10} />{parseDuration(itin.duration)}</div>
                          <div className="flex w-full items-center gap-1"><div className="h-px flex-1 bg-slate-200" /><Plane size={12} className="rotate-90 text-sky-400" /><div className="h-px flex-1 bg-slate-200" /></div>
                          {itinStops === 0 ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-black text-emerald-700">Directo</span> : <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-black text-amber-700">{itinStops} escala{itinStops > 1 ? "s" : ""}</span>}
                        </div>

                        <div className="text-center">
                          <p className="text-xl font-black leading-none text-slate-900">{formatTime(segLast.arrival.at)}</p>
                          <p className="mt-0.5 text-xs font-black text-slate-500">{segLast.arrival.iataCode}</p>
                          <p className="text-[10px] text-slate-400">{formatDate(segLast.arrival.at)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div className="flex flex-wrap gap-2">
                  <span className={`rounded-xl px-2.5 py-1 text-[11px] font-black ${CABIN_COLOR[cabin] ?? "bg-slate-100 text-slate-600"}`}>{CABIN_LABEL[cabin] ?? cabin}</span>
                  <span className="flex items-center gap-1 rounded-xl bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600"><Luggage size={11} />{bags > 0 ? `${bags} maleta incluida` : "Sin maleta"}</span>
                  <span className="flex items-center gap-1 rounded-xl bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600"><Users size={11} />{offer.numberOfBookableSeats} asientos</span>
                  <span className="rounded-xl bg-sky-50 px-2.5 py-1 text-[11px] font-bold text-sky-700">{carrier}</span>
                  {offer.numberOfBookableSeats <= 4 && <span className="flex items-center gap-1 rounded-xl bg-rose-100 px-2.5 py-1 text-[11px] font-black text-rose-600"><Zap size={10} />Últimos</span>}
                </div>
              </div>

              <div className="flight-price-card flex shrink-0 flex-col items-center justify-center rounded-2xl border border-sky-100 bg-gradient-to-b from-sky-50 to-white px-6 py-5 md:min-w-[180px]">
                <p className="text-[10px] font-black uppercase tracking-widest text-sky-500">Precio total</p>
                <p className="mt-1 text-3xl font-black text-slate-900">{formatPrice(offer.price.grandTotal, offer.price.currency)}</p>
                <p className="text-xs text-slate-400">{offer.travelerPricings.length} tarifa{offer.travelerPricings.length > 1 ? "s" : ""}</p>
                <p className="mt-1 text-[10px] text-slate-400">{offer.price.currency}</p>
                <FlightBookingLink offer={offer} searchSummary={searchSummary} />
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

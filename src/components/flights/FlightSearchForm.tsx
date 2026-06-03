"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Plane, ArrowLeftRight, Users, Search, Calendar, Loader2, Armchair, Baby, Route } from "lucide-react";

type Airport = {
  iataCode: string;
  name: string;
  detailedName?: string;
  address?: { cityName?: string; countryName?: string; countryCode?: string };
};

export type FlightSearchParams = {
  origin: string;
  originLabel: string;
  destination: string;
  destinationLabel: string;
  departureDate: string;
  returnDate?: string;
  adults: number;
  children: number;
  infants: number;
  travelClass: string;
  nonStop: boolean;
};

type Props = { onSearch: (p: FlightSearchParams) => void; loading: boolean };

function airportLabel(a: Airport) {
  const city = a.address?.cityName || a.detailedName || a.name;
  return `${a.iataCode} — ${city}`;
}

function AirportInput({ label, value, onChange }: {
  label: string;
  value: { code: string; label: string };
  onChange: (v: { code: string; label: string }) => void;
}) {
  const [query, setQuery] = useState(value.label);
  const [results, setResults] = useState<Airport[]>([]);
  const [open, setOpen] = useState(false);
  const [fetching, setFetching] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setQuery(value.label); }, [value.label]);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); return; }
    setFetching(true);
    try {
      const res = await fetch(`/api/flights/search?mode=airports&keyword=${encodeURIComponent(q)}`);
      const json = await res.json();
      setResults(json.data ?? []);
      setOpen(true);
    } finally { setFetching(false); }
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value);
    onChange({ code: "", label: e.target.value });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => search(e.target.value), 300);
  }

  function select(a: Airport) {
    const labelText = airportLabel(a);
    setQuery(labelText);
    onChange({ code: a.iataCode, label: labelText });
    setResults([]);
    setOpen(false);
  }

  return (
    <div className="relative min-w-0 flex-1">
      <label className="mb-1.5 block text-xs font-black uppercase tracking-[0.18em] text-slate-500">{label}</label>
      <div className="relative">
        <Plane size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sky-400" />
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onBlur={() => setTimeout(() => setOpen(false), 180)}
          onFocus={() => results.length && setOpen(true)}
          placeholder="Ciudad o código (MEX, CUN, MAD)"
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-9 pr-4 text-sm font-semibold text-slate-900 placeholder:text-slate-400 transition focus:border-sky-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100"
        />
        {fetching && <Loader2 size={13} className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-sky-400" />}
      </div>
      {open && results.length > 0 && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-80 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl">
          {results.map((a, index) => (
            <button
              key={`${a.iataCode}-${a.name}-${index}`}
              type="button"
              onMouseDown={() => select(a)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-sky-50"
            >
              <span className="shrink-0 rounded-lg bg-sky-100 px-2 py-0.5 text-xs font-black text-sky-700">{a.iataCode}</span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-900">{a.address?.cityName || a.detailedName || a.name}</p>
                <p className="truncate text-xs text-slate-500">{a.name}{a.address?.countryCode ? ` · ${a.address.countryCode}` : ""}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function FlightSearchForm({ onSearch, loading }: Props) {
  const [origin, setOrigin] = useState({ code: "", label: "" });
  const [destination, setDestination] = useState({ code: "", label: "" });
  const [departureDate, setDepartureDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [travelClass, setTravelClass] = useState("ANY");
  const [nonStop, setNonStop] = useState(false);
  const [tripType, setTripType] = useState<"one" | "round">("one");

  function swap() {
    const temp = origin;
    setOrigin(destination);
    setDestination(temp);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!origin.code || !destination.code || !departureDate || origin.code === destination.code) return;
    onSearch({
      origin: origin.code,
      originLabel: origin.label,
      destination: destination.code,
      destinationLabel: destination.label,
      departureDate,
      returnDate: tripType === "round" && returnDate ? returnDate : undefined,
      adults,
      children,
      infants,
      travelClass,
      nonStop,
    });
  }

  const today = new Date().toISOString().split("T")[0];
  const disabled = !origin.code || !destination.code || !departureDate || origin.code === destination.code || loading;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {(["one", "round"] as const).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setTripType(type)}
            className={`rounded-2xl px-4 py-2 text-sm font-black transition ${
              tripType === type ? "bg-sky-600 text-white shadow-md" : "bg-slate-100 text-slate-600 hover:bg-sky-50"
            }`}
          >
            {type === "one" ? "Solo ida" : "Ida y vuelta"}
          </button>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_auto_1fr] lg:items-end">
        <AirportInput label="Origen" value={origin} onChange={setOrigin} />
        <button
          type="button"
          onClick={swap}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-sky-600 transition hover:bg-sky-50 active:scale-95 max-lg:mx-auto"
          aria-label="Intercambiar origen y destino"
        >
          <ArrowLeftRight size={16} />
        </button>
        <AirportInput label="Destino" value={destination} onChange={setDestination} />
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div>
          <label className="mb-1.5 flex items-center gap-1 text-xs font-black uppercase tracking-[0.18em] text-slate-500"><Calendar size={11} />Salida</label>
          <input type="date" min={today} value={departureDate} onChange={(e) => setDepartureDate(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 transition focus:border-sky-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100" />
        </div>
        {tripType === "round" && (
          <div>
            <label className="mb-1.5 flex items-center gap-1 text-xs font-black uppercase tracking-[0.18em] text-slate-500"><Calendar size={11} />Regreso</label>
            <input type="date" min={departureDate || today} value={returnDate} onChange={(e) => setReturnDate(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 transition focus:border-sky-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100" />
          </div>
        )}
        <div>
          <label className="mb-1.5 flex items-center gap-1 text-xs font-black uppercase tracking-[0.18em] text-slate-500"><Users size={11} />Adultos</label>
          <select value={adults} onChange={(e) => setAdults(Number(e.target.value))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 transition focus:border-sky-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100">
            {[1,2,3,4,5,6,7,8,9].map((n) => <option key={n} value={n}>{n} adulto{n > 1 ? "s" : ""}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1.5 flex items-center gap-1 text-xs font-black uppercase tracking-[0.18em] text-slate-500"><Armchair size={11} />Cabina</label>
          <select value={travelClass} onChange={(e) => setTravelClass(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 transition focus:border-sky-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100">
            <option value="ANY">Cualquier cabina</option>
            <option value="ECONOMY">Económica</option>
            <option value="PREMIUM_ECONOMY">Premium económica</option>
            <option value="BUSINESS">Business</option>
            <option value="FIRST">Primera clase</option>
          </select>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <label className="mb-1.5 flex items-center gap-1 text-xs font-black uppercase tracking-[0.18em] text-slate-500"><Users size={11} />Niños</label>
          <select value={children} onChange={(e) => setChildren(Number(e.target.value))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 transition focus:border-sky-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100">
            {[0,1,2,3,4,5,6].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1.5 flex items-center gap-1 text-xs font-black uppercase tracking-[0.18em] text-slate-500"><Baby size={11} />Bebés</label>
          <select value={infants} onChange={(e) => setInfants(Number(e.target.value))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 transition focus:border-sky-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100">
            {[0,1,2,3,4].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700">
          <input type="checkbox" checked={nonStop} onChange={(e) => setNonStop(e.target.checked)} className="h-4 w-4 accent-sky-600" />
          <Route size={15} className="text-sky-500" />
          Solo vuelos directos
        </label>
      </div>

      {origin.code && destination.code && origin.code === destination.code && (
        <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700">El origen y el destino no pueden ser iguales.</p>
      )}

      <button type="submit" disabled={disabled} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-600 py-4 text-sm font-black text-white shadow-lg shadow-sky-200 transition hover:bg-sky-700 active:scale-[0.98] disabled:opacity-50">
        {loading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
        {loading ? "Buscando vuelos..." : "Buscar vuelos"}
      </button>
    </form>
  );
}

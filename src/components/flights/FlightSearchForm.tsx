"use client";

import { useState, useRef, useEffect, useCallback, type ReactNode } from "react";
import { Plane, ArrowLeftRight, Users, Search, Calendar, Loader2, Armchair, Baby, Route, ChevronDown, Check } from "lucide-react";

type Airport = {
  iataCode: string;
  skyId?: string;
  entityId?: string;
  name: string;
  detailedName?: string;
  address?: { cityName?: string; countryName?: string; countryCode?: string };
};

export type FlightSearchParams = {
  origin: string;
  originEntityId?: string;
  originLabel: string;
  destination: string;
  destinationEntityId?: string;
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

type AirportValue = { code: string; entityId?: string; label: string };
type ChoiceValue = string | number;
type ChoiceOption<T extends ChoiceValue> = { value: T; label: string; helper?: string; disabled?: boolean };

const MAX_PASSENGERS = 9;

function airportLabel(a: Airport) {
  const city = a.address?.cityName || a.detailedName || a.name;
  return `${a.skyId || a.iataCode} — ${city}`;
}

function getManualAirportCode(value: string) {
  const code = value.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : "";
}

function passengerText(value: number, singular: string, plural: string) {
  return `${value} ${value === 1 ? singular : plural}`;
}

function ChoiceDropdown<T extends ChoiceValue>({
  label,
  icon,
  value,
  options,
  onChange,
}: {
  label: string;
  icon?: ReactNode;
  value: T;
  options: ChoiceOption<T>[];
  onChange: (value: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value) ?? options[0];

  return (
    <div className="relative min-w-0">
      <label className="mb-1.5 flex items-center gap-1 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
        {icon}
        {label}
      </label>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        onBlur={() => window.setTimeout(() => setOpen(false), 140)}
        className="flight-custom-select flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-semibold text-slate-900 transition focus:border-sky-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="min-w-0 truncate">{selected?.label}</span>
        <ChevronDown size={16} className={`shrink-0 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="flight-custom-select-menu absolute left-0 top-full z-[80] mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-2xl" role="listbox">
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={String(option.value)}
                type="button"
                disabled={option.disabled}
                onMouseDown={(event) => {
                  event.preventDefault();
                  if (option.disabled) return;
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`flight-custom-select-option flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold transition ${
                  isSelected ? "is-selected" : ""
                } ${option.disabled ? "is-disabled cursor-not-allowed opacity-45" : "hover:bg-sky-50"}`}
                role="option"
                aria-selected={isSelected}
              >
                <span className="min-w-0">
                  <span className="block truncate">{option.label}</span>
                  {option.helper ? <span className="block text-[11px] font-semibold opacity-70">{option.helper}</span> : null}
                </span>
                {isSelected ? <Check size={15} className="shrink-0" /> : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AirportInput({ label, value, onChange }: {
  label: string;
  value: AirportValue;
  onChange: (v: AirportValue) => void;
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
    } catch {
      setResults([]);
      setOpen(false);
    } finally { setFetching(false); }
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const nextValue = e.target.value;
    const manualCode = getManualAirportCode(nextValue);
    setQuery(nextValue);
    onChange({ code: manualCode, entityId: undefined, label: nextValue });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => search(nextValue), 300);
  }

  function select(a: Airport) {
    const code = a.skyId || a.iataCode;
    const labelText = airportLabel(a);
    setQuery(labelText);
    onChange({ code, entityId: a.entityId, label: labelText });
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
        <div className="flight-custom-select-menu absolute left-0 top-full z-50 mt-1 max-h-80 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl">
          {results.map((a, index) => (
            <button
              key={`${a.skyId || a.iataCode}-${a.entityId || index}`}
              type="button"
              onMouseDown={() => select(a)}
              className="flight-custom-select-option flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-sky-50"
            >
              <span className="shrink-0 rounded-lg bg-sky-100 px-2 py-0.5 text-xs font-black text-sky-700">{a.skyId || a.iataCode}</span>
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
  const [origin, setOrigin] = useState<AirportValue>({ code: "", label: "" });
  const [destination, setDestination] = useState<AirportValue>({ code: "", label: "" });
  const [departureDate, setDepartureDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [travelClass, setTravelClass] = useState("ANY");
  const [nonStop, setNonStop] = useState(false);
  const [tripType, setTripType] = useState<"one" | "round">("one");

  const totalPassengers = adults + children + infants;
  const passengerLimitReached = totalPassengers >= MAX_PASSENGERS;

  function swap() {
    const temp = origin;
    setOrigin(destination);
    setDestination(temp);
  }

  function updateAdults(value: number) {
    setAdults(value);
    const over = value + children + infants - MAX_PASSENGERS;
    if (over > 0) {
      const infantsReduction = Math.min(infants, over);
      const remainingOver = over - infantsReduction;
      setInfants(infants - infantsReduction);
      if (remainingOver > 0) setChildren(Math.max(0, children - remainingOver));
    }
  }

  function updateChildren(value: number) {
    setChildren(value);
    const over = adults + value + infants - MAX_PASSENGERS;
    if (over > 0) setInfants(Math.max(0, infants - over));
  }

  function updateInfants(value: number) {
    setInfants(value);
  }

  function numberOptions(min: number, max: number, value: number, singular: string, plural: string): ChoiceOption<number>[] {
    return Array.from({ length: max - min + 1 }, (_, index) => {
      const n = min + index;
      return {
        value: n,
        label: singular ? passengerText(n, singular, plural) : String(n),
        helper: n === value ? "Seleccionado" : undefined,
      };
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!origin.code || !destination.code || !departureDate || origin.code === destination.code || totalPassengers > MAX_PASSENGERS) return;
    onSearch({
      origin: origin.code,
      originEntityId: origin.entityId,
      originLabel: origin.label,
      destination: destination.code,
      destinationEntityId: destination.entityId,
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
  const disabled = !origin.code || !destination.code || !departureDate || origin.code === destination.code || totalPassengers > MAX_PASSENGERS || loading;
  const maxAdults = Math.max(1, MAX_PASSENGERS - children - infants);
  const maxChildren = Math.max(0, MAX_PASSENGERS - adults - infants);
  const maxInfants = Math.max(0, MAX_PASSENGERS - adults - children);

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
        <ChoiceDropdown
          label="Adultos"
          icon={<Users size={11} />}
          value={adults}
          options={numberOptions(1, maxAdults, adults, "adulto", "adultos")}
          onChange={updateAdults}
        />
        <ChoiceDropdown
          label="Cabina"
          icon={<Armchair size={11} />}
          value={travelClass}
          options={[
            { value: "ANY", label: "Cualquier cabina" },
            { value: "ECONOMY", label: "Económica" },
            { value: "PREMIUM_ECONOMY", label: "Premium económica" },
            { value: "BUSINESS", label: "Business" },
            { value: "FIRST", label: "Primera clase" },
          ]}
          onChange={setTravelClass}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <ChoiceDropdown
          label="Niños"
          icon={<Users size={11} />}
          value={children}
          options={numberOptions(0, maxChildren, children, "", "")}
          onChange={updateChildren}
        />
        <ChoiceDropdown
          label="Bebés"
          icon={<Baby size={11} />}
          value={infants}
          options={numberOptions(0, maxInfants, infants, "", "")}
          onChange={updateInfants}
        />
        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700">
          <input type="checkbox" checked={nonStop} onChange={(e) => setNonStop(e.target.checked)} className="h-4 w-4 accent-sky-600" />
          <Route size={15} className="text-sky-500" />
          Solo vuelos directos
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm font-bold text-slate-600">
        <Users size={15} className="text-sky-500" />
        <span>Total pasajeros: <strong className="text-slate-900">{totalPassengers}/{MAX_PASSENGERS}</strong></span>
        {passengerLimitReached && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-black text-amber-700">Máximo alcanzado</span>}
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

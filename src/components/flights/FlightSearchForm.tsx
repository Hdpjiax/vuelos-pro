'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Plane, ArrowLeftRight, Users, Search, Calendar, Loader2 } from 'lucide-react';

type Airport = { iataCode: string; name: string; address: { cityName: string; countryCode: string } };

type SearchParams = {
  origin: string; originLabel: string;
  destination: string; destinationLabel: string;
  departureDate: string; returnDate?: string; adults: number;
};

type Props = { onSearch: (p: SearchParams) => void; loading: boolean };

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
    if (q.length < 2) { setResults([]); return; }
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
    onChange({ code: '', label: e.target.value });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => search(e.target.value), 300);
  }

  function select(a: Airport) {
    const label = `${a.iataCode} — ${a.address.cityName}`;
    setQuery(label);
    onChange({ code: a.iataCode, label });
    setResults([]);
    setOpen(false);
  }

  return (
    <div className="relative flex-1 min-w-0">
      <label className="mb-1.5 block text-xs font-black uppercase tracking-[0.18em] text-slate-500">{label}</label>
      <div className="relative">
        <Plane size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sky-400" />
        <input
          type="text" value={query} onChange={handleChange}
          onBlur={() => setTimeout(() => setOpen(false), 180)}
          onFocus={() => results.length && setOpen(true)}
          placeholder="Ciudad o código (ej. MEX, CUN)"
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-9 pr-4 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-sky-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100 transition"
        />
        {fetching && <Loader2 size={13} className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-sky-400" />}
      </div>
      {open && results.length > 0 && (
        <div className="absolute left-0 top-full z-50 mt-1 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          {results.map((a) => (
            <button key={a.iataCode} type="button" onMouseDown={() => select(a)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-sky-50">
              <span className="rounded-lg bg-sky-100 px-2 py-0.5 text-xs font-black text-sky-700 shrink-0">{a.iataCode}</span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate">{a.address.cityName}</p>
                <p className="text-xs text-slate-500 truncate">{a.name}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function FlightSearchForm({ onSearch, loading }: Props) {
  const [origin, setOrigin] = useState({ code: '', label: '' });
  const [destination, setDestination] = useState({ code: '', label: '' });
  const [departureDate, setDepartureDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [adults, setAdults] = useState(1);
  const [tripType, setTripType] = useState<'one' | 'round'>('one');

  function swap() { const t = origin; setOrigin(destination); setDestination(t); }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!origin.code || !destination.code || !departureDate) return;
    onSearch({
      origin: origin.code, originLabel: origin.label,
      destination: destination.code, destinationLabel: destination.label,
      departureDate,
      returnDate: tripType === 'round' && returnDate ? returnDate : undefined,
      adults,
    });
  }

  const today = new Date().toISOString().split('T')[0];

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Tipo de viaje */}
      <div className="flex gap-2">
        {(['one', 'round'] as const).map((t) => (
          <button key={t} type="button" onClick={() => setTripType(t)}
            className={`rounded-2xl px-4 py-2 text-sm font-black transition ${
              tripType === t ? 'bg-sky-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-sky-50'
            }`}>
            {t === 'one' ? '✈️ Solo ida' : '🔄 Ida y vuelta'}
          </button>
        ))}
      </div>

      {/* Aeropuertos */}
      <div className="flex items-end gap-2">
        <AirportInput label="Origen" value={origin} onChange={setOrigin} />
        <button type="button" onClick={swap}
          className="mb-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-sky-600 transition hover:bg-sky-50 active:scale-95">
          <ArrowLeftRight size={16} />
        </button>
        <AirportInput label="Destino" value={destination} onChange={setDestination} />
      </div>

      {/* Fechas y pasajeros */}
      <div className={`grid gap-3 ${tripType === 'round' ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-2'}`}>
        <div>
          <label className="mb-1.5 flex items-center gap-1 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
            <Calendar size={11} />Salida
          </label>
          <input type="date" min={today} value={departureDate} onChange={(e) => setDepartureDate(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 focus:border-sky-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100 transition" />
        </div>
        {tripType === 'round' && (
          <div>
            <label className="mb-1.5 flex items-center gap-1 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
              <Calendar size={11} />Regreso
            </label>
            <input type="date" min={departureDate || today} value={returnDate} onChange={(e) => setReturnDate(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 focus:border-sky-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100 transition" />
          </div>
        )}
        <div>
          <label className="mb-1.5 flex items-center gap-1 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
            <Users size={11} />Pasajeros
          </label>
          <select value={adults} onChange={(e) => setAdults(Number(e.target.value))}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 focus:border-sky-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100 transition">
            {[1,2,3,4,5,6,7,8,9].map((n) => <option key={n} value={n}>{n} adulto{n > 1 ? 's' : ''}</option>)}
          </select>
        </div>
      </div>

      <button type="submit" disabled={!origin.code || !destination.code || !departureDate || loading}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-600 py-4 text-sm font-black text-white shadow-lg shadow-sky-200 transition hover:bg-sky-700 active:scale-[0.98] disabled:opacity-50">
        {loading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
        {loading ? 'Buscando vuelos...' : 'Buscar vuelos'}
      </button>
    </form>
  );
}

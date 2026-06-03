"use client";

import { useState } from "react";
import { Plane } from "lucide-react";
import { FlightSearchForm, type FlightSearchParams } from "@/components/flights/FlightSearchForm";
import { FlightSearchResults } from "@/components/flights/FlightSearchResults";

export default function AdminCotizarPage() {
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<FlightSearchParams | null>(null);

  async function handleSearch(params: FlightSearchParams) {
    setLoading(true);
    setError(undefined);
    setResults(null);
    setSummary(params);

    try {
      const q = new URLSearchParams({
        origin: params.origin,
        destination: params.destination,
        departureDate: params.departureDate,
        adults: String(params.adults),
        children: String(params.children),
        infants: String(params.infants),
        travelClass: params.travelClass,
        nonStop: String(params.nonStop),
        ...(params.originEntityId ? { originEntityId: params.originEntityId } : {}),
        ...(params.destinationEntityId ? { destinationEntityId: params.destinationEntityId } : {}),
        ...(params.returnDate ? { returnDate: params.returnDate } : {}),
      });

      const res = await fetch(`/api/flights/search?${q.toString()}`);
      const json = await res.json();

      if (!res.ok || json.error) setError(json.error ?? "No se pudo buscar vuelos.");
      else setResults(json);
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/60 backdrop-blur">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-2xl bg-sky-50 p-2.5"><Plane size={20} className="text-sky-700" /></div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-600">Panel Admin · Vuelos</p>
            <h1 className="text-2xl font-black text-slate-950">Cotiza tu vuelo</h1>
          </div>
        </div>
        <FlightSearchForm onSearch={handleSearch} loading={loading} />
      </section>
      <FlightSearchResults data={results} error={error} searchSummary={summary} />
    </div>
  );
}

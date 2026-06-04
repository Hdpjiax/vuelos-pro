"use client";

import { useState, useTransition, useRef } from "react";
import {
  Home, Building2, Search, ExternalLink,
  Bed, Bath, Maximize2, TrendingUp, Loader2,
  AlertCircle, MapPin, Calendar, DollarSign,
} from "lucide-react";
import { searchZipCodeAction, type ZillowProperty } from "@/app/admin/tools/zip-codes/actions";

// ── helpers ────────────────────────────────────────────────────────────────
function fmtPrice(n: number | null) {
  if (!n) return "N/A";
  return "$" + n.toLocaleString("en-US");
}
function fmtArea(n: number | null) {
  if (!n) return null;
  return n.toLocaleString("en-US") + " ft²";
}

// ── PropertyCard ────────────────────────────────────────────────────────────
function PropertyCard({ p, mode }: { p: ZillowProperty; mode: "sale" | "rent" }) {
  const accent = mode === "sale"
    ? { grad: "from-sky-500 to-violet-500", badge: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300", dot: "bg-sky-500" }
    : { grad: "from-emerald-500 to-teal-500", badge: "bg-emerald-400 text-white dark:bg-emerald-900/40 dark:text-emerald-300", dot: "bg-emerald-500" };

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl dark:border-white/10 dark:bg-white/5">
      {/* Imagen */}
      <div className="relative h-44 w-full overflow-hidden bg-slate-100 dark:bg-white/5">
        {p.imgSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={p.imgSrc}
            alt={p.address}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Home size={40} className="text-slate-300 dark:text-white/20" />
          </div>
        )}
        <div className={`absolute left-3 top-3 flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-[11px] font-black uppercase tracking-wider backdrop-blur-sm ${accent.badge}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${accent.dot}`} />
          {mode === "sale" ? "En Venta" : "En Renta"}
        </div>
        <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t ${mode === "sale" ? "from-sky-900/80" : "from-emerald-900/80"} to-transparent px-4 py-3`}>
          <p className="text-xl font-black text-white drop-shadow">
            {fmtPrice(p.price)}
            {mode === "rent" && p.price && <span className="text-sm font-semibold opacity-80">/mes</span>}
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start gap-1.5">
          <MapPin size={13} className="mt-0.5 shrink-0 text-slate-400" />
          <p className="text-md font-bold leading-snug text-slate-800 text-slate-100">{p.address || "Sin dirección"}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {p.bedrooms != null && (
            <span className="flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 dark:bg-white/10 ">
              <Bed size={11} /> {p.bedrooms} hab
            </span>
          )}
          {p.bathrooms != null && (
            <span className="flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 dark:bg-white/10 ">
              <Bath size={11} /> {p.bathrooms} baños
            </span>
          )}
          {p.livingArea != null && (
            <span className="flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 dark:bg-white/10 ">
              <Maximize2 size={11} /> {fmtArea(p.livingArea)}
            </span>
          )}
          {p.daysOnZillow != null && (
            <span className="flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 dark:bg-amber-900/30 ">
              <Calendar size={11} /> {p.daysOnZillow}d
            </span>
          )}
        </div>

        {p.zestimate && (
          <div className="flex items-center gap-1.5 rounded-xl border border-violet-100 bg-violet-50 px-3 py-1.5 dark:border-violet-400/20 dark:bg-violet-900/20">
            <TrendingUp size={12} className="text-violet-500" />
            <span className="text-xs font-bold text-violet-700 dark:text-violet-300">Zestimate: {fmtPrice(p.zestimate)}</span>
          </div>
        )}

        {p.propertyType && (
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {p.propertyType.replace(/_/g, " ")}
          </p>
        )}

        <a
          href={p.detailUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-auto flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-400 to-violet-500 px-4 py-2 text-xs font-black text-white shadow transition-all hover:-translate-y-0.5 hover:shadow-sky-200/60 dark:hover:shadow-cyan-950/40"
        >
          <ExternalLink size={12} /> Ver en Zillow
        </a>
      </div>
    </div>
  );
}

// ── Main client ──────────────────────────────────────────────────────────────
export function ZipCodesClient() {
  const [zip, setZip]           = useState("");
  const [tab, setTab]           = useState<"sale" | "rent">("sale");
  const [forSale, setForSale]   = useState<ZillowProperty[]>([]);
  const [forRent, setForRent]   = useState<ZillowProperty[]>([]);
  const [totSale, setTotSale]   = useState(0);
  const [totRent, setTotRent]   = useState(0);
  const [searched, setSearched] = useState(false);
  const [error, setError]       = useState("");
  const [isPending, start]      = useTransition();
  const inputRef                = useRef<HTMLInputElement>(null);

  function handleSearch() {
    const z = zip.trim();
    if (!z.match(/^\d{5}$/)) { setError("Ingresa un ZIP code de 5 dígitos."); return; }
    setError("");
    start(async () => {
      const res = await searchZipCodeAction(z);
      if (res.error) { setError(res.error); return; }
      setForSale(res.forSale);
      setForRent(res.forRent);
      setTotSale(res.totalForSale);
      setTotRent(res.totalForRent);
      setSearched(true);
    });
  }

  const displayed = tab === "sale" ? forSale : forRent;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-violet-500 text-white shadow-lg">
          <Home size={22} />
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-900 ">ZIP Codes</h2>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Propiedades en venta y renta por código postal · datos de Zillow
          </p>
        </div>
      </div>

      {/* ── Búsqueda ── */}
      <div className="flex flex-col gap-3 rounded-3xl border-2 border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5 sm:flex-row sm:items-end">
        <div className="flex-1">
          {/* LABEL: negro duro en light, blanco en dark */}
          <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-900">
            Código Postal (ZIP)
          </label>
          <div className="flex items-center gap-2 rounded-2xl border-2 border-slate-300 bg-white px-4 py-2.5 focus-within:border-sky-400 dark:border-white/15 dark:bg-slate-800">
            <MapPin size={15} className="shrink-0 text-slate-400" />
            <input
              ref={inputRef}
              value={zip}
              onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Ej. 90210, 10001, 33101…"
              inputMode="numeric"
              maxLength={5}
              className="flex-1 bg-transparent text-lg font-black tracking-widest text-slate-900 outline-none placeholder:text-base placeholder:font-normal placeholder:tracking-normal placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
            {zip.length > 0 && (
              <span className={`text-xs font-bold ${zip.length === 5 ? "text-sky-500" : "text-slate-400"}`}>
                {zip.length}/5
              </span>
            )}
          </div>
        </div>

        <button
          onClick={handleSearch}
          disabled={isPending || zip.length !== 5}
          className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-sky-400 to-violet-500 px-7 py-3 text-sm font-black text-white shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-sky-200/60 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:shadow-cyan-950/40"
        >
          {isPending ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
          {isPending ? "Buscando…" : "Buscar"}
        </button>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-400/20 dark:bg-red-900/20">
          <AlertCircle size={15} className="shrink-0 text-red-500" />
          <p className="text-sm font-bold text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* ── Resultados ── */}
      {searched && !isPending && (
        <>
          {/* Tabs */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setTab("sale")}
              className={`flex items-center gap-2 rounded-2xl border-2 px-5 py-2.5
                font-black transition-all hover:-translate-y-0.5 ${
                tab === "sale"
                  ? " text-[31px] border-transparent bg-gradient-to-r from-sky-400 to-violet-500 text-black font-black shadow-lg "
                  : " text-[21px]  border-slate-200 bg-slate-100 text-slate-700 hover:border-sky-300 dark:border-white/10 dark:bg-white/5"
              }`}
            >
              <Home size={19} />
              En Venta
              <span className={`rounded-lg px-2 py-0.5 text-[14px] font-black ${
                tab === "sale" ? "bg-white/20" : "bg-slate-200 text-slate-600 dark:bg-white/10 "
              }`}>{totSale.toLocaleString()}</span>
            </button>

            <button
              onClick={() => setTab("rent")}
              className={`flex items-center gap-2 rounded-2xl border-2 px-5 py-2.5 text-sm font-black transition-all hover:-translate-y-0.5 ${
                tab === "rent"
                  ? "border-transparent bg-gradient-to-r from-emerald-300 to-teal-500 shadow-lg"
                  : "border-slate-200 bg-slate-100 text-slate-700 hover:border-emerald-300 dark:border-white/10 dark:bg-white/5 "
              }`}
            >
              <Building2 size={15} />
              En Renta
              <span className={`rounded-lg px-2 py-0.5 text-[14px] font-black ${
                tab === "rent" ? "bg-white/20 " : "bg-slate-200 text-slate-600 dark:bg-white/10 dark:text-slate-400"
              }`}>{totRent.toLocaleString()}</span>
            </button>

            <p className="ml-auto text-xs font-semibold text-slate-400 dark:text-slate-500">
              Mostrando {displayed.length} de {tab === "sale" ? totSale.toLocaleString() : totRent.toLocaleString()} propiedades · ZIP {zip}
            </p>
          </div>

          {/* Grid */}
          {displayed.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-3xl border-2 border-dashed border-slate-200 py-16 text-center dark:border-white/10">
              <DollarSign size={40} className="text-slate-300 dark:text-white/20" />
              <p className="font-bold text-slate-500 dark:text-slate-400">
                No se encontraron propiedades {tab === "sale" ? "en venta" : "en renta"} para ZIP {zip}
              </p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {displayed.map((p) => (
                <PropertyCard key={p.zpid || p.address} p={p} mode={tab} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Estado inicial */}
      {!searched && !isPending && (
        <div className="flex flex-col items-center gap-4 rounded-3xl border-2 border-dashed border-slate-200 py-20 text-center dark:border-white/10">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-sky-100 to-violet-100 dark:from-sky-900/30 dark:to-violet-900/30">
            <MapPin size={30} className="text-sky-400" />
          </div>
          <div>
            <p className="text-base font-black text-slate-700 ">Ingresa un ZIP code para comenzar</p>
            <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">
              Ejemplos: <span className="font-bold text-sky-500">90210</span> · <span className="font-bold text-sky-500">10001</span> · <span className="font-bold text-sky-500">33101</span> · <span className="font-bold text-sky-500">60601</span>
            </p>
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {isPending && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5">
              <div className="h-44 animate-pulse bg-slate-200 dark:bg-white/10" />
              <div className="space-y-3 p-4">
                <div className="h-4 w-3/4 animate-pulse rounded-lg bg-slate-200 dark:bg-white/10" />
                <div className="h-3 w-1/2 animate-pulse rounded-lg bg-slate-200 dark:bg-white/10" />
                <div className="flex gap-2">
                  <div className="h-6 w-14 animate-pulse rounded-lg bg-slate-200 dark:bg-white/10" />
                  <div className="h-6 w-14 animate-pulse rounded-lg bg-slate-200 dark:bg-white/10" />
                  <div className="h-6 w-16 animate-pulse rounded-lg bg-slate-200 dark:bg-white/10" />
                </div>
                <div className="h-8 w-full animate-pulse rounded-xl bg-slate-200 dark:bg-white/10" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

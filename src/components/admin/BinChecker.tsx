"use client";

import { useState, useRef } from "react";
import {
  CreditCard, Search, Loader2, AlertCircle,
  Building2, Globe, Landmark, ShieldCheck, ShieldX,
  Smartphone, WalletCards, Copy, CheckCheck, X,
} from "lucide-react";

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface BinResult {
  number?: { length?: number; luhn?: boolean };
  scheme?: string;
  type?: string;
  brand?: string;
  prepaid?: boolean;
  country?: { numeric?: string; alpha2?: string; name?: string; emoji?: string; currency?: string; latitude?: number; longitude?: number };
  bank?: { name?: string; url?: string; phone?: string; city?: string };
  error?: string;
}

type Status = "idle" | "loading" | "ok" | "error";

function capitalize(s?: string) {
  if (!s) return "—";
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function schemeColor(scheme?: string): string {
  switch (scheme?.toLowerCase()) {
    case "visa":       return "from-blue-500 to-blue-700";
    case "mastercard": return "from-orange-500 to-red-600";
    case "amex":       return "from-teal-500 to-cyan-700";
    case "discover":   return "from-amber-400 to-orange-500";
    case "jcb":        return "from-green-500 to-emerald-700";
    case "unionpay":   return "from-red-500 to-rose-700";
    default:           return "from-slate-500 to-slate-700";
  }
}

function typeColor(type?: string) {
  if (type?.toLowerCase() === "credit") return { bg: "#dcfce7", text: "#15803d", border: "#86efac" };
  if (type?.toLowerCase() === "debit")  return { bg: "#dbeafe", text: "#1d4ed8", border: "#93c5fd" };
  return { bg: "#f1f5f9", text: "#475569", border: "#cbd5e1" };
}

function CopyBtn({ value }: { value: string }) {
  const [ok, setOk] = useState(false);
  async function handle() {
    await navigator.clipboard.writeText(value);
    setOk(true);
    setTimeout(() => setOk(false), 1800);
  }
  return (
    <button onClick={handle} title="Copiar"
      className="ml-auto shrink-0 rounded-lg p-1.5 text-slate-400 transition-all hover:bg-sky-100 hover:text-sky-600 dark:hover:bg-cyan-400/10 dark:hover:text-cyan-300">
      {ok ? <CheckCheck size={13} className="text-green-600" /> : <Copy size={13} />}
    </button>
  );
}

function Row({ icon, label, value, copyable = true }: { icon: React.ReactNode; label: string; value: string; copyable?: boolean }) {
  if (!value || value === "—") return null;
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 dark:border-white/5 dark:bg-slate-700"
      style={{ backgroundColor: "#f8fafc" }}>
      <span className="shrink-0 text-slate-400">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#94a3b8" }}>{label}</p>
        <p className="truncate text-[13px] font-semibold" style={{ color: "#1e293b" }}>{value}</p>
      </div>
      {copyable && <CopyBtn value={value} />}
    </div>
  );
}

interface HistEntry { bin: string; scheme?: string; bank?: string; country?: string; type?: string; }

const MAX_HIST = 10;

export function BinChecker() {
  const [input, setInput]     = useState("");
  const [status, setStatus]   = useState<Status>("idle");
  const [result, setResult]   = useState<BinResult | null>(null);
  const [error, setError]     = useState("");
  const [history, setHistory] = useState<HistEntry[]>([]);
  const inputRef              = useRef<HTMLInputElement>(null);

  function handleInput(raw: string) {
    setInput(raw.replace(/\D/g, "").slice(0, 8));
  }

  async function handleCheck(binOverride?: string) {
    const bin = (binOverride ?? input).replace(/\D/g, "");
    if (bin.length < 6) return;
    setStatus("loading");
    setResult(null);
    setError("");

    try {
      // ← Llama al proxy interno, no a binlist.net directamente
      const res = await fetch(`/api/bin/${bin}`);
      const data: BinResult = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? `Error ${res.status}`);
      }

      setResult(data);
      setStatus("ok");
      const entry: HistEntry = {
        bin,
        scheme:  data.scheme,
        bank:    data.bank?.name,
        country: data.country?.name,
        type:    data.type,
      };
      setHistory((prev) => {
        const filtered = prev.filter((h) => h.bin !== bin);
        return [entry, ...filtered].slice(0, MAX_HIST);
      });
    } catch (e: unknown) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Error desconocido.");
    }
  }

  function handleClear() {
    setInput("");
    setResult(null);
    setStatus("idle");
    setError("");
    inputRef.current?.focus();
  }

  const schemeGrad = schemeColor(result?.scheme);
  const tc = typeColor(result?.type);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-700 text-white shadow-lg">
          <CreditCard size={22} />
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">BIN Checker</h2>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
            Verifica los primeros 6–8 dígitos de una tarjeta para obtener banco, esquema, país y tipo
          </p>
        </div>
      </div>

      {/* Input */}
      <div className="rounded-3xl border-2 border-slate-300 p-5 shadow-md dark:border-white/10 dark:bg-slate-800"
        style={{ backgroundColor: "#ffffff" }}>
        <label htmlFor="bin-input" className="mb-1 block text-sm font-bold dark:text-slate-200"
          style={{ color: "#1e293b" }}>Número BIN</label>
        <p className="mb-3 text-xs font-medium" style={{ color: "#64748b" }}>
          Ingresa los primeros <span style={{ color: "#6366f1" }}>6 a 8 dígitos</span> del número de tarjeta.
        </p>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <input
              id="bin-input"
              ref={inputRef}
              type="text"
              inputMode="numeric"
              maxLength={8}
              value={input}
              onChange={(e) => handleInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCheck()}
              placeholder="Ej: 424242"
              className="w-full rounded-2xl border-2 py-3 pl-4 pr-10 text-lg font-black tracking-widest shadow-sm outline-none focus:ring-2 focus:ring-violet-300 dark:border-white/10 dark:bg-slate-700 dark:text-white dark:placeholder:text-slate-500"
              style={{ backgroundColor: "#f1f5f9", color: "#0f172a", borderColor: "#94a3b8", letterSpacing: "0.2em" }}
            />
            {input && (
              <button onClick={handleClear}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:text-slate-700">
                <X size={15} />
              </button>
            )}
          </div>
          <button
            onClick={() => handleCheck()}
            disabled={input.length < 6 || status === "loading"}
            className="flex shrink-0 items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 to-indigo-600 px-5 py-3 text-sm font-black text-white shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            {status === "loading"
              ? <Loader2 size={16} className="animate-spin" />
              : <Search size={16} />}
            {status === "loading" ? "Consultando…" : "Verificar"}
          </button>
        </div>
        <div className="mt-3 flex items-center gap-2">
          {[...Array(8)].map((_, i) => (
            <div key={i}
              className="h-1.5 flex-1 rounded-full transition-all duration-200"
              style={{
                backgroundColor: i < input.length
                  ? (input.length >= 6 ? "#6366f1" : "#94a3b8")
                  : "#e2e8f0",
              }}
            />
          ))}
          <span className="ml-1 text-[11px] font-bold" style={{ color: input.length >= 6 ? "#6366f1" : "#94a3b8" }}>
            {input.length}/8
          </span>
        </div>
      </div>

      {/* Error */}
      {status === "error" && (
        <div className="flex items-start gap-3 rounded-3xl border-2 border-red-200 bg-red-50 p-4 dark:border-red-400/20 dark:bg-red-500/10">
          <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-500" />
          <div>
            <p className="text-sm font-black text-red-700 dark:text-red-400">Error al consultar</p>
            <p className="text-xs font-medium text-red-600 dark:text-red-300">{error}</p>
          </div>
        </div>
      )}

      {/* Resultado */}
      {status === "ok" && result && (
        <div className="space-y-4">
          <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${schemeGrad} p-6 text-white shadow-xl`}>
            <div className="pointer-events-none absolute inset-0 opacity-10"
              style={{ backgroundImage: "radial-gradient(circle at 80% 20%, white 1px, transparent 1px), radial-gradient(circle at 20% 80%, white 1px, transparent 1px)", backgroundSize: "40px 40px" }}
            />
            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest opacity-70">BIN consultado</p>
                <p className="mt-1 font-mono text-3xl font-black tracking-[0.3em]">{input.padEnd(8, "•")}</p>
              </div>
              <div className="text-right">
                {result.scheme && <p className="text-lg font-black uppercase tracking-widest">{result.scheme}</p>}
                {result.type && (
                  <span className="mt-1 inline-block rounded-xl px-3 py-1 text-xs font-black uppercase"
                    style={{ backgroundColor: tc.bg, color: tc.text, border: `1.5px solid ${tc.border}` }}>
                    {result.type}
                  </span>
                )}
              </div>
            </div>
            <div className="relative mt-4 flex items-end justify-between">
              <div>
                {result.bank?.name && <p className="text-sm font-black opacity-90">{result.bank.name}</p>}
                {result.country && <p className="text-xs font-medium opacity-70">{result.country.emoji} {result.country.name}</p>}
              </div>
              <div className="flex flex-col items-end gap-1">
                {result.prepaid && (
                  <span className="rounded-xl bg-white/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider">Prepaid</span>
                )}
                {result.number?.luhn !== undefined && (
                  <span className="flex items-center gap-1 rounded-xl bg-white/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider">
                    {result.number.luhn ? <><ShieldCheck size={10} /> Luhn ✔</> : <><ShieldX size={10} /> Luhn ✖</>}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border-2 border-slate-200 p-4 shadow-md dark:border-white/10 dark:bg-slate-800" style={{ backgroundColor: "#ffffff" }}>
            <p className="mb-3 text-xs font-black uppercase tracking-wider" style={{ color: "#94a3b8" }}>Detalles del BIN</p>
            <div className="space-y-2">
              <Row icon={<WalletCards size={14} />} label="Esquema"          value={capitalize(result.scheme)} />
              <Row icon={<CreditCard size={14} />}  label="Tipo"             value={capitalize(result.type)} />
              <Row icon={<Smartphone size={14} />}  label="Marca / Brand"    value={result.brand ?? "—"} />
              <Row icon={<ShieldCheck size={14} />} label="Prepaid"          value={result.prepaid === true ? "Sí" : result.prepaid === false ? "No" : "—"} copyable={false} />
              <Row icon={<ShieldCheck size={14} />} label="Longitud tarjeta" value={result.number?.length ? String(result.number.length) : "—"} copyable={false} />
              <Row icon={<ShieldCheck size={14} />} label="Validación Luhn"  value={result.number?.luhn === true ? "Válida" : result.number?.luhn === false ? "No válida" : "—"} copyable={false} />
            </div>
          </div>

          {result.bank && (
            <div className="rounded-3xl border-2 border-slate-200 p-4 shadow-md dark:border-white/10 dark:bg-slate-800" style={{ backgroundColor: "#ffffff" }}>
              <p className="mb-3 text-xs font-black uppercase tracking-wider" style={{ color: "#94a3b8" }}>Banco emisor</p>
              <div className="space-y-2">
                <Row icon={<Landmark size={14} />}  label="Banco"     value={result.bank.name ?? "—"} />
                <Row icon={<Building2 size={14} />} label="Ciudad"    value={result.bank.city ?? "—"} />
                <Row icon={<Globe size={14} />}     label="Sitio web" value={result.bank.url ?? "—"} />
                <Row icon={<Search size={14} />}    label="Teléfono"  value={result.bank.phone ?? "—"} />
              </div>
            </div>
          )}

          {result.country && (
            <div className="rounded-3xl border-2 border-slate-200 p-4 shadow-md dark:border-white/10 dark:bg-slate-800" style={{ backgroundColor: "#ffffff" }}>
              <p className="mb-3 text-xs font-black uppercase tracking-wider" style={{ color: "#94a3b8" }}>País</p>
              <div className="space-y-2">
                <Row icon={<Globe size={14} />} label="País"   value={result.country.name ? `${result.country.emoji ?? ""} ${result.country.name}` : "—"} />
                <Row icon={<Globe size={14} />} label="Código" value={result.country.alpha2 ?? "—"} />
                <Row icon={<Globe size={14} />} label="Moneda" value={result.country.currency ?? "—"} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Historial */}
      {history.length > 0 && (
        <div className="rounded-3xl border-2 border-slate-200 p-4 shadow-md dark:border-white/10 dark:bg-slate-800" style={{ backgroundColor: "#ffffff" }}>
          <p className="mb-3 text-xs font-black uppercase tracking-wider" style={{ color: "#94a3b8" }}>Historial de consultas</p>
          <div className="flex flex-wrap gap-2">
            {history.map((h) => (
              <button key={h.bin}
                onClick={() => { setInput(h.bin); handleCheck(h.bin); }}
                className="flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-1.5 text-xs font-bold transition-all hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
                style={{ backgroundColor: "#f8fafc" }}>
                <CreditCard size={11} className="text-violet-500" />
                <span style={{ color: "#1e293b" }}>{h.bin}</span>
                {h.scheme && <span className="text-slate-400">· {capitalize(h.scheme)}</span>}
                {h.type && <span className="text-slate-400">· {capitalize(h.type)}</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {status === "idle" && history.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-slate-300 py-16 text-center dark:border-white/10 dark:bg-slate-800/50"
          style={{ backgroundColor: "#f8fafc" }}>
          <CreditCard size={36} className="text-slate-400" />
          <p className="text-sm font-bold" style={{ color: "#475569" }}>
            Ingresa un BIN y presiona <span style={{ color: "#6366f1" }}>Verificar</span>
          </p>
          <p className="text-xs font-semibold" style={{ color: "#64748b" }}>
            Consulta server-side vía proxy interno · datos de <strong>binlist.net</strong>
          </p>
        </div>
      )}
    </div>
  );
}

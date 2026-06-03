"use client";

import { useState, useEffect, useTransition } from "react";
import {
  X, Plane, CreditCard, Tag, Save, Loader2,
  CheckCircle2, AlertCircle, ChevronDown, Search,
  NotebookPen, Clock, User,
} from "lucide-react";
import { saveWorkspaceNoteAction, searchFlightsAction } from "@/app/admin/tools/workspace/actions";

// ── Tipos ─────────────────────────────────────────────────────────────────────
export type WorkspaceLabel = "aprobado" | "declinado" | "ban" | "riesgoso";

export interface FlightOption {
  id: string;
  flight_folio: string | null;
  flight_date: string;
  flight_type: string | null;
  fare_type: string;
  total_amount: number | null;
  profiles: { full_name: string | null; email: string | null } | null;
}

export interface WorkspaceNote {
  id: string;
  flight_id: string | null;
  cc_last4: string | null;
  cc_brand: string | null;
  cc_holder: string | null;
  label: WorkspaceLabel;
  content: string;
  created_at: string;
  admin_id: string;
  flights?: FlightOption | null;
}

// ── Config etiquetas ─────────────────────────────────────────────────────────────
export const LABEL_CONFIG: Record<WorkspaceLabel, { label: string; bg: string; text: string; border: string; dot: string }> = {
  aprobado:  { label: "Aprobado",  bg: "#dcfce7", text: "#15803d", border: "#86efac", dot: "#22c55e" },
  declinado: { label: "Declinado", bg: "#fee2e2", text: "#b91c1c", border: "#fca5a5", dot: "#ef4444" },
  ban:       { label: "Ban",       bg: "#1e1b4b", text: "#c7d2fe", border: "#4338ca", dot: "#818cf8" },
  riesgoso:  { label: "Riesgoso",  bg: "#fff7ed", text: "#c2410c", border: "#fdba74", dot: "#f97316" },
};

// ── Label Badge ──────────────────────────────────────────────────────────────────
export function LabelBadge({ label }: { label: WorkspaceLabel }) {
  const c = LABEL_CONFIG[label];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1 text-xs font-black uppercase tracking-wider"
      style={{ backgroundColor: c.bg, color: c.text, border: `1.5px solid ${c.border}` }}
    >
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.dot }} />
      {c.label}
    </span>
  );
}

// ── Modal ───────────────────────────────────────────────────────────────────────────
interface ModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function WorkspaceNoteModal({ open, onClose, onSaved }: ModalProps) {
  const [isPending, startTransition] = useTransition();

  // Vuelo
  const [flightQuery, setFlightQuery]     = useState("");
  const [flightResults, setFlightResults] = useState<FlightOption[]>([]);
  const [selectedFlight, setSelectedFlight] = useState<FlightOption | null>(null);
  const [flightOpen, setFlightOpen]       = useState(false);
  const [searching, setSearching]         = useState(false);

  // CC
  const [ccLast4, setCcLast4]   = useState("");
  const [ccBrand, setCcBrand]   = useState("");
  const [ccHolder, setCcHolder] = useState("");

  // Contenido / etiqueta
  const [label, setLabel]     = useState<WorkspaceLabel>("aprobado");
  const [content, setContent] = useState("");

  // Feedback
  const [saved, setSaved] = useState(false);
  const [err, setErr]     = useState("");

  // Buscar vuelos al escribir
  useEffect(() => {
    if (flightQuery.length < 2) { setFlightResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      const res = await searchFlightsAction(flightQuery);
      setFlightResults(res);
      setSearching(false);
    }, 350);
    return () => clearTimeout(t);
  }, [flightQuery]);

  // Auto-rellenar contenido cuando se selecciona vuelo
  useEffect(() => {
    if (!selectedFlight) return;
    const f = selectedFlight;
    const pax = Array.isArray((f as any).passengers) ? (f as any).passengers.length : "?";
    const text = [
      `✈️  Vuelo: ${f.flight_folio ?? f.id}`,
      `📅  Fecha: ${f.flight_date}`,
      `👤  Cliente: ${f.profiles?.full_name ?? "Desconocido"} <${f.profiles?.email ?? ""}>`,
      `🧳  Pasajeros: ${pax}`,
      `💳  Tarifa: ${f.fare_type}  |  Total: $${f.total_amount?.toLocaleString("es-MX") ?? "N/A"} MXN`,
      `📝  Tipo: ${f.flight_type ?? "sencillo"}`,
      "",
      "--- Notas del agente ---",
      "",
    ].join("\n");
    setContent((prev) => text + (prev.includes("Notas del agente") ? prev.split("--- Notas del agente ---\n\n")[1] ?? "" : prev));
  }, [selectedFlight]);

  function reset() {
    setFlightQuery(""); setFlightResults([]); setSelectedFlight(null); setFlightOpen(false);
    setCcLast4(""); setCcBrand(""); setCcHolder("");
    setLabel("aprobado"); setContent(""); setSaved(false); setErr("");
  }

  function handleClose() { reset(); onClose(); }

  function handleSave() {
    if (!content.trim()) { setErr("El contenido no puede estar vacío."); return; }
    setErr("");
    startTransition(async () => {
      const result = await saveWorkspaceNoteAction({
        flight_id:  selectedFlight?.id ?? null,
        cc_last4:   ccLast4 || null,
        cc_brand:   ccBrand || null,
        cc_holder:  ccHolder || null,
        label,
        content,
      });
      if (result.error) { setErr(result.error); return; }
      setSaved(true);
      setTimeout(() => { onSaved(); reset(); onClose(); }, 1200);
    });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.55)" }}>
      <div
        className="relative flex w-full max-w-2xl flex-col overflow-hidden rounded-3xl shadow-2xl"
        style={{ backgroundColor: "#ffffff", maxHeight: "90vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white">
              <NotebookPen size={16} />
            </div>
            <div>
              <p className="text-base font-black" style={{ color: "#0f172a" }}>Nueva nota de espacio de trabajo</p>
              <p className="text-xs font-medium" style={{ color: "#64748b" }}>Enlaza con vuelo + tarjeta y asigna una etiqueta</p>
            </div>
          </div>
          <button onClick={handleClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* ─ Selector de vuelo */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider" style={{ color: "#475569" }}>
              <Plane size={12} /> Importar vuelo (opcional)
            </label>
            <div className="relative">
              <div
                className="flex cursor-pointer items-center gap-2 rounded-2xl border-2 px-4 py-2.5"
                style={{ backgroundColor: "#f1f5f9", borderColor: selectedFlight ? "#6366f1" : "#94a3b8" }}
                onClick={() => setFlightOpen((v) => !v)}
              >
                <Search size={14} className="shrink-0 text-slate-400" />
                <input
                  className="flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-slate-400"
                  style={{ color: "#0f172a" }}
                  placeholder="Buscar por folio, nombre, correo…"
                  value={flightQuery}
                  onChange={(e) => { setFlightQuery(e.target.value); setFlightOpen(true); }}
                  onClick={(e) => e.stopPropagation()}
                />
                {searching && <Loader2 size={14} className="animate-spin text-slate-400" />}
                <ChevronDown size={14} className="shrink-0 text-slate-400" />
              </div>

              {flightOpen && flightResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-2xl border border-slate-200 shadow-xl" style={{ backgroundColor: "#fff" }}>
                  {flightResults.map((f) => (
                    <button
                      key={f.id}
                      className="flex w-full items-start gap-3 px-4 py-3 text-left text-sm hover:bg-slate-50"
                      onClick={() => { setSelectedFlight(f); setFlightQuery(f.flight_folio ?? f.id); setFlightOpen(false); }}
                    >
                      <Plane size={14} className="mt-0.5 shrink-0 text-violet-500" />
                      <div>
                        <p className="font-black" style={{ color: "#0f172a" }}>{f.flight_folio ?? f.id}</p>
                        <p className="text-xs" style={{ color: "#64748b" }}>
                          {f.profiles?.full_name ?? "Usuario"} · {f.flight_date} · ${f.total_amount?.toLocaleString("es-MX") ?? "?"} MXN
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedFlight && (
              <div className="mt-2 flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2">
                <Plane size={13} className="text-violet-600" />
                <span className="text-xs font-black text-violet-700">{selectedFlight.flight_folio ?? selectedFlight.id}</span>
                <span className="text-xs text-violet-500">· {selectedFlight.profiles?.full_name}</span>
                <button onClick={() => { setSelectedFlight(null); setFlightQuery(""); }} className="ml-auto text-violet-400 hover:text-violet-700"><X size={12} /></button>
              </div>
            )}
          </div>

          {/* ─ Datos CC */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider" style={{ color: "#475569" }}>
              <CreditCard size={12} /> Tarjeta de pago (CC) — opcional
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { placeholder: "Últimos 4 dígitos", val: ccLast4, set: setCcLast4, max: 4, label: "Núm." },
                { placeholder: "Marca (Visa, MC…)",  val: ccBrand, set: setCcBrand, max: 20, label: "Marca" },
                { placeholder: "Titular",              val: ccHolder, set: setCcHolder, max: 60, label: "Titular" },
              ].map(({ placeholder, val, set, max, label: lbl }) => (
                <div key={lbl}>
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: "#94a3b8" }}>{lbl}</p>
                  <input
                    maxLength={max}
                    value={val}
                    onChange={(e) => set(e.target.value)}
                    placeholder={placeholder}
                    className="w-full rounded-xl border-2 px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-violet-300"
                    style={{ backgroundColor: "#f8fafc", borderColor: "#cbd5e1", color: "#0f172a" }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* ─ Etiqueta */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider" style={{ color: "#475569" }}>
              <Tag size={12} /> Etiqueta
            </label>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(LABEL_CONFIG) as [WorkspaceLabel, typeof LABEL_CONFIG[WorkspaceLabel]][]).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setLabel(key)}
                  className="flex items-center gap-1.5 rounded-2xl border-2 px-4 py-2 text-xs font-black uppercase tracking-wider transition-all"
                  style={{
                    backgroundColor: label === key ? cfg.bg : "#f8fafc",
                    color:           label === key ? cfg.text : "#94a3b8",
                    borderColor:     label === key ? cfg.border : "#e2e8f0",
                    transform:       label === key ? "scale(1.04)" : "scale(1)",
                  }}
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: label === key ? cfg.dot : "#cbd5e1" }} />
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* ─ Contenido */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider" style={{ color: "#475569" }}>
              <NotebookPen size={12} /> Contenido de la nota
            </label>
            <textarea
              rows={10}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Escribe aquí los detalles del caso, resultados de análisis, observaciones…"
              className="w-full resize-y rounded-2xl border-2 p-4 font-mono text-sm leading-relaxed outline-none focus:ring-2 focus:ring-violet-300"
              style={{ backgroundColor: "#f8fafc", borderColor: "#cbd5e1", color: "#0f172a", minHeight: 180 }}
            />
            <p className="mt-1 text-right text-[11px] font-medium" style={{ color: "#94a3b8" }}>{content.length} caracteres</p>
          </div>

          {/* Error */}
          {err && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <AlertCircle size={14} className="text-red-500" />
              <p className="text-xs font-bold text-red-700">{err}</p>
            </div>
          )}

          {/* Éxito */}
          {saved && (
            <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
              <CheckCircle2 size={14} className="text-green-600" />
              <p className="text-xs font-black text-green-700">¡Nota guardada exitosamente!</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
          <button onClick={handleClose} className="rounded-2xl border-2 border-slate-300 bg-slate-100 px-5 py-2.5 text-sm font-bold text-slate-700 hover:border-slate-400">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isPending || !content.trim()}
            className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 to-indigo-600 px-6 py-2.5 text-sm font-black text-white shadow-lg transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {isPending ? "Guardando…" : "Guardar nota"}
          </button>
        </div>
      </div>
    </div>
  );
}

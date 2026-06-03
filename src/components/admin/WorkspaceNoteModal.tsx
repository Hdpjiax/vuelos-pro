"use client";

import { useState, useEffect, useTransition, useRef, useCallback } from "react";
import {
  X, Plane, CreditCard, Tag, Save, Loader2,
  CheckCircle2, AlertCircle, ChevronDown, Search,
  NotebookPen, Calendar, Link as LinkIcon, GripHorizontal,
} from "lucide-react";
import { saveWorkspaceNoteAction, searchFlightsAction, lookupBinAction } from "@/app/admin/tools/workspace/actions";

// ── Tipos ─────────────────────────────────────────────────────────────────────
export type WorkspaceLabel = "aprobado" | "declinado" | "ban" | "riesgoso";

export interface FlightOption {
  id: string;
  flight_folio: string | null;
  flight_date: string;
  return_flight_date?: string | null;
  flight_time?: string | null;
  flight_type: string | null;
  fare_type: string;
  total_amount: number | null;
  passengers?: Array<{ full_name?: string; birth_date?: string; document?: string }> | null;
  profiles: { full_name: string | null; email: string | null } | null;
}

export interface WorkspaceNote {
  id: string;
  flight_id: string | null;
  cc_number: string | null;
  cc_holder: string | null;
  cc_address: string | null;
  cc_bank: string | null;
  cc_charge_date: string | null;
  site_url: string | null;
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

// ── helpers de formato tarjeta ────────────────────────────────────────────────────
function formatCardDisplay(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
}

// ── Modal principal ───────────────────────────────────────────────────────────────────
interface ModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function WorkspaceNoteModal({ open, onClose, onSaved }: ModalProps) {
  const [isPending, startTransition] = useTransition();

  // ─ Vuelo
  const [flightQuery, setFlightQuery]       = useState("");
  const [flightResults, setFlightResults]   = useState<FlightOption[]>([]);
  const [selectedFlight, setSelectedFlight] = useState<FlightOption | null>(null);
  const [flightOpen, setFlightOpen]         = useState(false);
  const [searching, setSearching]           = useState(false);

  // ─ CC
  const [ccNumber, setCcNumber]     = useState("");   // 16 dígitos raw
  const [ccHolder, setCcHolder]     = useState("");
  const [ccAddress, setCcAddress]   = useState("");
  const [ccBank, setCcBank]         = useState("");   // auto desde BIN
  const [binLoading, setBinLoading] = useState(false);
  const [binInfo, setBinInfo]       = useState<string | null>(null);

  // ─ Fecha cargo / sitio
  const [chargeDate, setChargeDate] = useState("");
  const [siteUrl, setSiteUrl]       = useState("");

  // ─ Contenido / etiqueta
  const [label, setLabel]     = useState<WorkspaceLabel>("aprobado");
  const [content, setContent] = useState("");

  // ─ Feedback
  const [saved, setSaved] = useState(false);
  const [err, setErr]     = useState("");

  // ─ Drag
  const modalRef   = useRef<HTMLDivElement>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const dragging   = useRef(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  // Centrar en el viewport al abrir
  useEffect(() => {
    if (open) {
      setPos(null); // reset para centrar
    }
  }, [open]);

  // ── Drag handlers ──────────────────────────────────────────────────────────────
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (!modalRef.current) return;
    dragging.current = true;
    const rect = modalRef.current.getBoundingClientRect();
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    e.preventDefault();
  }, []);

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!dragging.current) return;
      setPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
    }
    function onUp() { dragging.current = false; }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, []);

  // ── BIN lookup automático ─────────────────────────────────────────────────────────
  useEffect(() => {
    const digits = ccNumber.replace(/\D/g, "");
    if (digits.length < 6) { setBinInfo(null); setCcBank(""); return; }
    const bin = digits.slice(0, 6);
    const t = setTimeout(async () => {
      setBinLoading(true);
      const result = await lookupBinAction(bin);
      setBinLoading(false);
      if (result) {
        setBinInfo(`${result.bank} · ${result.scheme?.toUpperCase() ?? ""} · ${result.country ?? ""}`);
        setCcBank(result.bank ?? "");
      } else {
        setBinInfo(null);
        setCcBank("");
      }
    }, 400);
    return () => clearTimeout(t);
  }, [ccNumber]);

  // ── Buscar vuelos ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (flightQuery.length < 2) { setFlightResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      const res = await searchFlightsAction(flightQuery);
      setFlightResults(res as FlightOption[]);
      setSearching(false);
    }, 350);
    return () => clearTimeout(t);
  }, [flightQuery]);

  // ── Auto-rellenar textarea con datos del vuelo ──────────────────────────────────
  useEffect(() => {
    if (!selectedFlight) return;
    const f = selectedFlight;
    const paxLines = Array.isArray(f.passengers) && f.passengers.length
      ? f.passengers.map((p, i) =>
          `  ${i + 1}. ${p.full_name ?? "N/A"}${p.birth_date ? " | DOB: " + p.birth_date : ""}${p.document ? " | Doc: " + p.document : ""}`
        ).join("\n")
      : "  N/A";

    const text = [
      `✈️  Vuelo: ${f.flight_folio ?? f.id}`,
      `📍  Tipo: ${f.flight_type ?? "sencillo"}`,
      `📅  Ida: ${f.flight_date}${f.flight_time ? " " + f.flight_time : ""}`,
      f.return_flight_date ? `🔄  Regreso: ${f.return_flight_date}` : null,
      `💰  Tarifa: ${f.fare_type}  |  Total: $${f.total_amount?.toLocaleString("es-MX") ?? "N/A"} MXN`,
      `👤  Cliente: ${f.profiles?.full_name ?? "Desconocido"} <${f.profiles?.email ?? ""}>`,
      `🧳  Pasajeros:`,
      paxLines,
      "",
      "--- Notas del agente ---",
      "",
    ].filter((l) => l !== null).join("\n");

    setContent(text);
  }, [selectedFlight]);

  // ── Reset / Close / Save ──────────────────────────────────────────────────────────────
  function reset() {
    setFlightQuery(""); setFlightResults([]); setSelectedFlight(null); setFlightOpen(false);
    setCcNumber(""); setCcHolder(""); setCcAddress(""); setCcBank(""); setBinInfo(null);
    setChargeDate(""); setSiteUrl("");
    setLabel("aprobado"); setContent(""); setSaved(false); setErr("");
  }
  function handleClose() { reset(); onClose(); }

  function handleSave() {
    if (!content.trim()) { setErr("El contenido no puede estar vacío."); return; }
    setErr("");
    startTransition(async () => {
      const digits = ccNumber.replace(/\D/g, "");
      const result = await saveWorkspaceNoteAction({
        flight_id:      selectedFlight?.id ?? null,
        cc_number:      digits || null,
        cc_holder:      ccHolder || null,
        cc_address:     ccAddress || null,
        cc_bank:        ccBank || null,
        cc_charge_date: chargeDate || null,
        site_url:       siteUrl || null,
        label,
        content,
      });
      if (result.error) { setErr(result.error); return; }
      setSaved(true);
      setTimeout(() => { onSaved(); reset(); onClose(); }, 1200);
    });
  }

  if (!open) return null;

  // Posición: centrado o arrastrado
  const modalStyle: React.CSSProperties = pos
    ? { position: "fixed", left: pos.x, top: pos.y, transform: "none", maxHeight: "90vh" }
    : { position: "fixed", left: "50%", top: "50%", transform: "translate(-50%, -50%)", maxHeight: "90vh" };

  return (
    // Overlay semi-transparente, pointer-events:none para que no bloquee el fondo
    <div className="fixed inset-0 z-50" style={{ pointerEvents: "none" }}>
      {/* Ventana arrastrable */}
      <div
        ref={modalRef}
        className="flex w-full max-w-2xl flex-col overflow-hidden rounded-3xl shadow-2xl"
        style={{ ...modalStyle, backgroundColor: "#ffffff", pointerEvents: "auto", width: 680, zIndex: 51 }}
      >
        {/* ── Header / drag handle ── */}
        <div
          className="flex cursor-grab items-center justify-between border-b border-slate-200 px-6 py-4 active:cursor-grabbing"
          style={{ backgroundColor: "#f8fafc", userSelect: "none" }}
          onMouseDown={onMouseDown}
        >
          <div className="flex items-center gap-2">
            <GripHorizontal size={15} className="text-slate-400" />
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white">
              <NotebookPen size={16} />
            </div>
            <div>
              <p className="text-base font-black" style={{ color: "#0f172a" }}>Nueva nota — Workspace</p>
              <p className="text-xs font-medium" style={{ color: "#64748b" }}>Arrastra para mover · el fondo sigue activo</p>
            </div>
          </div>
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={handleClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Cuerpo scrollable ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* ─ Importar vuelo */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider" style={{ color: "#475569" }}>
              <Plane size={12} /> Importar vuelo (opcional)
            </label>
            <div className="relative">
              <div
                className="flex cursor-text items-center gap-2 rounded-2xl border-2 px-4 py-2.5"
                style={{ backgroundColor: "#f1f5f9", borderColor: selectedFlight ? "#6366f1" : "#94a3b8" }}
              >
                <Search size={14} className="shrink-0 text-slate-400" />
                <input
                  className="flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-slate-400"
                  style={{ color: "#0f172a" }}
                  placeholder="Buscar por folio, nombre o correo…"
                  value={flightQuery}
                  onChange={(e) => { setFlightQuery(e.target.value); setFlightOpen(true); }}
                  onFocus={() => flightQuery.length >= 2 && setFlightOpen(true)}
                />
                {searching && <Loader2 size={14} className="animate-spin text-slate-400" />}
                {!searching && <ChevronDown size={14} className="shrink-0 text-slate-400" />}
              </div>

              {flightOpen && flightResults.length > 0 && (
                <div
                  className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-2xl border border-slate-200 shadow-2xl"
                  style={{ backgroundColor: "#fff" }}
                >
                  {flightResults.map((f) => {
                    const pax = Array.isArray(f.passengers) ? f.passengers : [];
                    return (
                      <button
                        key={f.id}
                        className="flex w-full flex-col gap-0.5 px-4 py-3 text-left hover:bg-violet-50"
                        onClick={() => { setSelectedFlight(f); setFlightQuery(f.flight_folio ?? f.id); setFlightOpen(false); }}
                      >
                        <div className="flex items-center gap-2">
                          <Plane size={13} className="shrink-0 text-violet-500" />
                          <span className="font-black text-sm" style={{ color: "#0f172a" }}>{f.flight_folio ?? f.id}</span>
                          <span className="ml-auto text-[11px] font-bold" style={{ color: "#6366f1" }}>${f.total_amount?.toLocaleString("es-MX")} MXN</span>
                        </div>
                        <p className="pl-5 text-[11px]" style={{ color: "#64748b" }}>
                          {f.profiles?.full_name ?? "Usuario"} · {f.flight_date}{f.return_flight_date ? " → " + f.return_flight_date : ""} · {f.fare_type}
                        </p>
                        {pax.length > 0 && (
                          <p className="pl-5 text-[10px]" style={{ color: "#94a3b8" }}>
                            Pax: {pax.map((p) => p.full_name).filter(Boolean).join(", ")}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {selectedFlight && (
              <div className="mt-2 flex flex-wrap items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2">
                <Plane size={13} className="shrink-0 text-violet-600" />
                <span className="text-xs font-black text-violet-700">{selectedFlight.flight_folio ?? selectedFlight.id}</span>
                <span className="text-xs text-violet-500">· {selectedFlight.profiles?.full_name} · {selectedFlight.flight_date}</span>
                <button
                  onClick={() => { setSelectedFlight(null); setFlightQuery(""); setContent(""); }}
                  className="ml-auto text-violet-400 hover:text-violet-700"
                ><X size={12} /></button>
              </div>
            )}
          </div>

          {/* ─ Tarjeta CC */}
          <div>
            <label className="mb-2 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider" style={{ color: "#475569" }}>
              <CreditCard size={12} /> Tarjeta de pago (CC) — opcional
            </label>

            {/* Número completo + BIN */}
            <div className="mb-3">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: "#94a3b8" }}>Número de tarjeta (16 dígitos)</p>
              <div className="relative">
                <input
                  value={formatCardDisplay(ccNumber)}
                  onChange={(e) => setCcNumber(e.target.value.replace(/\D/g, "").slice(0, 16))}
                  placeholder="0000 0000 0000 0000"
                  className="w-full rounded-xl border-2 px-4 py-2.5 font-mono text-sm font-bold tracking-widest outline-none focus:ring-2 focus:ring-violet-300"
                  style={{ backgroundColor: "#f8fafc", borderColor: ccNumber.replace(/\D/g,"").length >= 6 ? "#6366f1" : "#cbd5e1", color: "#0f172a", letterSpacing: "0.12em" }}
                  inputMode="numeric"
                />
                {binLoading && (
                  <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-violet-400" />
                )}
              </div>
              {binInfo && (
                <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-violet-100 bg-violet-50 px-3 py-1.5">
                  <CreditCard size={12} className="text-violet-500" />
                  <span className="text-[11px] font-black text-violet-700">{binInfo}</span>
                  {ccBank && <span className="ml-auto rounded-lg bg-violet-100 px-2 py-0.5 text-[10px] font-black text-violet-600">{ccBank}</span>}
                </div>
              )}
            </div>

            {/* Nombre + Dirección */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: "#94a3b8" }}>Nombre del titular</p>
                <input
                  value={ccHolder}
                  onChange={(e) => setCcHolder(e.target.value)}
                  placeholder="Nombre completo"
                  maxLength={80}
                  className="w-full rounded-xl border-2 px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-violet-300"
                  style={{ backgroundColor: "#f8fafc", borderColor: "#cbd5e1", color: "#0f172a" }}
                />
              </div>
              <div>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: "#94a3b8" }}>Dirección de facturación</p>
                <input
                  value={ccAddress}
                  onChange={(e) => setCcAddress(e.target.value)}
                  placeholder="Ciudad, Estado, País"
                  maxLength={120}
                  className="w-full rounded-xl border-2 px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-violet-300"
                  style={{ backgroundColor: "#f8fafc", borderColor: "#cbd5e1", color: "#0f172a" }}
                />
              </div>
            </div>
          </div>

          {/* ─ Fecha de cargo + Sitio */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider" style={{ color: "#475569" }}>
                <Calendar size={12} /> Fecha del cargo
              </label>
              <input
                type="date"
                value={chargeDate}
                onChange={(e) => setChargeDate(e.target.value)}
                className="w-full rounded-xl border-2 px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-violet-300"
                style={{ backgroundColor: "#f8fafc", borderColor: "#cbd5e1", color: "#0f172a" }}
              />
            </div>
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider" style={{ color: "#475569" }}>
                <LinkIcon size={12} /> Sitio / URL
              </label>
              <input
                type="url"
                value={siteUrl}
                onChange={(e) => setSiteUrl(e.target.value)}
                placeholder="https://"
                className="w-full rounded-xl border-2 px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-violet-300"
                style={{ backgroundColor: "#f8fafc", borderColor: "#cbd5e1", color: "#0f172a" }}
              />
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
                    backgroundColor: label === key ? cfg.bg  : "#f8fafc",
                    color:           label === key ? cfg.text : "#94a3b8",
                    borderColor:     label === key ? cfg.border : "#e2e8f0",
                    transform:       label === key ? "scale(1.05)" : "scale(1)",
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
              placeholder="Escribe aquí los detalles del caso…"
              className="w-full resize-y rounded-2xl border-2 p-4 font-mono text-sm leading-relaxed outline-none focus:ring-2 focus:ring-violet-300"
              style={{ backgroundColor: "#f8fafc", borderColor: "#cbd5e1", color: "#0f172a", minHeight: 160 }}
            />
            <p className="mt-1 text-right text-[11px] font-medium" style={{ color: "#94a3b8" }}>{content.length} caracteres</p>
          </div>

          {err && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <AlertCircle size={14} className="text-red-500" />
              <p className="text-xs font-bold text-red-700">{err}</p>
            </div>
          )}
          {saved && (
            <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
              <CheckCircle2 size={14} className="text-green-600" />
              <p className="text-xs font-black text-green-700">¡Nota guardada exitosamente!</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4" style={{ backgroundColor: "#f8fafc" }}>
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={handleClose}
            className="rounded-2xl border-2 border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 hover:border-slate-400"
          >
            Cancelar
          </button>
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={handleSave}
            disabled={isPending || !content.trim()}
            className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 to-indigo-600 px-6 py-2.5 text-sm font-black text-white shadow-lg transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {isPending ? "Guardando…" : "Guardar nota"}
          </button>
        </div>
      </div>
    </div>
  );
}

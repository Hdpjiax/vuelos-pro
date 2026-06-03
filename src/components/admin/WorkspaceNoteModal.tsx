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

// ── Etiquetas ─────────────────────────────────────────────────────────────────
export const LABEL_CONFIG: Record<WorkspaceLabel, { label: string; bg: string; text: string; border: string; dot: string }> = {
  aprobado:  { label: "Aprobado",  bg: "#dcfce7", text: "#15803d", border: "#86efac", dot: "#22c55e" },
  declinado: { label: "Declinado", bg: "#fee2e2", text: "#b91c1c", border: "#fca5a5", dot: "#ef4444" },
  ban:       { label: "Ban",       bg: "#1e1b4b", text: "#c7d2fe", border: "#4338ca", dot: "#818cf8" },
  riesgoso:  { label: "Riesgoso",  bg: "#fff7ed", text: "#c2410c", border: "#fdba74", dot: "#f97316" },
};

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

function formatCardDisplay(raw: string) {
  return raw.replace(/\D/g, "").slice(0, 16).replace(/(\d{4})(?=\d)/g, "$1 ");
}

// ── Estilos comunes ───────────────────────────────────────────────────────────
const S = {
  // Label encima de cada campo
  fieldLabel: {
    display: "flex" as const,
    alignItems: "center" as const,
    gap: "6px",
    fontSize: 11,
    fontWeight: 800,
    textTransform: "uppercase" as const,
    letterSpacing: "0.1em",
    color: "#1e293b",       // slate-800 — muy legible
    marginBottom: 6,
  },
  // Sub-label gris dentro de grupos de inputs
  subLabel: {
    fontSize: 10,
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    color: "#334155",       // slate-700
    marginBottom: 4,
  },
  // Input base
  input: {
    width: "100%",
    borderRadius: 12,
    border: "2px solid #cbd5e1",
    padding: "9px 12px",
    fontSize: 14,
    fontWeight: 600,
    outline: "none",
    backgroundColor: "#fcf8f8",
    color: "#0f172a",       // slate-950 — máximo contraste
  },
};

// ── Modal ──────────────────────────────────────────────────────────────────────
interface ModalProps { open: boolean; onClose: () => void; onSaved: () => void; }

export function WorkspaceNoteModal({ open, onClose, onSaved }: ModalProps) {
  const [isPending, startTransition] = useTransition();

  const [flightQuery, setFlightQuery]       = useState("");
  const [flightResults, setFlightResults]   = useState<FlightOption[]>([]);
  const [selectedFlight, setSelectedFlight] = useState<FlightOption | null>(null);
  const [flightOpen, setFlightOpen]         = useState(false);
  const [searching, setSearching]           = useState(false);

  const [ccNumber, setCcNumber]     = useState("");
  const [ccHolder, setCcHolder]     = useState("");
  const [ccAddress, setCcAddress]   = useState("");
  const [ccBank, setCcBank]         = useState("");
  const [binLoading, setBinLoading] = useState(false);
  const [binInfo, setBinInfo]       = useState<string | null>(null);

  const [chargeDate, setChargeDate] = useState("");
  const [siteUrl, setSiteUrl]       = useState("");

  const [label, setLabel]     = useState<WorkspaceLabel>("aprobado");
  const [content, setContent] = useState("");

  const [saved, setSaved] = useState(false);
  const [err, setErr]     = useState("");

  // Drag
  const modalRef   = useRef<HTMLDivElement>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const dragging   = useRef(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => { if (open) setPos(null); }, [open]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (!modalRef.current) return;
    dragging.current = true;
    const rect = modalRef.current.getBoundingClientRect();
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    e.preventDefault();
  }, []);

  useEffect(() => {
    function onMove(e: MouseEvent) { if (dragging.current) setPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y }); }
    function onUp() { dragging.current = false; }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, []);

  // BIN lookup
  useEffect(() => {
    const digits = ccNumber.replace(/\D/g, "");
    if (digits.length < 6) { setBinInfo(null); setCcBank(""); return; }
    const t = setTimeout(async () => {
      setBinLoading(true);
      const result = await lookupBinAction(digits.slice(0, 6));
      setBinLoading(false);
      if (result) {
        setBinInfo(`${result.bank} · ${result.scheme?.toUpperCase() ?? ""} · ${result.country ?? ""}`);
        setCcBank(result.bank ?? "");
      } else { setBinInfo(null); setCcBank(""); }
    }, 400);
    return () => clearTimeout(t);
  }, [ccNumber]);

  // Buscar vuelos
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

  // Auto-rellenar desde vuelo
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
      const result = await saveWorkspaceNoteAction({
        flight_id:      selectedFlight?.id ?? null,
        cc_number:      ccNumber.replace(/\D/g, "") || null,
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

  const modalStyle: React.CSSProperties = pos
    ? { position: "fixed", left: pos.x, top: pos.y, transform: "none", maxHeight: "82vh" }
    : { position: "fixed", left: "50%", top: "50%", transform: "translate(-50%, -20%)", maxHeight: "80vh" };

  return (
    <div className="fixed inset-0 z-50" style={{ pointerEvents: "none" }}>
      <div
        ref={modalRef}
        className="flex flex-col overflow-hidden rounded-3xl"
        style={{
          ...modalStyle,
          width: 700,
          pointerEvents: "auto",
          zIndex: 51,
          backgroundColor: "#ffffff",
          border: "2px solid #e2e8f0",
          boxShadow: "0 32px 80px rgba(0,0,0,0.22), 0 8px 24px rgba(99,102,241,0.12)",
        }}
      >
        {/* ── Header / drag handle ── */}
        <div
          onMouseDown={onMouseDown}
          className="flex cursor-grab items-center justify-between px-6 py-4 active:cursor-grabbing"
          style={{
            background: "linear-gradient(90deg,#0f172a,#1e1b4b,#312e81)",
            color: "#fff",
            userSelect: "none",
          }}
        >
          <div className="flex min-w-0 items-center gap-3">
            <GripHorizontal size={16} className="shrink-0 text-cyan-100" />
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 text-white shadow-lg shadow-violet-500/30">
              <NotebookPen size={17} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-black">Nueva nota — Workspace</p>
              <p className="truncate text-xs font-semibold text-cyan-100/85">Click y arrastra desde esta barra · borrador automático activo</p>
            </div>
          </div>
          <button onClick={handleClose} className="rounded-xl p-2 text-cyan-100/80 transition hover:bg-white/10 hover:text-white" aria-label="Cerrar ventana">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5" style={{ background: "#ffffff", color: "#0f172a" }}>
          <div>
            <label style={S.fieldLabel}><Plane size={12} /> Importar vuelo (opcional)</label>
            <div className="relative">
              <div className={`flex cursor-text items-center gap-2 rounded-2xl border-2 px-4 py-3 transition ${selectedFlight ? "border-violet-500" : "border-slate-400"} bg-white shadow-sm`}>
                <Search size={14} className="shrink-0 text-slate-600" />
                <input
                  className="flex-1 bg-transparent text-sm font-bold text-slate-950 outline-none placeholder:text-slate-500"
                  placeholder="Buscar por folio, nombre o correo..."
                  value={flightQuery}
                  onChange={(e) => { setFlightQuery(e.target.value); setFlightOpen(true); }}
                  onFocus={() => flightQuery.length >= 2 && setFlightOpen(true)}
                />
                {searching ? <Loader2 size={14} className="animate-spin text-violet-600" /> : <ChevronDown size={14} className="shrink-0 text-slate-600" />}
              </div>
              {flightOpen && flightResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-20 mt-2 max-h-64 overflow-y-auto rounded-2xl border-2 border-slate-300 bg-white shadow-2xl">
                  {flightResults.map((f) => {
                    const pax = Array.isArray(f.passengers) ? f.passengers : [];
                    return (
                      <button key={f.id} className="flex w-full flex-col gap-0.5 px-4 py-3 text-left transition hover:bg-violet-50" onClick={() => { setSelectedFlight(f); setFlightQuery(f.flight_folio ?? f.id); setFlightOpen(false); }}>
                        <div className="flex items-center gap-2">
                          <Plane size={13} className="shrink-0 text-violet-600" />
                          <span className="text-sm font-black text-slate-950">{f.flight_folio ?? f.id}</span>
                          <span className="ml-auto text-[11px] font-black text-violet-700">${f.total_amount?.toLocaleString("es-MX")} MXN</span>
                        </div>
                        <p className="pl-5 text-[11px] font-semibold text-slate-600">{f.profiles?.full_name ?? "Usuario"} · {f.flight_date}{f.return_flight_date ? " → " + f.return_flight_date : ""} · {f.fare_type}</p>
                        {pax.length > 0 && <p className="pl-5 text-[10px] font-semibold text-slate-500">Pax: {pax.map((p) => p.full_name).filter(Boolean).join(", ")}</p>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            {selectedFlight && (
              <div className="mt-2 flex flex-wrap items-center gap-2 rounded-xl border-2 border-violet-200 bg-violet-50 px-3 py-2">
                <Plane size={13} className="shrink-0 text-violet-700" />
                <span className="text-s font-black text-violet-800">{selectedFlight.flight_folio ?? selectedFlight.id}</span>
                <span className="text-s font-bold text-violet-700">· {selectedFlight.profiles?.full_name} · {selectedFlight.flight_date}</span>
                <button onClick={() => { setSelectedFlight(null); setFlightQuery(""); }} className="ml-auto text-violet-600 hover:text-violet-900"><X size={12} /></button>
              </div>
            )}
          </div>

          <div>
            <label style={S.fieldLabel}><CreditCard size={12} /> Tarjeta de pago (CC) — opcional</label>
            <div className="mb-3">
              <p style={S.subLabel}>Número de tarjeta (16 dígitos)</p>
              <div className="relative">
                <input value={formatCardDisplay(ccNumber)} onChange={(e) => setCcNumber(e.target.value.replace(/\D/g, "").slice(0, 16))} placeholder="0000 0000 0000 0000" style={{ ...S.input, fontFamily: "monospace", letterSpacing: "0.08em" }} inputMode="numeric" />
                {binLoading && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-violet-600" />}
              </div>
              {binInfo && (
                <div className="mt-2 flex items-center gap-2 rounded-xl border-2 border-violet-200 bg-violet-50 px-3 py-2">
                  <CreditCard size={12} className="text-violet-700" />
                  <span className="text-[14px] font-black text-violet-800">{binInfo}</span>
                  {ccBank && <span className="ml-auto rounded-lg bg-violet-100 px-2 py-0.5 text-[14px] font-black text-violet-700">{ccBank}</span>}
                </div>
              )}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Nombre del titular" value={ccHolder} onChange={setCcHolder} placeholder="Nombre completo" maxLength={80} />
              <Field label="Dirección de facturación" value={ccAddress} onChange={setCcAddress} placeholder="Ciudad, Estado, País" maxLength={120} />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label style={S.fieldLabel}><Calendar size={12} /> Fecha del cargo</label>
              <input type="date" value={chargeDate} onChange={(e) => setChargeDate(e.target.value)} style={S.input} />
            </div>
            <div>
              <label style={S.fieldLabel}><LinkIcon size={12} /> Sitio / URL</label>
              <input type="url" value={siteUrl} onChange={(e) => setSiteUrl(e.target.value)} placeholder="https://" style={S.input} />
            </div>
          </div>

          <div>
            <label style={S.fieldLabel}><Tag size={12} /> Etiqueta</label>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(LABEL_CONFIG) as [WorkspaceLabel, typeof LABEL_CONFIG[WorkspaceLabel]][]).map(([key, cfg]) => (
                <button key={key} onClick={() => setLabel(key)} className="flex items-center gap-1.5 rounded-2xl border-2 px-4 py-2 text-xs font-black uppercase tracking-wider transition-all hover:-translate-y-0.5" style={{ backgroundColor: label === key ? cfg.bg : "#ffffff", color: label === key ? cfg.text : "#334155", borderColor: label === key ? cfg.border : "#cbd5e1", transform: label === key ? "scale(1.03)" : "scale(1)" }}>
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: label === key ? cfg.dot : "#64748b" }} />
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={S.fieldLabel}><NotebookPen size={12} /> Contenido de la nota</label>
            <textarea rows={10} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Escribe aquí los detalles del caso..." style={{ ...S.input, minHeight: 180, resize: "vertical", padding: 16, fontFamily: "monospace", lineHeight: 1.6 }} />
            <p className="mt-1 text-right text-[11px] font-bold text-slate-600">{content.length} caracteres · guardado automático local</p>
          </div>

          {err && <div className="flex items-center gap-2 rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3"><AlertCircle size={14} className="text-red-600" /><p className="text-xs font-bold text-red-800">{err}</p></div>}
          {saved && <div className="flex items-center gap-2 rounded-xl border-2 border-green-200 bg-green-50 px-4 py-3"><CheckCircle2 size={14} className="text-green-700" /><p className="text-xs font-black text-green-800">Nota guardada exitosamente.</p></div>}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-300 bg-slate-100 px-6 py-4">
          <button onClick={handleClose} className="rounded-2xl border-2 border-slate-400 bg-white px-5 py-2.5 text-sm font-black text-slate-800 transition hover:border-slate-600 hover:bg-slate-50">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={isPending || !content.trim()} className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-500 px-6 py-2.5 text-sm font-black text-white shadow-lg transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50">
            {isPending ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {isPending ? "Guardando..." : "Guardar nota"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, maxLength }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; maxLength: number }) {
  return (
    <div>
      <p style={S.subLabel}>{label}</p>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} maxLength={maxLength} style={S.input} />
    </div>
  );
}

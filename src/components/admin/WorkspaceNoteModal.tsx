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
    backgroundColor: "#f8fafc",
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
    ? { position: "fixed", left: pos.x, top: pos.y, transform: "none", maxHeight: "92vh" }
    : { position: "fixed", left: "50%", top: "50%", transform: "translate(-50%, -50%)", maxHeight: "92vh" };

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
          className="flex cursor-grab items-center justify-between px-6 py-4 active:cursor-grabbing"
          style={{
            background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
            userSelect: "none",
          }}
          onMouseDown={onMouseDown}
        >
          <div className="flex items-center gap-3">
            <GripHorizontal size={16} style={{ color: "rgba(255,255,255,0.6)" }} />
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl" style={{ backgroundColor: "rgba(255,255,255,0.2)" }}>
              <NotebookPen size={17} color="#fff" />
            </div>
            <div>
              <p style={{ color: "#ffffff", fontWeight: 900, fontSize: 15, lineHeight: 1.2 }}>Nueva nota — Workspace</p>
              <p style={{ color: "rgba(255,255,255,0.72)", fontWeight: 500, fontSize: 11, marginTop: 2 }}>
                Arrastra para mover · el fondo sigue activo
              </p>
            </div>
          </div>
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={handleClose}
            className="rounded-xl p-2 transition-all hover:bg-white/20"
            style={{ color: "rgba(255,255,255,0.8)" }}
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">

          {/* Importar vuelo */}
          <div>
            <p style={S.fieldLabel}><Plane size={13} color="#4f46e5" /> Importar vuelo <span style={{ fontWeight: 500, textTransform: "none", letterSpacing: 0, color: "#64748b" }}>(opcional)</span></p>
            <div className="relative">
              <div
                className="flex items-center gap-2 rounded-2xl border-2 px-4 py-2.5"
                style={{ backgroundColor: "#f1f5f9", borderColor: selectedFlight ? "#6366f1" : "#94a3b8" }}
              >
                <Search size={15} style={{ color: "#64748b", flexShrink: 0 }} />
                <input
                  style={{ flex: 1, background: "transparent", outline: "none", fontSize: 14, fontWeight: 600, color: "#0f172a" }}
                  placeholder="Buscar por folio, nombre o correo…"
                  value={flightQuery}
                  onChange={(e) => { setFlightQuery(e.target.value); setFlightOpen(true); }}
                  onFocus={() => flightQuery.length >= 2 && setFlightOpen(true)}
                />
                {searching
                  ? <Loader2 size={14} className="animate-spin" style={{ color: "#6366f1" }} />
                  : <ChevronDown size={14} style={{ color: "#64748b", flexShrink: 0 }} />}
              </div>

              {flightOpen && flightResults.length > 0 && (
                <div
                  className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-2xl border-2 border-slate-200"
                  style={{ backgroundColor: "#fff", boxShadow: "0 16px 40px rgba(0,0,0,0.14)" }}
                >
                  {flightResults.map((f) => {
                    const pax = Array.isArray(f.passengers) ? f.passengers : [];
                    return (
                      <button
                        key={f.id}
                        className="flex w-full flex-col gap-0.5 px-4 py-3 text-left transition-colors hover:bg-violet-50"
                        onClick={() => { setSelectedFlight(f); setFlightQuery(f.flight_folio ?? f.id); setFlightOpen(false); }}
                      >
                        <div className="flex items-center gap-2">
                          <Plane size={13} style={{ color: "#6366f1", flexShrink: 0 }} />
                          <span style={{ fontWeight: 800, fontSize: 13, color: "#0f172a" }}>{f.flight_folio ?? f.id}</span>
                          <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, color: "#6366f1" }}>
                            ${f.total_amount?.toLocaleString("es-MX")} MXN
                          </span>
                        </div>
                        <p style={{ paddingLeft: 21, fontSize: 11, color: "#475569", fontWeight: 600 }}>
                          {f.profiles?.full_name ?? "Usuario"} · {f.flight_date}{f.return_flight_date ? " → " + f.return_flight_date : ""} · {f.fare_type}
                        </p>
                        {pax.length > 0 && (
                          <p style={{ paddingLeft: 21, fontSize: 10, color: "#94a3b8" }}>
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
              <div className="mt-2 flex flex-wrap items-center gap-2 rounded-xl px-3 py-2" style={{ backgroundColor: "#ede9fe", border: "1.5px solid #a5b4fc" }}>
                <Plane size={13} style={{ color: "#4f46e5", flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 800, color: "#3730a3" }}>{selectedFlight.flight_folio ?? selectedFlight.id}</span>
                <span style={{ fontSize: 11, color: "#6d28d9" }}>· {selectedFlight.profiles?.full_name} · {selectedFlight.flight_date}</span>
                <button onClick={() => { setSelectedFlight(null); setFlightQuery(""); setContent(""); }} style={{ marginLeft: "auto", color: "#7c3aed" }}><X size={13} /></button>
              </div>
            )}
          </div>

          {/* Tarjeta CC */}
          <div style={{ borderTop: "1.5px solid #e2e8f0", paddingTop: 16 }}>
            <p style={S.fieldLabel}><CreditCard size={13} color="#4f46e5" /> Tarjeta de pago (CC) <span style={{ fontWeight: 500, textTransform: "none", letterSpacing: 0, color: "#64748b" }}>(opcional)</span></p>

            {/* Número */}
            <div className="mb-3">
              <p style={S.subLabel}>Número de tarjeta (16 dígitos)</p>
              <div className="relative">
                <input
                  value={formatCardDisplay(ccNumber)}
                  onChange={(e) => setCcNumber(e.target.value.replace(/\D/g, "").slice(0, 16))}
                  placeholder="0000 0000 0000 0000"
                  inputMode="numeric"
                  style={{
                    ...S.input,
                    fontFamily: "monospace",
                    letterSpacing: "0.14em",
                    fontSize: 16,
                    fontWeight: 700,
                    borderColor: ccNumber.replace(/\D/g, "").length >= 6 ? "#6366f1" : "#cbd5e1",
                    paddingRight: 40,
                  }}
                />
                {binLoading && <Loader2 size={14} className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin" style={{ color: "#6366f1" }} />}
              </div>
              {binInfo && (
                <div className="mt-1.5 flex items-center gap-2 rounded-xl px-3 py-2" style={{ backgroundColor: "#ede9fe", border: "1.5px solid #a5b4fc" }}>
                  <CreditCard size={12} style={{ color: "#4f46e5" }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#3730a3" }}>{binInfo}</span>
                  {ccBank && <span style={{ marginLeft: "auto", borderRadius: 8, backgroundColor: "#c7d2fe", padding: "2px 8px", fontSize: 10, fontWeight: 800, color: "#3730a3" }}>{ccBank}</span>}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p style={S.subLabel}>Nombre del titular</p>
                <input value={ccHolder} onChange={(e) => setCcHolder(e.target.value)} placeholder="Nombre completo" maxLength={80} style={S.input} />
              </div>
              <div>
                <p style={S.subLabel}>Dirección de facturación</p>
                <input value={ccAddress} onChange={(e) => setCcAddress(e.target.value)} placeholder="Ciudad, Estado, País" maxLength={120} style={S.input} />
              </div>
            </div>
          </div>

          {/* Fecha cargo + Sitio */}
          <div className="grid grid-cols-2 gap-3" style={{ borderTop: "1.5px solid #e2e8f0", paddingTop: 16 }}>
            <div>
              <p style={S.fieldLabel}><Calendar size={13} color="#4f46e5" /> Fecha del cargo</p>
              <input type="date" value={chargeDate} onChange={(e) => setChargeDate(e.target.value)} style={S.input} />
            </div>
            <div>
              <p style={S.fieldLabel}><LinkIcon size={13} color="#4f46e5" /> Sitio / URL</p>
              <input type="url" value={siteUrl} onChange={(e) => setSiteUrl(e.target.value)} placeholder="https://" style={S.input} />
            </div>
          </div>

          {/* Etiqueta */}
          <div style={{ borderTop: "1.5px solid #e2e8f0", paddingTop: 16 }}>
            <p style={S.fieldLabel}><Tag size={13} color="#4f46e5" /> Etiqueta</p>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(LABEL_CONFIG) as [WorkspaceLabel, typeof LABEL_CONFIG[WorkspaceLabel]][]).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setLabel(key)}
                  className="flex items-center gap-1.5 rounded-2xl border-2 px-4 py-2 text-xs font-black uppercase tracking-wider transition-all"
                  style={{
                    backgroundColor: label === key ? cfg.bg  : "#f1f5f9",
                    color:           label === key ? cfg.text : "#334155",
                    borderColor:     label === key ? cfg.border : "#cbd5e1",
                    transform:       label === key ? "scale(1.05)" : "scale(1)",
                    fontWeight: 800,
                  }}
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: label === key ? cfg.dot : "#94a3b8" }} />
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Contenido */}
          <div style={{ borderTop: "1.5px solid #e2e8f0", paddingTop: 16 }}>
            <p style={S.fieldLabel}><NotebookPen size={13} color="#4f46e5" /> Contenido de la nota</p>
            <textarea
              rows={10}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Escribe aquí los detalles del caso…"
              style={{
                width: "100%",
                resize: "vertical",
                borderRadius: 16,
                border: "2px solid #cbd5e1",
                padding: 16,
                fontFamily: "monospace",
                fontSize: 13,
                lineHeight: 1.7,
                outline: "none",
                backgroundColor: "#f8fafc",
                color: "#0f172a",
                minHeight: 160,
              }}
            />
            <p style={{ textAlign: "right", fontSize: 11, color: "#64748b", marginTop: 4, fontWeight: 600 }}>{content.length} caracteres</p>
          </div>

          {err && (
            <div className="flex items-center gap-2 rounded-xl px-4 py-3" style={{ backgroundColor: "#fef2f2", border: "1.5px solid #fca5a5" }}>
              <AlertCircle size={14} style={{ color: "#dc2626" }} />
              <p style={{ fontSize: 12, fontWeight: 700, color: "#b91c1c" }}>{err}</p>
            </div>
          )}
          {saved && (
            <div className="flex items-center gap-2 rounded-xl px-4 py-3" style={{ backgroundColor: "#f0fdf4", border: "1.5px solid #86efac" }}>
              <CheckCircle2 size={14} style={{ color: "#16a34a" }} />
              <p style={{ fontSize: 12, fontWeight: 800, color: "#15803d" }}>¡Nota guardada exitosamente!</p>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderTop: "2px solid #e2e8f0", backgroundColor: "#f8fafc" }}
        >
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={handleClose}
            className="rounded-2xl border-2 px-5 py-2.5 text-sm font-bold transition-all hover:border-slate-400 hover:bg-slate-100"
            style={{ borderColor: "#cbd5e1", backgroundColor: "#fff", color: "#334155" }}
          >
            Cancelar
          </button>
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={handleSave}
            disabled={isPending || !content.trim()}
            className="flex items-center gap-2 rounded-2xl px-6 py-2.5 text-sm font-black text-white shadow-lg transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #6366f1, #7c3aed)", boxShadow: "0 4px 14px rgba(99,102,241,0.4)" }}
          >
            {isPending ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {isPending ? "Guardando…" : "Guardar nota"}
          </button>
        </div>
      </div>
    </div>
  );
}

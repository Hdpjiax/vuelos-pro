"use client";

import { useState, useEffect, useTransition, useRef, useCallback } from "react";
import {
  X, Plane, CreditCard, Tag, Save, Loader2,
  CheckCircle2, AlertCircle, ChevronDown, Search,
  NotebookPen, Calendar, Link as LinkIcon, GripHorizontal,
} from "lucide-react";
import { saveWorkspaceNoteAction, searchFlightsAction, lookupBinAction } from "@/app/admin/tools/workspace/actions";

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

export const LABEL_CONFIG: Record<WorkspaceLabel, { label: string; bg: string; text: string; border: string; dot: string }> = {
  aprobado:  { label: "Aprobado",  bg: "#dcfce7", text: "#15803d", border: "#86efac", dot: "#22c55e" },
  declinado: { label: "Declinado", bg: "#fee2e2", text: "#b91c1c", border: "#fca5a5", dot: "#ef4444" },
  ban:       { label: "Ban",       bg: "#1e1b4b", text: "#c7d2fe", border: "#4338ca", dot: "#818cf8" },
  riesgoso:  { label: "Riesgoso",  bg: "#fff7ed", text: "#c2410c", border: "#fdba74", dot: "#f97316" },
};

const DRAFT_KEY = "vuelospro.workspace.noteDraft.v2";
const OPEN_KEY = "vuelospro.workspace.noteDraft.open";
const MODAL_WIDTH = 760;
const MODAL_HEIGHT_ESTIMATE = 760;

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
  const digits = raw.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getCenteredPos() {
  if (typeof window === "undefined") return { x: 32, y: 32 };
  const width = Math.min(MODAL_WIDTH, window.innerWidth - 24);
  const height = Math.min(MODAL_HEIGHT_ESTIMATE, window.innerHeight - 24);
  return {
    x: Math.max(12, Math.round((window.innerWidth - width) / 2)),
    y: Math.max(12, Math.round((window.innerHeight - height) / 2)),
  };
}

function restorePos(value: unknown) {
  if (!value || typeof value !== "object") return getCenteredPos();
  const raw = value as { x?: unknown; y?: unknown };
  const x = typeof raw.x === "number" ? raw.x : getCenteredPos().x;
  const y = typeof raw.y === "number" ? raw.y : getCenteredPos().y;
  return {
    x: clamp(x, 8, Math.max(8, window.innerWidth - 80)),
    y: clamp(y, 8, Math.max(8, window.innerHeight - 80)),
  };
}

interface ModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

type DraftState = {
  flightQuery: string;
  selectedFlight: FlightOption | null;
  ccNumber: string;
  ccHolder: string;
  ccAddress: string;
  ccBank: string;
  chargeDate: string;
  siteUrl: string;
  label: WorkspaceLabel;
  content: string;
  pos: { x: number; y: number };
};

export function WorkspaceNoteModal({ open, onClose, onSaved }: ModalProps) {
  const [isPending, startTransition] = useTransition();

  const [flightQuery, setFlightQuery] = useState("");
  const [flightResults, setFlightResults] = useState<FlightOption[]>([]);
  const [selectedFlight, setSelectedFlight] = useState<FlightOption | null>(null);
  const [flightOpen, setFlightOpen] = useState(false);
  const [searching, setSearching] = useState(false);

  const [ccNumber, setCcNumber] = useState("");
  const [ccHolder, setCcHolder] = useState("");
  const [ccAddress, setCcAddress] = useState("");
  const [ccBank, setCcBank] = useState("");
  const [binLoading, setBinLoading] = useState(false);
  const [binInfo, setBinInfo] = useState<string | null>(null);

  const [chargeDate, setChargeDate] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [label, setLabel] = useState<WorkspaceLabel>("aprobado");
  const [content, setContent] = useState("");

  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");
  const [pos, setPos] = useState(() => getCenteredPos());
  const [draftLoaded, setDraftLoaded] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const dragging = useRef(false);
  const frame = useRef<number | null>(null);
  const latestPointer = useRef({ x: 0, y: 0 });

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw) as Partial<DraftState>;
        setFlightQuery(draft.flightQuery ?? "");
        setSelectedFlight(draft.selectedFlight ?? null);
        setCcNumber(draft.ccNumber ?? "");
        setCcHolder(draft.ccHolder ?? "");
        setCcAddress(draft.ccAddress ?? "");
        setCcBank(draft.ccBank ?? "");
        setChargeDate(draft.chargeDate ?? "");
        setSiteUrl(draft.siteUrl ?? "");
        setLabel(draft.label ?? "aprobado");
        setContent(draft.content ?? "");
        setPos(restorePos(draft.pos));
      } else {
        setPos(getCenteredPos());
      }
    } catch {
      setPos(getCenteredPos());
    } finally {
      setDraftLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!draftLoaded) return;
    const draft: DraftState = {
      flightQuery,
      selectedFlight,
      ccNumber,
      ccHolder,
      ccAddress,
      ccBank,
      chargeDate,
      siteUrl,
      label,
      content,
      pos,
    };
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [draftLoaded, flightQuery, selectedFlight, ccNumber, ccHolder, ccAddress, ccBank, chargeDate, siteUrl, label, content, pos]);

  useEffect(() => {
    window.localStorage.setItem(OPEN_KEY, open ? "1" : "0");
  }, [open]);

  useEffect(() => {
    function onResize() {
      setPos((current) => restorePos(current));
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const startDrag = useCallback((e: React.PointerEvent) => {
    if (!modalRef.current) return;
    const target = e.target as HTMLElement;
    if (target.closest("button,input,textarea,a")) return;

    const rect = modalRef.current.getBoundingClientRect();
    dragging.current = true;
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    latestPointer.current = { x: e.clientX, y: e.clientY };
    modalRef.current.setPointerCapture(e.pointerId);
    e.preventDefault();
  }, []);

  const moveDrag = useCallback((e: React.PointerEvent) => {
    if (!dragging.current || !modalRef.current) return;
    latestPointer.current = { x: e.clientX, y: e.clientY };
    if (frame.current) return;

    frame.current = window.requestAnimationFrame(() => {
      frame.current = null;
      const rect = modalRef.current?.getBoundingClientRect();
      const width = rect?.width ?? MODAL_WIDTH;
      const height = rect?.height ?? MODAL_HEIGHT_ESTIMATE;
      const nextX = latestPointer.current.x - dragOffset.current.x;
      const nextY = latestPointer.current.y - dragOffset.current.y;
      setPos({
        x: clamp(nextX, 8, Math.max(8, window.innerWidth - width - 8)),
        y: clamp(nextY, 8, Math.max(8, window.innerHeight - Math.min(height, window.innerHeight - 16) - 8)),
      });
    });
  }, []);

  const stopDrag = useCallback((e: React.PointerEvent) => {
    dragging.current = false;
    if (frame.current) {
      window.cancelAnimationFrame(frame.current);
      frame.current = null;
    }
    try { modalRef.current?.releasePointerCapture(e.pointerId); } catch {}
  }, []);

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

  useEffect(() => {
    if (!selectedFlight) return;
    const f = selectedFlight;
    const paxLines = Array.isArray(f.passengers) && f.passengers.length
      ? f.passengers.map((p, i) =>
          `  ${i + 1}. ${p.full_name ?? "N/A"}${p.birth_date ? " | DOB: " + p.birth_date : ""}${p.document ? " | Doc: " + p.document : ""}`
        ).join("\n")
      : "  N/A";

    const text = [
      `Vuelo: ${f.flight_folio ?? f.id}`,
      `Tipo: ${f.flight_type ?? "sencillo"}`,
      `Ida: ${f.flight_date}${f.flight_time ? " " + f.flight_time : ""}`,
      f.return_flight_date ? `Regreso: ${f.return_flight_date}` : null,
      `Tarifa: ${f.fare_type} | Total: $${f.total_amount?.toLocaleString("es-MX") ?? "N/A"} MXN`,
      `Cliente: ${f.profiles?.full_name ?? "Desconocido"} <${f.profiles?.email ?? ""}>`,
      `Pasajeros:`,
      paxLines,
      "",
      "--- Notas del agente ---",
      "",
    ].filter((l) => l !== null).join("\n");

    setContent((prev) => prev.trim() ? prev : text);
  }, [selectedFlight]);

  function clearDraftState() {
    setFlightQuery(""); setFlightResults([]); setSelectedFlight(null); setFlightOpen(false);
    setCcNumber(""); setCcHolder(""); setCcAddress(""); setCcBank(""); setBinInfo(null);
    setChargeDate(""); setSiteUrl(""); setLabel("aprobado"); setContent(""); setSaved(false); setErr("");
    setPos(getCenteredPos());
    window.localStorage.removeItem(DRAFT_KEY);
    window.localStorage.setItem(OPEN_KEY, "0");
  }

  function handleClose() {
    setErr("");
    setSaved(false);
    window.localStorage.setItem(OPEN_KEY, "0");
    onClose();
  }

  function handleSave() {
    if (!content.trim()) { setErr("El contenido no puede estar vacío."); return; }
    setErr("");
    startTransition(async () => {
      const digits = ccNumber.replace(/\D/g, "");
      const result = await saveWorkspaceNoteAction({
        flight_id: selectedFlight?.id ?? null,
        cc_number: digits || null,
        cc_holder: ccHolder || null,
        cc_address: ccAddress || null,
        cc_bank: ccBank || null,
        cc_charge_date: chargeDate || null,
        site_url: siteUrl || null,
        label,
        content,
      });
      if (result.error) { setErr(result.error); return; }
      setSaved(true);
      setTimeout(() => { onSaved(); clearDraftState(); onClose(); }, 900);
    });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999]" style={{ pointerEvents: "none" }}>
      <div
        ref={modalRef}
        className="flex max-h-[calc(100vh-1rem)] w-[min(760px,calc(100vw-1rem))] flex-col overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/95 text-slate-950 shadow-2xl shadow-slate-950/20 backdrop-blur-xl dark:border-cyan-400/20 dark:bg-slate-950/95 dark:text-white dark:shadow-fuchsia-950/40"
        style={{ position: "fixed", left: pos.x, top: pos.y, pointerEvents: "auto" }}
      >
        <div
          className="flex touch-none cursor-grab items-center justify-between border-b border-slate-200 bg-slate-50/90 px-6 py-4 active:cursor-grabbing dark:border-cyan-400/15 dark:bg-gradient-to-r dark:from-slate-950 dark:via-indigo-950 dark:to-fuchsia-950"
          style={{ userSelect: "none" }}
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={stopDrag}
          onPointerCancel={stopDrag}
        >
          <div className="flex min-w-0 items-center gap-3">
            <GripHorizontal size={16} className="shrink-0 text-slate-400 dark:text-cyan-200" />
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 text-white shadow-lg shadow-violet-500/20">
              <NotebookPen size={17} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-black text-slate-950 dark:text-white">Nueva nota — Workspace</p>
              <p className="truncate text-xs font-semibold text-slate-500 dark:text-cyan-100/75">Arrastra desde esta barra · borrador automático activo</p>
            </div>
          </div>
          <button onClick={handleClose} className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-200 hover:text-slate-800 dark:text-cyan-100/70 dark:hover:bg-white/10 dark:hover:text-white" aria-label="Cerrar ventana">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5 dark:bg-[radial-gradient(circle_at_20%_0%,rgba(34,211,238,.12),transparent_35%),radial-gradient(circle_at_80%_20%,rgba(217,70,239,.16),transparent_32%)]">
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-600 dark:text-cyan-100">
              <Plane size={12} /> Importar vuelo (opcional)
            </label>
            <div className="relative">
              <div className={`flex cursor-text items-center gap-2 rounded-2xl border-2 px-4 py-2.5 transition ${selectedFlight ? "border-violet-400" : "border-slate-300 dark:border-cyan-400/30"} bg-slate-50 dark:bg-white/10`}>
                <Search size={14} className="shrink-0 text-slate-400 dark:text-cyan-200" />
                <input
                  className="flex-1 bg-transparent text-sm font-semibold text-slate-950 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-cyan-100/40"
                  placeholder="Buscar por folio, nombre o correo..."
                  value={flightQuery}
                  onChange={(e) => { setFlightQuery(e.target.value); setFlightOpen(true); }}
                  onFocus={() => flightQuery.length >= 2 && setFlightOpen(true)}
                />
                {searching ? <Loader2 size={14} className="animate-spin text-slate-400 dark:text-cyan-200" /> : <ChevronDown size={14} className="shrink-0 text-slate-400 dark:text-cyan-200" />}
              </div>

              {flightOpen && flightResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-20 mt-2 max-h-64 overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-cyan-400/20 dark:bg-slate-950">
                  {flightResults.map((f) => {
                    const pax = Array.isArray(f.passengers) ? f.passengers : [];
                    return (
                      <button key={f.id} className="flex w-full flex-col gap-0.5 px-4 py-3 text-left transition hover:bg-violet-50 dark:hover:bg-white/10" onClick={() => { setSelectedFlight(f); setFlightQuery(f.flight_folio ?? f.id); setFlightOpen(false); }}>
                        <div className="flex items-center gap-2">
                          <Plane size={13} className="shrink-0 text-violet-500 dark:text-cyan-300" />
                          <span className="text-sm font-black text-slate-950 dark:text-white">{f.flight_folio ?? f.id}</span>
                          <span className="ml-auto text-[11px] font-bold text-violet-600 dark:text-fuchsia-200">${f.total_amount?.toLocaleString("es-MX")} MXN</span>
                        </div>
                        <p className="pl-5 text-[11px] text-slate-500 dark:text-cyan-100/70">{f.profiles?.full_name ?? "Usuario"} · {f.flight_date}{f.return_flight_date ? " → " + f.return_flight_date : ""} · {f.fare_type}</p>
                        {pax.length > 0 && <p className="pl-5 text-[10px] text-slate-400 dark:text-cyan-100/45">Pax: {pax.map((p) => p.full_name).filter(Boolean).join(", ")}</p>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {selectedFlight && (
              <div className="mt-2 flex flex-wrap items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 dark:border-cyan-400/20 dark:bg-cyan-400/10">
                <Plane size={13} className="shrink-0 text-violet-600 dark:text-cyan-200" />
                <span className="text-xs font-black text-violet-700 dark:text-cyan-100">{selectedFlight.flight_folio ?? selectedFlight.id}</span>
                <span className="text-xs text-violet-500 dark:text-cyan-100/70">· {selectedFlight.profiles?.full_name} · {selectedFlight.flight_date}</span>
                <button onClick={() => { setSelectedFlight(null); setFlightQuery(""); }} className="ml-auto text-violet-400 hover:text-violet-700 dark:text-cyan-100/60 dark:hover:text-white"><X size={12} /></button>
              </div>
            )}
          </div>

          <div>
            <label className="mb-2 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-600 dark:text-cyan-100">
              <CreditCard size={12} /> Tarjeta de pago (CC) — opcional
            </label>
            <div className="mb-3">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-cyan-100/60">Número de tarjeta (16 dígitos)</p>
              <div className="relative">
                <input value={formatCardDisplay(ccNumber)} onChange={(e) => setCcNumber(e.target.value.replace(/\D/g, "").slice(0, 16))} placeholder="0000 0000 0000 0000" className="w-full rounded-xl border-2 border-slate-300 bg-slate-50 px-4 py-2.5 font-mono text-sm font-bold tracking-widest text-slate-950 outline-none focus:ring-2 focus:ring-violet-300 dark:border-cyan-400/25 dark:bg-white/10 dark:text-white dark:placeholder:text-cyan-100/35" inputMode="numeric" />
                {binLoading && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-violet-400" />}
              </div>
              {binInfo && (
                <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-violet-100 bg-violet-50 px-3 py-1.5 dark:border-cyan-400/20 dark:bg-cyan-400/10">
                  <CreditCard size={12} className="text-violet-500 dark:text-cyan-200" />
                  <span className="text-[11px] font-black text-violet-700 dark:text-cyan-100">{binInfo}</span>
                  {ccBank && <span className="ml-auto rounded-lg bg-violet-100 px-2 py-0.5 text-[10px] font-black text-violet-600 dark:bg-white/10 dark:text-fuchsia-100">{ccBank}</span>}
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
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-600 dark:text-cyan-100"><Calendar size={12} /> Fecha del cargo</label>
              <input type="date" value={chargeDate} onChange={(e) => setChargeDate(e.target.value)} className="w-full rounded-xl border-2 border-slate-300 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-950 outline-none focus:ring-2 focus:ring-violet-300 dark:border-cyan-400/25 dark:bg-white/10 dark:text-white" />
            </div>
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-600 dark:text-cyan-100"><LinkIcon size={12} /> Sitio / URL</label>
              <input type="url" value={siteUrl} onChange={(e) => setSiteUrl(e.target.value)} placeholder="https://" className="w-full rounded-xl border-2 border-slate-300 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-950 outline-none focus:ring-2 focus:ring-violet-300 dark:border-cyan-400/25 dark:bg-white/10 dark:text-white dark:placeholder:text-cyan-100/35" />
            </div>
          </div>

          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-600 dark:text-cyan-100"><Tag size={12} /> Etiqueta</label>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(LABEL_CONFIG) as [WorkspaceLabel, typeof LABEL_CONFIG[WorkspaceLabel]][]).map(([key, cfg]) => (
                <button key={key} onClick={() => setLabel(key)} className="flex items-center gap-1.5 rounded-2xl border-2 px-4 py-2 text-xs font-black uppercase tracking-wider transition-all hover:-translate-y-0.5" style={{ backgroundColor: label === key ? cfg.bg : "transparent", color: label === key ? cfg.text : undefined, borderColor: label === key ? cfg.border : "rgba(148,163,184,.45)", transform: label === key ? "scale(1.03)" : "scale(1)" }}>
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: label === key ? cfg.dot : "#94a3b8" }} />
                  <span className={label === key ? "" : "text-slate-500 dark:text-cyan-100/65"}>{cfg.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-600 dark:text-cyan-100"><NotebookPen size={12} /> Contenido de la nota</label>
            <textarea rows={10} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Escribe aquí los detalles del caso..." className="w-full resize-y rounded-2xl border-2 border-slate-300 bg-slate-50 p-4 font-mono text-sm leading-relaxed text-slate-950 outline-none focus:ring-2 focus:ring-violet-300 dark:border-cyan-400/25 dark:bg-white/10 dark:text-white dark:placeholder:text-cyan-100/35" style={{ minHeight: 170 }} />
            <p className="mt-1 text-right text-[11px] font-medium text-slate-400 dark:text-cyan-100/50">{content.length} caracteres · guardado automático local</p>
          </div>

          {err && <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-400/30 dark:bg-red-500/10"><AlertCircle size={14} className="text-red-500" /><p className="text-xs font-bold text-red-700 dark:text-red-200">{err}</p></div>}
          {saved && <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 dark:border-green-400/30 dark:bg-green-500/10"><CheckCircle2 size={14} className="text-green-600" /><p className="text-xs font-black text-green-700 dark:text-green-200">Nota guardada exitosamente.</p></div>}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/90 px-6 py-4 dark:border-cyan-400/15 dark:bg-slate-950/95">
          <button onClick={handleClose} className="rounded-2xl border-2 border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:border-slate-400 dark:border-cyan-400/25 dark:bg-white/10 dark:text-cyan-100 dark:hover:bg-white/15">
            Cerrar y conservar
          </button>
          <div className="flex items-center gap-2">
            <button onClick={clearDraftState} className="rounded-2xl border-2 border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-black text-rose-700 transition hover:bg-rose-100 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-200">
              Limpiar
            </button>
            <button onClick={handleSave} disabled={isPending || !content.trim()} className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400 px-6 py-2.5 text-sm font-black text-white shadow-lg transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50">
              {isPending ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              {isPending ? "Guardando..." : "Guardar nota"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, maxLength }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; maxLength: number }) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-cyan-100/60">{label}</p>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} maxLength={maxLength} className="w-full rounded-xl border-2 border-slate-300 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-950 outline-none focus:ring-2 focus:ring-violet-300 dark:border-cyan-400/25 dark:bg-white/10 dark:text-white dark:placeholder:text-cyan-100/35" />
    </div>
  );
}

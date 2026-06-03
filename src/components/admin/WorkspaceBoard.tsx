"use client";

import { useState, useTransition, useCallback } from "react";
import {
  NotebookPen, Plus, Search, Filter, Trash2,
  Plane, CreditCard, Clock, ChevronDown, RefreshCw,
} from "lucide-react";
import { WorkspaceNoteModal, LabelBadge, LABEL_CONFIG, type WorkspaceNote, type WorkspaceLabel } from "./WorkspaceNoteModal";
import { getWorkspaceNotesAction, deleteWorkspaceNoteAction } from "@/app/admin/tools/workspace/actions";

const LABEL_FILTERS = [
  { value: "todas",     label: "Todas" },
  { value: "aprobado",  label: "Aprobado" },
  { value: "declinado", label: "Declinado" },
  { value: "ban",       label: "Ban" },
  { value: "riesgoso",  label: "Riesgoso" },
];

export function WorkspaceBoard({ initialNotes }: { initialNotes: WorkspaceNote[] }) {
  const [notes, setNotes]         = useState<WorkspaceNote[]>(initialNotes);
  const [modalOpen, setModalOpen] = useState(false);
  const [labelFilter, setFilter]  = useState("todas");
  const [search, setSearch]       = useState("");
  const [isPending, start]        = useTransition();

  const reload = useCallback(() => {
    start(async () => {
      const data = await getWorkspaceNotesAction({ label: labelFilter, search });
      setNotes(data as WorkspaceNote[]);
    });
  }, [labelFilter, search]);

  function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta nota?")) return;
    start(async () => {
      await deleteWorkspaceNoteAction(id);
      setNotes((prev) => prev.filter((n) => n.id !== id));
    });
  }

  const filtered = notes.filter((n) => {
    const matchLabel  = labelFilter === "todas" || n.label === labelFilter;
    const matchSearch = !search || [
      n.content, n.cc_last4, n.cc_brand, n.cc_holder,
      (n.flights as any)?.flight_folio,
    ].filter(Boolean).join(" ").toLowerCase().includes(search.toLowerCase());
    return matchLabel && matchSearch;
  });

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-700 text-white shadow-lg">
            <NotebookPen size={22} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">Workspace</h2>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Notas de análisis enlazadas a vuelos y tarjetas (CC)
            </p>
          </div>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 to-indigo-600 px-5 py-2.5 text-sm font-black text-white shadow-lg transition-all hover:-translate-y-0.5"
        >
          <Plus size={16} /> Nueva nota
        </button>
      </div>

      {/* Filtros */}
      <div
        className="flex flex-wrap items-center gap-3 rounded-3xl border-2 border-slate-200 p-4"
        style={{ backgroundColor: "#ffffff" }}
      >
        {/* Etiquetas */}
        <div className="flex flex-wrap gap-2">
          {LABEL_FILTERS.map((f) => {
            const cfg = f.value !== "todas" ? LABEL_CONFIG[f.value as WorkspaceLabel] : null;
            return (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className="flex items-center gap-1.5 rounded-2xl border-2 px-3 py-1.5 text-xs font-black uppercase tracking-wider transition-all"
                style={{
                  backgroundColor: labelFilter === f.value ? (cfg?.bg ?? "#6366f1") : "#f8fafc",
                  color:           labelFilter === f.value ? (cfg?.text ?? "#fff") : "#94a3b8",
                  borderColor:     labelFilter === f.value ? (cfg?.border ?? "#6366f1") : "#e2e8f0",
                }}
              >
                {cfg && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: cfg.dot }} />}
                {f.label}
              </button>
            );
          })}
        </div>

        {/* Buscar */}
        <div className="relative ml-auto">
          <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar en notas, CC, folio…"
            className="rounded-2xl border-2 py-2 pl-8 pr-4 text-xs font-semibold outline-none focus:ring-2 focus:ring-violet-300"
            style={{ backgroundColor: "#f8fafc", borderColor: "#e2e8f0", color: "#0f172a", width: 220 }}
          />
        </div>

        <button onClick={reload} disabled={isPending}
          className="rounded-2xl border-2 border-slate-200 bg-slate-50 p-2 text-slate-500 hover:border-violet-300 hover:text-violet-600 disabled:opacity-50">
          <RefreshCw size={14} className={isPending ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Contador */}
      <p className="text-xs font-bold" style={{ color: "#64748b" }}>
        {filtered.length} nota{filtered.length !== 1 ? "s" : ""}
        {labelFilter !== "todas" && <> · filtrando por <span style={{ color: LABEL_CONFIG[labelFilter as WorkspaceLabel]?.text }}>{LABEL_CONFIG[labelFilter as WorkspaceLabel]?.label}</span></>}
      </p>

      {/* Grid de notas */}
      {filtered.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-slate-300 py-16 text-center"
          style={{ backgroundColor: "#f8fafc" }}
        >
          <NotebookPen size={36} className="text-slate-400" />
          <p className="text-sm font-bold" style={{ color: "#475569" }}>No hay notas aún</p>
          <button onClick={() => setModalOpen(true)}
            className="mt-1 rounded-2xl bg-violet-100 px-4 py-2 text-xs font-black text-violet-700 hover:bg-violet-200">
            Crear primera nota
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((note) => (
            <NoteCard key={note.id} note={note} onDelete={handleDelete} />
          ))}
        </div>
      )}

      <WorkspaceNoteModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={reload}
      />
    </div>
  );
}

// ── Tarjeta de nota ──────────────────────────────────────────────────────────────────
function NoteCard({ note, onDelete }: { note: WorkspaceNote; onDelete: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = LABEL_CONFIG[note.label];
  const flight = note.flights as any;

  return (
    <div
      className="flex flex-col rounded-3xl border-2 shadow-md transition-all hover:shadow-lg"
      style={{ backgroundColor: "#ffffff", borderColor: cfg.border }}
    >
      {/* Top strip con etiqueta */}
      <div
        className="flex items-center justify-between rounded-t-[22px] px-4 py-2"
        style={{ backgroundColor: cfg.bg }}
      >
        <LabelBadge label={note.label} />
        <button
          onClick={() => onDelete(note.id)}
          className="rounded-lg p-1.5 transition-all hover:bg-red-100 hover:text-red-600"
          style={{ color: cfg.text }}
        >
          <Trash2 size={13} />
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">

        {/* Vuelo enlazado */}
        {flight && (
          <div className="flex items-center gap-2 rounded-xl border border-violet-100 bg-violet-50 px-3 py-2">
            <Plane size={12} className="shrink-0 text-violet-500" />
            <div className="min-w-0">
              <p className="truncate text-[11px] font-black text-violet-700">{flight.flight_folio ?? flight.id}</p>
              <p className="truncate text-[10px] text-violet-500">{flight.flight_date} · ${flight.total_amount?.toLocaleString("es-MX")} MXN</p>
            </div>
          </div>
        )}

        {/* CC */}
        {(note.cc_last4 || note.cc_brand || note.cc_holder) && (
          <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
            <CreditCard size={12} className="shrink-0 text-slate-400" />
            <p className="truncate text-[11px] font-bold text-slate-600">
              {note.cc_brand && <span className="mr-1">{note.cc_brand}</span>}
              {note.cc_last4 && <span className="mr-1">•••• {note.cc_last4}</span>}
              {note.cc_holder && <span className="text-slate-400">· {note.cc_holder}</span>}
            </p>
          </div>
        )}

        {/* Contenido */}
        <div className="flex-1">
          <p
            className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed"
            style={{
              color: "#334155",
              maxHeight: expanded ? undefined : "6.5rem",
              overflow: expanded ? undefined : "hidden",
            }}
          >
            {note.content}
          </p>
          {note.content.length > 280 && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="mt-1 flex items-center gap-1 text-[10px] font-black text-violet-600 hover:underline"
            >
              <ChevronDown size={11} className={expanded ? "rotate-180 transition-transform" : "transition-transform"} />
              {expanded ? "Ver menos" : "Ver todo"}
            </button>
          )}
        </div>

        {/* Footer */}
        <p className="flex items-center gap-1 text-[10px] font-semibold" style={{ color: "#94a3b8" }}>
          <Clock size={10} />
          {new Date(note.created_at).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" })}
        </p>
      </div>
    </div>
  );
}

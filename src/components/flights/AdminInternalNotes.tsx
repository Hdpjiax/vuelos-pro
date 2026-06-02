import { StickyNote } from "lucide-react";
import { ConfirmSubmitButton } from "@/components/ui/ConfirmSubmitButton";
import { buttonPrimary, inputClass, labelClass } from "@/lib/styles";
import { formatDateTime } from "@/lib/utils";

export function AdminInternalNotes({ notes, flightId, action }: { notes: any[]; flightId: string; action: (formData: FormData) => Promise<void> }) {
  return (
    <section className="rounded-[2rem] border border-amber-200 bg-amber-50/70 p-6 shadow-xl shadow-amber-100/50">
      <div className="mb-5 flex items-start gap-3">
        <div className="rounded-2xl bg-white p-2 text-amber-700 ring-1 ring-amber-200"><StickyNote size={20} /></div>
        <div>
          <p className="text-sm font-black uppercase tracking-[0.18em] text-amber-700">Notas privadas admin</p>
          <h3 className="mt-1 text-xl font-black text-slate-950">Seguimiento interno</h3>
          <p className="mt-1 text-sm font-semibold text-amber-900/80">Estas notas no las ve el usuario. Úsalas para proveedor, costos, incidencias o pendientes internos.</p>
        </div>
      </div>

      <form action={action} className="rounded-3xl border border-amber-200 bg-white/85 p-4">
        <input type="hidden" name="flight_id" value={flightId} />
        <label className="space-y-2">
          <span className={labelClass}>Nueva nota privada</span>
          <textarea className={`${inputClass} min-h-28 resize-y`} name="note" maxLength={1200} placeholder="Ejemplo: proveedor confirmó disponibilidad, revisar comisión, incidencia con pasajero..." required />
        </label>
        <ConfirmSubmitButton className={`${buttonPrimary} mt-4 w-full md:w-auto`} confirmMessage="¿Guardar esta nota privada de administración?">
          Guardar nota interna
        </ConfirmSubmitButton>
      </form>

      <div className="mt-5 space-y-3">
        {!notes.length ? (
          <div className="rounded-3xl border border-dashed border-amber-200 bg-white/70 p-6 text-center text-sm font-bold text-amber-900/70">
            Todavía no hay notas internas para este vuelo.
          </div>
        ) : (
          notes.map((note) => (
            <article key={note.id} className="rounded-3xl border border-amber-100 bg-white p-4 shadow-sm">
              <p className="whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-800">{note.note}</p>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                <span>{note.profiles?.full_name || note.profiles?.email || "Admin"}</span>
                <span>{formatDateTime(note.created_at)}</span>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

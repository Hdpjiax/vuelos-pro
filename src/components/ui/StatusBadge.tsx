import { statusHelper, statusLabel } from "@/lib/utils";

const styles: Record<string, string> = {
  pendiente_revision: "bg-amber-100 text-amber-800 border-amber-200",
  esperando_pago: "bg-sky-100 text-sky-800 border-sky-200",
  pago_subido: "bg-violet-100 text-violet-800 border-violet-200",
  pago_confirmado: "bg-emerald-100 text-emerald-800 border-emerald-200",
  pendiente_qr: "bg-orange-100 text-orange-800 border-orange-200",
  qr_enviado: "bg-cyan-100 text-cyan-800 border-cyan-200",
  completado: "bg-slate-100 text-slate-800 border-slate-200",
  cancelado: "bg-red-100 text-red-800 border-red-200",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span title={statusHelper(status)} className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${styles[status] ?? "bg-slate-100 text-slate-700 border-slate-200"}`}>
      {statusLabel(status)}
    </span>
  );
}

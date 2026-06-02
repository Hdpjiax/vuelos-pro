import Link from "next/link";
import { CheckCircle2, Settings } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { buttonPrimary, buttonSecondary, inputClass, labelClass, panelClass } from "@/lib/styles";
import { saveOperationsSettingsAction } from "./actions";

type PageProps = {
  searchParams: Promise<{ saved?: string }>;
};

type OperationsSettings = {
  support_email?: string;
  support_whatsapp?: string;
  default_bank_note?: string;
  qr_delivery_note?: string;
  urgent_window_days?: number;
};

const defaults: OperationsSettings = {
  support_email: "",
  support_whatsapp: "",
  default_bank_note: "Despues de realizar el pago, sube tu comprobante en el detalle del vuelo.",
  qr_delivery_note: "Los QR se enviaran en cuanto el pago quede confirmado.",
  urgent_window_days: 3,
};

export default async function AdminSettingsPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const supabase = await createClient();

  const { data } = await supabase
    .from("app_settings")
    .select("value, updated_at")
    .eq("key", "operations")
    .maybeSingle();

  const settings: OperationsSettings = { ...defaults, ...((data?.value as OperationsSettings | null) ?? {}) };

  return (
    <div className="space-y-6">
      <section className={panelClass}>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.24em] text-sky-700">Panel administrativo</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Configuración</h2>
            <p className="mt-2 text-slate-500">Ajustes operativos para mensajes, soporte y urgencias.</p>
          </div>
          <Link href="/admin/pagos" className={buttonSecondary}>Configurar cuenta bancaria</Link>
        </div>
      </section>

      {query.saved === "1" ? (
        <div className="flex items-start gap-3 rounded-[2rem] border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-800">
          <CheckCircle2 className="mt-0.5 shrink-0" size={20} />
          <div>
            <p className="font-black">Configuración guardada</p>
            <p className="text-sm font-semibold">Los nuevos textos se usarán en los próximos flujos operativos.</p>
          </div>
        </div>
      ) : null}

      <section className={panelClass}>
        <div className="mb-6 flex items-start gap-3">
          <div className="rounded-2xl bg-sky-100 p-2 text-sky-800"><Settings size={20} /></div>
          <div>
            <h3 className="text-2xl font-black tracking-tight text-slate-950">Operación general</h3>
            <p className="mt-1 text-sm text-slate-500">Estos datos ayudan a mantener los mensajes consistentes y el panel más fácil de usar.</p>
          </div>
        </div>

        <form action={saveOperationsSettingsAction} className="space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            <label className="space-y-2">
              <span className={labelClass}>Correo de soporte</span>
              <input className={inputClass} name="support_email" defaultValue={settings.support_email ?? ""} placeholder="soporte@vuelospro.com" />
            </label>
            <label className="space-y-2">
              <span className={labelClass}>WhatsApp de soporte</span>
              <input className={inputClass} name="support_whatsapp" defaultValue={settings.support_whatsapp ?? ""} placeholder="+52..." />
            </label>
          </div>

          <label className="block space-y-2">
            <span className={labelClass}>Nota automática al enviar cuenta bancaria</span>
            <textarea className={`${inputClass} min-h-28 resize-y`} name="default_bank_note" defaultValue={settings.default_bank_note ?? ""} />
          </label>

          <label className="block space-y-2">
            <span className={labelClass}>Nota para entrega de QR</span>
            <textarea className={`${inputClass} min-h-28 resize-y`} name="qr_delivery_note" defaultValue={settings.qr_delivery_note ?? ""} />
          </label>

          <label className="block max-w-xs space-y-2">
            <span className={labelClass}>Días para urgencias</span>
            <input className={inputClass} type="number" min="1" max="15" name="urgent_window_days" defaultValue={settings.urgent_window_days ?? 3} />
          </label>

          <div className="flex justify-end">
            <button className={buttonPrimary}>Guardar configuración</button>
          </div>
        </form>
      </section>
    </div>
  );
}

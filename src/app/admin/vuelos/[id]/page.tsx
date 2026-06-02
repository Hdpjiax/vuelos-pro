import Link from "next/link";
import { notFound } from "next/navigation";
import { CreditCard, FileCheck2, QrCode, WalletCards, XCircle } from "lucide-react";
import { AdminInternalNotes } from "@/components/flights/AdminInternalNotes";
import { FlightDetail } from "@/components/flights/FlightDetail";
import { FlightFilesPanel } from "@/components/flights/FlightFilesPanel";
import { FlightProgress } from "@/components/flights/FlightProgress";
import { FlightMessages } from "@/components/flights/FlightMessages";
import { ConfirmSubmitButton } from "@/components/ui/ConfirmSubmitButton";
import { createClient } from "@/lib/supabase/server";
import { createSignedAttachmentUrls, createSignedFlightFileUrl } from "@/lib/storage";
import { buttonDanger, buttonPrimary, buttonSecondary, inputClass, labelClass } from "@/lib/styles";
import { addInternalNoteAction, confirmPaymentAction, sendBankAccountAction, updateFinancialsAction, updateFlightStatusAction, uploadInternalFilesAction, uploadQrAction } from "./actions";

const canSendBankAccountStatuses = new Set(["pendiente_revision", "esperando_pago"]);
const canConfirmPaymentStatuses = new Set(["pago_subido", "pago_confirmado"]);
const canUploadQrStatuses = new Set(["pago_confirmado", "pendiente_qr", "qr_enviado"]);

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminFlightDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: rawFlight }, { data: bankAccounts }, { data: rawMessages }, { data: attachments }, { data: settingsRow }, { data: internalNotes }] = await Promise.all([
    supabase
      .from("flights")
      .select("*")
      .eq("id", id)
      .single(),
    supabase
      .from("bank_accounts")
      .select("id, bank_name, account_holder, clabe, active")
      .eq("active", true)
      .order("created_at", { ascending: false }),
    supabase
      .from("flight_messages")
      .select("id, message, message_type, created_at, sender_id")
      .eq("flight_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("flight_attachments")
      .select("id, file_path, file_name, file_type, category, created_at")
      .eq("flight_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("app_settings")
      .select("value")
      .eq("key", "operations")
      .maybeSingle(),
    supabase
      .from("flight_internal_notes")
      .select("id, note, created_at, admin_id")
      .eq("flight_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (!rawFlight) notFound();

  const senderIds = Array.from(new Set([rawFlight.user_id, ...(rawMessages ?? []).map((message: any) => message.sender_id), ...(internalNotes ?? []).map((note: any) => note.admin_id)].filter(Boolean)));
  const { data: relatedProfiles } = senderIds.length
    ? await supabase.from("profiles").select("id, full_name, email").in("id", senderIds)
    : { data: [] };

  const profileMap = new Map((relatedProfiles ?? []).map((profile: any) => [profile.id, profile]));
  const flight = { ...rawFlight, profiles: profileMap.get(rawFlight.user_id) ?? null };
  const messages = (rawMessages ?? []).map((message: any) => ({
    ...message,
    profiles: profileMap.get(message.sender_id) ?? null,
  }));
  const notes = (internalNotes ?? []).map((note: any) => ({
    ...note,
    profiles: profileMap.get(note.admin_id) ?? null,
  }));

  const imageUrl = await createSignedFlightFileUrl(supabase, flight.flight_image_path);
  const signedAttachments = await createSignedAttachmentUrls(supabase, attachments ?? []);
  const operationsSettings = (settingsRow?.value ?? {}) as { default_bank_note?: string };

  return (
    <div className="space-y-6">
      <div className="flex justify-start">
        <Link href="/admin/vuelos" className={buttonSecondary}>
          Volver a vuelos recibidos
        </Link>
      </div>

      <FlightProgress status={flight.status} />

      <FlightDetail
        flight={flight}
        imageUrl={imageUrl}
        showUser
        actions={
          <div className="space-y-6">
            <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/60 backdrop-blur">
              <div className="mb-5">
                <p className="text-sm font-black uppercase tracking-[0.24em] text-sky-700">Acciones administrativas</p>
                <h3 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Proceso del vuelo</h3>
                <p className="mt-2 text-sm text-slate-500">
                  Envía la cuenta bancaria, valida el pago y adjunta uno o varios QR para el usuario.
                </p>
              </div>

              <div className="grid gap-5 xl:grid-cols-3">
                <SendBankAccountForm
                  flight={flight}
                  bankAccounts={bankAccounts ?? []}
                  disabled={!canSendBankAccountStatuses.has(flight.status)}
                  defaultNote={operationsSettings.default_bank_note ?? ""}
                />
                <ConfirmPaymentForm flightId={flight.id} disabled={!canConfirmPaymentStatuses.has(flight.status)} />
                <UploadQrForm flightId={flight.id} disabled={!canUploadQrStatuses.has(flight.status)} />
              </div>

              <div className="mt-6">
                <FinancialForm flight={flight} />
              </div>

              <div className="mt-5 flex flex-col gap-3 md:flex-row md:flex-wrap">
                <StatusForm flightId={flight.id} status="completado" label="Marcar completado" icon={<FileCheck2 size={16} />} />
                <StatusForm flightId={flight.id} status="cancelado" label="Cancelar vuelo" variant="danger" icon={<XCircle size={16} />} />
              </div>
            </section>
          </div>
        }
      />

      <FlightFilesPanel
        flightId={flight.id}
        attachments={signedAttachments as any}
        canUploadInternal
        uploadAction={uploadInternalFilesAction}
        downloadAllHref={`/admin/vuelos/${flight.id}/archivos/descargar`}
      />

      <AdminInternalNotes notes={notes as any} flightId={flight.id} action={addInternalNoteAction} />

      <FlightMessages messages={(messages ?? []) as any} />
    </div>
  );
}


function FinancialForm({ flight }: { flight: any }) {
  const providerCost = Number(flight.provider_cost_amount ?? 0);
  const commission = Number(flight.admin_commission_amount ?? 0);
  const amountToPay = Number(flight.amount_to_pay ?? flight.total_amount ?? 0);
  const profit = Number(flight.profit_amount ?? amountToPay - providerCost - commission);

  return (
    <form action={updateFinancialsAction} className="rounded-3xl border border-slate-200 bg-white p-5">
      <div className="mb-4 flex items-center gap-3">
        <div className="rounded-2xl bg-emerald-100 p-2 text-emerald-700"><WalletCards size={18} /></div>
        <div>
          <h4 className="font-black text-slate-950">Finanzas del vuelo</h4>
          <p className="text-xs font-semibold text-slate-500">Captura costo, comisión/gastos y ganancia por vuelo.</p>
        </div>
      </div>
      <input type="hidden" name="flight_id" value={flight.id} />
      <div className="grid gap-4 xl:grid-cols-4">
        <label className="space-y-2">
          <span className={labelClass}>Costo proveedor</span>
          <input className={inputClass} type="number" min="0" step="0.01" name="provider_cost_amount" defaultValue={providerCost} />
        </label>
        <label className="space-y-2">
          <span className={labelClass}>Comisión / gastos</span>
          <input className={inputClass} type="number" min="0" step="0.01" name="admin_commission_amount" defaultValue={commission} />
        </label>
        <label className="space-y-2">
          <span className={labelClass}>Estado financiero</span>
          <select className={inputClass} name="financial_status" defaultValue={flight.financial_status || "pendiente"}>
            <option value="pendiente">Pendiente</option>
            <option value="revisar">Revisar</option>
            <option value="liquidado">Liquidado</option>
          </select>
        </label>
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">Ganancia actual</p>
          <p className="mt-1 text-2xl font-black text-emerald-900">{new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(profit)}</p>
          <p className="mt-1 text-xs font-bold text-emerald-700">Se recalcula al guardar.</p>
        </div>
      </div>
      <label className="mt-4 block space-y-2">
        <span className={labelClass}>Notas financieras</span>
        <textarea className={`${inputClass} min-h-20 resize-y`} name="financial_notes" defaultValue={flight.financial_notes || ""} placeholder="Ejemplo: comisión incluida, costo pendiente, ajuste especial..." />
      </label>
      <ConfirmSubmitButton className={`${buttonPrimary} mt-4 w-full md:w-auto`} confirmMessage="¿Guardar datos financieros de este vuelo?">
        Guardar finanzas
      </ConfirmSubmitButton>
    </form>
  );
}

function SendBankAccountForm({
  flight,
  bankAccounts,
  disabled,
  defaultNote,
}: {
  flight: any;
  bankAccounts: any[];
  disabled: boolean;
  defaultNote: string;
}) {
  const hasBankAccount = bankAccounts.length > 0;
  const currentPercent = Number(flight.payment_percentage ?? 100);
  const safePercent = Number.isFinite(currentPercent) && currentPercent > 0 ? currentPercent : 100;
  const totalAmount = Number(flight.total_amount ?? 0);
  const amountToPay = Number(flight.amount_to_pay ?? totalAmount);

  return (
    <form action={sendBankAccountAction} className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
      <div className="mb-4 flex items-center gap-3">
        <div className="rounded-2xl bg-sky-100 p-2 text-sky-800"><CreditCard size={18} /></div>
        <div>
          <h4 className="font-black text-slate-950">Enviar cuenta bancaria</h4>
          <p className="text-xs font-semibold text-slate-500">Manda CLABE y total con porcentaje/descuento.</p>
        </div>
      </div>

      <input type="hidden" name="flight_id" value={flight.id} />

      <label className="space-y-2">
        <span className={labelClass}>Cuenta activa</span>
        <select className={inputClass} name="bank_account_id" disabled={!hasBankAccount || disabled} required>
          {!hasBankAccount ? <option value="">Configura una cuenta en Validar pagos</option> : null}
          {bankAccounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.bank_name} · {account.clabe}
            </option>
          ))}
        </select>
      </label>

      <label className="mt-4 block space-y-2">
        <span className={labelClass}>Porcentaje a pagar del vuelo</span>
        <input
          className={inputClass}
          type="number"
          name="payment_percentage"
          min="0.01"
          max="100"
          step="0.01"
          defaultValue={safePercent}
          disabled={disabled}
          required
        />
        <span className="block text-xs font-semibold text-slate-500">
          Total original: {new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(totalAmount)} · último total a pagar: {new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(amountToPay)}
        </span>
      </label>

      <label className="mt-4 block space-y-2">
        <span className={labelClass}>Nota opcional</span>
        <textarea className={`${inputClass} min-h-24 resize-y`} name="note" placeholder="Ejemplo: enviar comprobante en esta misma pantalla." defaultValue={defaultNote} disabled={disabled} />
      </label>

      <ConfirmSubmitButton
        className={`${buttonPrimary} mt-4 w-full`}
        disabled={disabled || !hasBankAccount}
        confirmMessage="¿Enviar cuenta bancaria y total a depositar al usuario?"
      >
        Enviar cuenta bancaria
      </ConfirmSubmitButton>
    </form>
  );
}

function ConfirmPaymentForm({ flightId, disabled }: { flightId: string; disabled: boolean }) {
  return (
    <form action={confirmPaymentAction} className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
      <div className="mb-4 flex items-center gap-3">
        <div className="rounded-2xl bg-emerald-100 p-2 text-emerald-700"><FileCheck2 size={18} /></div>
        <div>
          <h4 className="font-black text-slate-950">Confirmar pago</h4>
          <p className="text-xs font-semibold text-slate-500">Pasa el vuelo a pendiente por enviar QR.</p>
        </div>
      </div>
      <input type="hidden" name="flight_id" value={flightId} />
      <ConfirmSubmitButton className={`${buttonPrimary} w-full`} disabled={disabled} confirmMessage="¿Confirmar el pago de este vuelo?">
        Confirmar pago
      </ConfirmSubmitButton>
    </form>
  );
}

function UploadQrForm({ flightId, disabled }: { flightId: string; disabled: boolean }) {
  return (
    <form action={uploadQrAction} className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
      <div className="mb-4 flex items-center gap-3">
        <div className="rounded-2xl bg-cyan-100 p-2 text-cyan-700"><QrCode size={18} /></div>
        <div>
          <h4 className="font-black text-slate-950">Adjuntar QR</h4>
          <p className="text-xs font-semibold text-slate-500">Puedes enviar varios QR/fotos.</p>
        </div>
      </div>
      <input type="hidden" name="flight_id" value={flightId} />
      <input className={inputClass} type="file" name="qr_files" accept="image/*" multiple disabled={disabled} />
      <ConfirmSubmitButton className={`${buttonPrimary} mt-4 w-full`} disabled={disabled} confirmMessage="¿Enviar los QR adjuntos al usuario?">
        Enviar QR al usuario
      </ConfirmSubmitButton>
    </form>
  );
}

function StatusForm({
  flightId,
  status,
  label,
  variant = "secondary",
  icon,
}: {
  flightId: string;
  status: string;
  label: string;
  variant?: "secondary" | "danger";
  icon?: React.ReactNode;
}) {
  return (
    <form action={updateFlightStatusAction}>
      <input type="hidden" name="flight_id" value={flightId} />
      <input type="hidden" name="status" value={status} />
      <ConfirmSubmitButton
        className={variant === "danger" ? buttonDanger : buttonSecondary}
        confirmMessage={variant === "danger" ? "¿Cancelar este vuelo? Esta acción notificará al usuario." : "¿Marcar este vuelo como completado?"}
      >
        {icon}
        {label}
      </ConfirmSubmitButton>
    </form>
  );
}

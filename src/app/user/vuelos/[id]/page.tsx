import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, CheckCircle2, Edit3, UploadCloud, XCircle } from "lucide-react";
import { FlightDetail } from "@/components/flights/FlightDetail";
import { FlightFilesPanel } from "@/components/flights/FlightFilesPanel";
import { FlightProgress } from "@/components/flights/FlightProgress";
import { FlightMessages } from "@/components/flights/FlightMessages";
import { ConfirmSubmitButton } from "@/components/ui/ConfirmSubmitButton";
import { createClient } from "@/lib/supabase/server";
import { createSignedAttachmentUrls, createSignedFlightFileUrl } from "@/lib/storage";
import { buttonDanger, buttonPrimary, buttonSecondary, inputClass, labelClass } from "@/lib/styles";
import { formatCurrency, getAmountToPay } from "@/lib/utils";
import { cancelUserFlightAction, uploadPaymentProofAction } from "./actions";

const userEditableStatuses = new Set(["pendiente_revision", "esperando_pago"]);

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string; payment?: string; updated?: string; cancelled?: string; cancel_error?: string }>;
};

export default async function UserFlightDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createClient();

  const [{ data: flight }, { data: rawMessages }, { data: attachments }, { data: { user } }] = await Promise.all([
    supabase.from("flights").select("*").eq("id", id).single(),
    supabase.from("flight_messages").select("id, message, message_type, created_at, sender_id").eq("flight_id", id).order("created_at", { ascending: true }),
    supabase.from("flight_attachments").select("id, file_path, file_name, file_type, category, created_at").eq("flight_id", id).order("created_at", { ascending: false }),
    supabase.auth.getUser(),
  ]);

  if (!flight) notFound();

  const senderIds = Array.from(new Set((rawMessages ?? []).map((message: any) => message.sender_id).filter(Boolean)));
  const { data: relatedProfiles } = senderIds.length
    ? await supabase.from("profiles").select("id, full_name, email").in("id", senderIds)
    : { data: [] };
  const profileMap = new Map((relatedProfiles ?? []).map((profile: any) => [profile.id, profile]));
  const messages = (rawMessages ?? []).map((message: any) => ({
    ...message,
    profiles: profileMap.get(message.sender_id) ?? null,
  }));

  const imageUrl = await createSignedFlightFileUrl(supabase, flight.flight_image_path);
  const signedAttachments = await createSignedAttachmentUrls(supabase, attachments ?? []);
  const visibleAttachments = signedAttachments.filter((attachment: any) => attachment.category !== "interno");
  const canEditOrCancel = userEditableStatuses.has(flight.status);

  return (
    <div className="space-y-6">
      {query.created === "1" ? (
        <SuccessNotice title="Vuelo enviado correctamente" description="Administración ya puede revisarlo desde su panel." />
      ) : null}

      {query.payment === "1" ? (
        <SuccessNotice title="Comprobante enviado correctamente" description="Administración recibió el comprobante y podrá validar el pago." />
      ) : null}

      {query.updated === "1" ? (
        <SuccessNotice title="Vuelo actualizado correctamente" description="Administración recibió una notificación para revisar los nuevos datos." />
      ) : null}

      {query.cancelled === "1" ? (
        <SuccessNotice title="Vuelo cancelado" description="El vuelo se marcó como cancelado y administración fue notificada." />
      ) : null}

      {query.cancel_error === "1" ? (
        <WarningNotice title="No se pudo cancelar" description="Este vuelo ya no puede cancelarse desde tu panel. Contacta a administración desde mensajes." />
      ) : null}

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Link href="/user/vuelos" className={buttonSecondary}>
          Volver a mis vuelos
        </Link>
        {canEditOrCancel ? <UserFlightActions flightId={flight.id} /> : null}
      </div>

      <FlightProgress status={flight.status} />

      <FlightDetail flight={flight} imageUrl={imageUrl} />

      {flight.status === "esperando_pago" ? <PaymentProofForm flight={flight} /> : null}

      <FlightFilesPanel
        flightId={flight.id}
        attachments={visibleAttachments as any}
      />

      <FlightMessages
        messages={(messages ?? []) as any}
        flightId={flight.id}
        currentUserId={user?.id ?? ""}
      />
    </div>
  );
}

function SuccessNotice({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex items-start gap-3 rounded-[2rem] border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-800">
      <CheckCircle2 className="mt-0.5 shrink-0" size={20} />
      <div>
        <p className="font-black">{title}</p>
        <p className="text-sm font-semibold">{description}</p>
      </div>
    </div>
  );
}

function WarningNotice({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex items-start gap-3 rounded-[2rem] border border-amber-200 bg-amber-50 px-5 py-4 text-amber-900">
      <AlertTriangle className="mt-0.5 shrink-0" size={20} />
      <div>
        <p className="font-black">{title}</p>
        <p className="text-sm font-semibold">{description}</p>
      </div>
    </div>
  );
}

function UserFlightActions({ flightId }: { flightId: string }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <Link href={`/user/vuelos/${flightId}/editar`} className={buttonPrimary}>
        <Edit3 size={16} /> Editar vuelo
      </Link>
      <form action={cancelUserFlightAction} className="flex flex-col gap-2 rounded-3xl border border-rose-200 bg-rose-50/70 p-3 sm:min-w-96">
        <input type="hidden" name="flight_id" value={flightId} />
        <label className="space-y-1">
          <span className={labelClass}>Motivo de cancelación</span>
          <input className={inputClass} name="reason" placeholder="Opcional" />
        </label>
        <ConfirmSubmitButton className={buttonDanger} confirmMessage="¿Cancelar este vuelo? Administración será notificada.">
          <XCircle size={16} /> Cancelar vuelo
        </ConfirmSubmitButton>
      </form>
    </div>
  );
}

function PaymentProofForm({ flight }: { flight: any }) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/60 backdrop-blur">
      <div className="mb-5 flex items-start gap-3">
        <div className="rounded-2xl bg-sky-100 p-2 text-sky-800">
          <UploadCloud size={20} />
        </div>
        <div>
          <p className="text-sm font-black uppercase tracking-[0.24em] text-sky-700">Pago</p>
          <h3 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Subir comprobante de pago</h3>
          <p className="mt-2 text-sm text-slate-500">
            Sube una imagen clara del comprobante. Total a depositar: <strong className="text-slate-900">{formatCurrency(getAmountToPay(flight))}</strong>.
          </p>
        </div>
      </div>

      <form action={uploadPaymentProofAction} className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
        <input type="hidden" name="flight_id" value={flight.id} />
        <input className={inputClass} type="file" name="payment_proof" accept="image/*" required />
        <ConfirmSubmitButton className={buttonPrimary} confirmMessage="¿Enviar este comprobante de pago para validación?">Enviar comprobante</ConfirmSubmitButton>
      </form>
    </section>
  );
}

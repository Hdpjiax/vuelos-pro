import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminInternalNotes } from "@/components/flights/AdminInternalNotes";
import { FlightAdminActions } from "@/components/flights/FlightAdminActions";
import { FlightDetail } from "@/components/flights/FlightDetail";
import { FlightFilesPanel } from "@/components/flights/FlightFilesPanel";
import { FlightMessages } from "@/components/flights/FlightMessages";
import { createClient } from "@/lib/supabase/server";
import { createSignedAttachmentUrls, createSignedFlightFileUrl } from "@/lib/storage";
import { buttonSecondary } from "@/lib/styles";
import {
  addInternalNoteAction,
  confirmPaymentAction,
  sendBankAccountAction,
  updateFinancialsAction,
  updateFlightStatusAction,
  uploadInternalFilesAction,
  uploadQrAction,
} from "./actions";
import type { FlightStatus } from "@/lib/types";

// ─── Tipos locales ────────────────────────────────────────────────────────────

type ProfileSnippet = {
  id: string;
  full_name: string | null;
  email: string | null;
};

type BankAccount = {
  id: string;
  bank_name: string;
  account_holder: string;
  clabe: string;
  active: boolean;
};

type RawMessage = {
  id: string;
  message: string;
  message_type: string;
  created_at: string;
  sender_id: string;
};

type RawNote = {
  id: string;
  note: string;
  created_at: string;
  admin_id: string;
};

type FlightMessage = RawMessage & { profiles: ProfileSnippet | null };
type InternalNote = RawNote & { profiles: ProfileSnippet | null };

type RawFlight = {
  id: string;
  user_id: string;
  status: FlightStatus;
  flight_image_path: string | null;
  total_amount: number | null;
  amount_to_pay: number | null;
  payment_percentage: number | null;
  provider_cost_amount: number | null;
  admin_commission_amount: number | null;
  profit_amount: number | null;
  financial_status: string | null;
  financial_notes: string | null;
  [key: string]: unknown;
};

type Flight = RawFlight & { profiles: ProfileSnippet | null };

type PageProps = {
  params: Promise<{ id: string }>;
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminFlightDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    { data: rawFlight },
    { data: bankAccounts },
    { data: rawMessages },
    { data: attachments },
    { data: settingsRow },
    { data: internalNotes },
  ] = await Promise.all([
    supabase
      .from("flights")
      .select("id, user_id, status, flight_image_path, total_amount, amount_to_pay, payment_percentage, provider_cost_amount, admin_commission_amount, profit_amount, financial_status, financial_notes, flight_folio, flight_date, flight_time, return_flight_date, return_flight_time, flight_type, fare_type, passengers, extras, user_cancel_reason, cancelled_at")
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

  const senderIds = Array.from(
    new Set(
      [
        rawFlight.user_id,
        ...(rawMessages ?? []).map((m: RawMessage) => m.sender_id),
        ...(internalNotes ?? []).map((n: RawNote) => n.admin_id),
      ].filter(Boolean) as string[]
    )
  );
  const { data: { user: adminUser } } = await supabase.auth.getUser();
  const { data: relatedProfiles } = senderIds.length
    ? await supabase.from("profiles").select("id, full_name, email").in("id", senderIds)
    : { data: [] as ProfileSnippet[] };

  const profileMap = new Map((relatedProfiles ?? []).map((p: ProfileSnippet) => [p.id, p]));

  const flight: Flight = { ...(rawFlight as RawFlight), profiles: profileMap.get(rawFlight.user_id) ?? null };

  const messages: FlightMessage[] = (rawMessages ?? []).map((m: RawMessage) => ({
    ...m,
    profiles: profileMap.get(m.sender_id) ?? null,
  }));

  const notes: InternalNote[] = (internalNotes ?? []).map((n: RawNote) => ({
    ...n,
    profiles: profileMap.get(n.admin_id) ?? null,
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

      {/* FlightProgress ahora vive DENTRO de FlightAdminActions con optimisticStatus */}
      <FlightAdminActions
        flight={flight}
        bankAccounts={(bankAccounts ?? []) as BankAccount[]}
        defaultNote={operationsSettings.default_bank_note ?? ""}
        sendBankAccountAction={sendBankAccountAction}
        confirmPaymentAction={confirmPaymentAction}
        uploadQrAction={uploadQrAction}
        updateFinancialsAction={updateFinancialsAction}
        updateFlightStatusAction={updateFlightStatusAction}
      />

      <FlightDetail
        flight={flight}
        imageUrl={imageUrl}
        showUser
      />

      <FlightFilesPanel
        flightId={flight.id}
        attachments={signedAttachments as Parameters<typeof FlightFilesPanel>[0]["attachments"]}
        canUploadInternal
        uploadAction={uploadInternalFilesAction}
        downloadAllHref={`/admin/vuelos/${flight.id}/archivos/descargar`}
      />

      <AdminInternalNotes
        notes={notes as Parameters<typeof AdminInternalNotes>[0]["notes"]}
        flightId={flight.id}
        action={addInternalNoteAction}
      />

      <FlightMessages
        messages={messages as Parameters<typeof FlightMessages>[0]["messages"]}
        flightId={flight.id}
        currentUserId={adminUser?.id ?? ""}
      />
    </div>
  );
}
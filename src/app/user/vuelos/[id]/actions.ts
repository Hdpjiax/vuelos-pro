"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { slugFileName } from "@/lib/storage";
import { buildPaymentProofAdminMessage, logFlightAction, notifyAdmins } from "@/lib/flight-operations";
import { formatFlightFolio } from "@/lib/utils";

function cleanText(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function revalidateFlight(flightId: string) {
  revalidatePath("/user/dashboard");
  revalidatePath("/user/vuelos");
  revalidatePath("/user/mensajes");
  revalidatePath(`/user/vuelos/${flightId}`);
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/vuelos");
  revalidatePath("/admin/mensajes");
  revalidatePath(`/admin/vuelos/${flightId}`);
}

export async function uploadPaymentProofAction(formData: FormData) {
  const supabase = await createClient();
  const flightId = cleanText(formData.get("flight_id"));
  const proof = formData.get("payment_proof");

  if (!flightId) redirect("/user/vuelos");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: flight } = await supabase
    .from("flights")
    .select("id, user_id, status, flight_folio, total_amount, amount_to_pay")
    .eq("id", flightId)
    .single();

  if (!flight || flight.user_id !== user.id) redirect("/user/vuelos");

  if (!(proof instanceof File) || proof.size === 0) redirect(`/user/vuelos/${flightId}`);
  if (!proof.type.startsWith("image/")) redirect(`/user/vuelos/${flightId}`);
  if (proof.size > 8 * 1024 * 1024) redirect(`/user/vuelos/${flightId}`);

  const filePath = `${user.id}/flights/${flightId}/pagos/${crypto.randomUUID()}-${slugFileName(proof.name)}`;

  const { error: uploadError } = await supabase.storage.from("flight-files").upload(filePath, proof, {
    cacheControl: "3600",
    upsert: false,
    contentType: proof.type,
  });

  if (uploadError) redirect(`/user/vuelos/${flightId}`);

  await supabase.from("flight_attachments").insert({
    flight_id: flightId,
    uploaded_by: user.id,
    file_path: filePath,
    file_name: proof.name,
    file_type: proof.type,
    category: "comprobante_pago",
  });

  await supabase
    .from("flights")
    .update({ status: "pago_subido" })
    .eq("id", flightId);

  await supabase.from("flight_messages").insert({
    flight_id: flightId,
    sender_id: user.id,
    receiver_id: null,
    message: "Comprobante de pago enviado. Administracion lo revisara para confirmar el pago.",
    message_type: "comprobante_pago",
  });

  await notifyAdmins(supabase, {
    flight_id: flightId,
    title: "Comprobante de pago recibido",
    body: buildPaymentProofAdminMessage(flight),
    excludeUserId: user.id,
  });

  await logFlightAction(supabase, {
    user_id: user.id,
    action: "payment_proof_uploaded",
    flight_id: flightId,
    metadata: { file_name: proof.name, file_size: proof.size },
  });

  revalidateFlight(flightId);
  revalidatePath("/admin/pagos");

  redirect(`/user/vuelos/${flightId}?payment=1`);
}

export async function cancelUserFlightAction(formData: FormData) {
  const supabase = await createClient();
  const flightId = cleanText(formData.get("flight_id"));
  const reason = cleanText(formData.get("reason"));

  if (!flightId) redirect("/user/vuelos");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { error } = await supabase.rpc("cancel_user_flight", {
    p_flight_id: flightId,
    p_reason: reason,
  });

  revalidateFlight(flightId);

  if (error) {
    redirect(`/user/vuelos/${flightId}?cancel_error=1`);
  }

  await notifyAdmins(supabase, {
    flight_id: flightId,
    title: "Vuelo cancelado por usuario",
    body: `${formatFlightFolio({ id: flightId })} fue cancelado por el usuario. Motivo: ${reason || "Sin motivo capturado"}.`,
    excludeUserId: user.id,
  });

  await logFlightAction(supabase, {
    user_id: user.id,
    action: "flight_user_cancelled",
    flight_id: flightId,
    metadata: { reason: reason || null },
  });

  redirect(`/user/vuelos/${flightId}?cancelled=1`);
}

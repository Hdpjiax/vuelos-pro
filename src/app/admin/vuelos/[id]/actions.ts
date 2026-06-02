"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { slugFileName } from "@/lib/storage";
import { buildStatusNotification, logFlightAction, notifyUser } from "@/lib/flight-operations";
import type { FlightStatus } from "@/lib/types";
import { updateFlightStatusSchema, sendBankAccountSchema, internalNoteSchema, updateFinancialsSchema } from "@/lib/schemas";
const allowedStatuses = new Set([
  "pendiente_revision",
  "esperando_pago",
  "pago_subido",
  "pago_confirmado",
  "pendiente_qr",
  "qr_enviado",
  "completado",
  "cancelado",
]);

function cleanText(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function cleanPercent(value: FormDataEntryValue | null) {
  const raw = cleanText(value).replace(/,/g, ".");
  const number = Number(raw);
  return Number.isFinite(number) ? number : NaN;
}

function cleanMoney(value: FormDataEntryValue | null) {
  const raw = cleanText(value).replace(/,/g, ".");
  const number = Number(raw);
  if (!Number.isFinite(number) || number < 0) return 0;
  return Math.round(number * 100) / 100;
}

function cleanFinancialStatus(value: FormDataEntryValue | null) {
  const status = cleanText(value);
  return ["pendiente", "revisar", "liquidado"].includes(status) ? status : "pendiente";
}

function formatMXN(value: number | string | null | undefined) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(Number(value ?? 0));
}

function getStatusMessage(status: string) {
  const messages: Record<string, string> = {
    esperando_pago: "Tu vuelo fue revisado. Administracion ya envio la cuenta bancaria para continuar con el pago.",
    cancelado: "Tu vuelo fue cancelado por administracion. Revisa los mensajes o contacta a soporte.",
    pago_confirmado: "Tu pago fue confirmado por administracion.",
    pendiente_qr: "Tu pago fue confirmado. Administracion preparara los QR del vuelo.",
    qr_enviado: "Administracion envio los QR de tu vuelo. Revisa el detalle del vuelo y tus mensajes.",
    completado: "Tu vuelo fue marcado como completado.",
  };

  return messages[status] ?? "El estado de tu vuelo fue actualizado por administracion.";
}

async function getCurrentAdmin(supabase: any) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, full_name, email")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") return null;

  return profile;
}

async function getFlight(supabase: any, flightId: string) {
  const { data: flight } = await supabase
    .from("flights")
    .select("id, user_id, flight_folio, flight_date, flight_time, status, total_amount, payment_percentage, amount_to_pay, provider_cost_amount, admin_commission_amount, profit_amount")
    .eq("id", flightId)
    .single();

  return flight;
}

function revalidateFlight(flightId: string) {
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/vuelos");
  revalidatePath("/admin/pagos");
  revalidatePath("/admin/finanzas");
  revalidatePath("/admin/reportes");
  revalidatePath("/admin/buscar");
  revalidatePath("/admin/mensajes");
  revalidatePath(`/admin/vuelos/${flightId}`);
  revalidatePath("/user/dashboard");
  revalidatePath("/user/vuelos");
  revalidatePath("/user/mensajes");
  revalidatePath(`/user/vuelos/${flightId}`);
}

export async function updateFlightStatusAction(formData: FormData) {
  const supabase = await createClient();

  // ✅ Zod valida y tipifica de una vez
  const parsed = updateFlightStatusSchema.safeParse({
    flight_id: formData.get("flight_id"),
    status: formData.get("status"),
  });

  if (!parsed.success) redirect("/admin/vuelos");

  const { flight_id: flightId, status: nextStatus } = parsed.data;

  const admin = await getCurrentAdmin(supabase);
  if (!admin) redirect("/login");

  const flight = await getFlight(supabase, flightId);
  if (!flight) redirect("/admin/vuelos");

  const { error } = await supabase
    .from("flights")
    .update({ status: nextStatus })
    .eq("id", flightId);

  if (!error) {
    const notification = buildStatusNotification(nextStatus);
    await notifyUser(supabase, {
      user_id: flight.user_id,
      flight_id: flightId,
      title: notification.title,
      body: notification.body,
    });

    await supabase.from("flight_messages").insert({
      flight_id: flightId,
      sender_id: admin.id,
      receiver_id: flight.user_id,
      message: getStatusMessage(nextStatus),
      message_type: "estado",
    });

    await logFlightAction(supabase, {
      user_id: admin.id,
      action: "flight_status_changed",
      flight_id: flightId,
      metadata: { status: nextStatus },
    });
  }

  revalidateFlight(flightId);
  redirect(`/admin/vuelos/${flightId}`);
}

export async function sendBankAccountAction(formData: FormData) {
  const supabase = await createClient();

  const parsed = sendBankAccountSchema.safeParse({
    flight_id: formData.get("flight_id"),
    bank_account_id: formData.get("bank_account_id"),
    payment_percentage: formData.get("payment_percentage"),
    note: formData.get("note") ?? "",
  });

  if (!parsed.success) redirect("/admin/vuelos");

  const { flight_id: flightId, bank_account_id: bankAccountId, payment_percentage: paymentPercentage, note } = parsed.data;

  const admin = await getCurrentAdmin(supabase);
  if (!admin) redirect("/login");

  const flight = await getFlight(supabase, flightId);
  if (!flight) redirect("/admin/vuelos");

  const totalAmount = Number(flight.total_amount ?? 0);
  const amountToPay = Math.round((totalAmount * paymentPercentage / 100) * 100) / 100;
  const discountAmount = Math.max(0, totalAmount - amountToPay);

  const { data: bankAccount } = await supabase
    .from("bank_accounts")
    .select("bank_name, account_holder, clabe")
    .eq("id", bankAccountId)
    .eq("active", true)
    .single();

  if (!bankAccount) redirect(`/admin/vuelos/${flightId}`);

  const message = [
    "Cuenta bancaria para realizar el deposito:",
    `Banco: ${bankAccount.bank_name}`,
    `Titular: ${bankAccount.account_holder}`,
    `CLABE: ${bankAccount.clabe}`,
    `Total original del vuelo: ${formatMXN(totalAmount)}`,
    `Porcentaje a pagar autorizado: ${paymentPercentage}%`,
    discountAmount > 0 ? `Descuento aplicado: ${formatMXN(discountAmount)}` : "",
    `Total a depositar: ${formatMXN(amountToPay)}`,
    note ? `Nota: ${note}` : "",
  ].filter(Boolean).join("\n");

  await supabase.from("flight_messages").insert({
    flight_id: flightId,
    sender_id: admin.id,
    receiver_id: flight.user_id,
    message,
    message_type: "cuenta_bancaria",
  });

  await supabase.from("flights").update({
    status: "esperando_pago",
    payment_percentage: paymentPercentage,
    amount_to_pay: amountToPay,
  }).eq("id", flightId);

  await notifyUser(supabase, {
    user_id: flight.user_id,
    flight_id: flightId,
    title: "Cuenta bancaria enviada",
    body: `Administracion envio la cuenta bancaria y el total a depositar: ${formatMXN(amountToPay)}.`,
  });

  await supabase.from("audit_logs").insert({
    user_id: admin.id,
    action: "bank_account_sent",
    entity_type: "flight",
    entity_id: flightId,
    metadata: { bank_account_id: bankAccountId, payment_percentage: paymentPercentage, amount_to_pay: amountToPay },
  });

  revalidateFlight(flightId);
  redirect(`/admin/vuelos/${flightId}`);
}

export async function confirmPaymentAction(formData: FormData) {
  const supabase = await createClient();
  const flightId = cleanText(formData.get("flight_id"));

  if (!flightId) redirect("/admin/pagos");

  const admin = await getCurrentAdmin(supabase);
  if (!admin) redirect("/login");

  const flight = await getFlight(supabase, flightId);
  if (!flight) redirect("/admin/pagos");

  await supabase
    .from("flights")
    .update({ status: "pendiente_qr" })
    .eq("id", flightId);

  const message = "Pago confirmado. El vuelo queda pendiente por enviar QR.";

  await supabase.from("flight_messages").insert({
    flight_id: flightId,
    sender_id: admin.id,
    receiver_id: flight.user_id,
    message,
    message_type: "pago_confirmado",
  });

  await notifyUser(supabase, {
    user_id: flight.user_id,
    flight_id: flightId,
    title: "Pago confirmado",
    body: "Administracion confirmo tu pago. Ahora preparara los QR del vuelo.",
  });

  await logFlightAction(supabase, {
    user_id: admin.id,
    action: "payment_confirmed",
    flight_id: flightId,
    metadata: {},
  });

  revalidateFlight(flightId);
  redirect(`/admin/vuelos/${flightId}`);
}

export async function uploadQrAction(formData: FormData) {
  const supabase = await createClient();
  const flightId = cleanText(formData.get("flight_id"));
  const files = formData.getAll("qr_files").filter((item): item is File => item instanceof File && item.size > 0);

  if (!flightId) redirect("/admin/vuelos");

  const admin = await getCurrentAdmin(supabase);
  if (!admin) redirect("/login");

  const flight = await getFlight(supabase, flightId);
  if (!flight) redirect("/admin/vuelos");

  if (!files.length) redirect(`/admin/vuelos/${flightId}`);

  const maxSize = 8 * 1024 * 1024;
  const uploadedPaths: string[] = [];

  for (const file of files) {
    if (!file.type.startsWith("image/")) continue;
    if (file.size > maxSize) continue;

    const filePath = `${admin.id}/flights/${flightId}/qr/${crypto.randomUUID()}-${slugFileName(file.name)}`;
    const { error: uploadError } = await supabase.storage.from("flight-files").upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });

    if (!uploadError) {
      uploadedPaths.push(filePath);
      await supabase.from("flight_attachments").insert({
        flight_id: flightId,
        uploaded_by: admin.id,
        file_path: filePath,
        file_name: file.name,
        file_type: file.type,
        category: "qr",
      });
    }
  }

  if (uploadedPaths.length > 0) {
    await supabase
      .from("flights")
      .update({ status: "qr_enviado" })
      .eq("id", flightId);

    await supabase.from("flight_messages").insert({
      flight_id: flightId,
      sender_id: admin.id,
      receiver_id: flight.user_id,
      message: `QR enviados para el vuelo. Archivos adjuntos: ${uploadedPaths.length}.`,
      message_type: "qr_enviado",
    });

    await notifyUser(supabase, {
      user_id: flight.user_id,
      flight_id: flightId,
      title: "QR enviados",
      body: "Administracion envio los QR de tu vuelo. Revisa el detalle del vuelo.",
    });

    await supabase.from("audit_logs").insert({
      user_id: admin.id,
      action: "qr_uploaded",
      entity_type: "flight",
      entity_id: flightId,
      metadata: { files: uploadedPaths.length },
    });
  }

  revalidateFlight(flightId);
  redirect(`/admin/vuelos/${flightId}`);
}


export async function updateFinancialsAction(formData: FormData) {
  const supabase = await createClient();
  const flightId = cleanText(formData.get("flight_id"));

  if (!flightId) redirect("/admin/vuelos");

  const admin = await getCurrentAdmin(supabase);
  if (!admin) redirect("/login");

  const flight = await getFlight(supabase, flightId);
  if (!flight) redirect("/admin/vuelos");

  const providerCost = cleanMoney(formData.get("provider_cost_amount"));
  const adminCommission = cleanMoney(formData.get("admin_commission_amount"));
  const financialStatus = cleanFinancialStatus(formData.get("financial_status"));
  const financialNotes = cleanText(formData.get("financial_notes"));
  const amountToPay = Number(flight.amount_to_pay ?? flight.total_amount ?? 0);
  const profitAmount = Math.round((amountToPay - providerCost - adminCommission) * 100) / 100;

  await supabase
    .from("flights")
    .update({
      provider_cost_amount: providerCost,
      admin_commission_amount: adminCommission,
      profit_amount: profitAmount,
      financial_status: financialStatus,
      financial_notes: financialNotes || null,
      financial_updated_at: new Date().toISOString(),
      financial_updated_by: admin.id,
    })
    .eq("id", flightId);

  await supabase.from("audit_logs").insert({
    user_id: admin.id,
    action: "financials_updated",
    entity_type: "flight",
    entity_id: flightId,
    metadata: {
      provider_cost_amount: providerCost,
      admin_commission_amount: adminCommission,
      profit_amount: profitAmount,
      financial_status: financialStatus,
    },
  });

  revalidateFlight(flightId);
  revalidatePath("/admin/finanzas");
  revalidatePath("/admin/reportes");
  redirect(`/admin/vuelos/${flightId}?financials=1`);
}


export async function addInternalNoteAction(formData: FormData) {
  const supabase = await createClient();
  const flightId = cleanText(formData.get("flight_id"));
  const note = cleanText(formData.get("note"));

  if (!flightId) redirect("/admin/vuelos");

  const admin = await getCurrentAdmin(supabase);
  if (!admin) redirect("/login");

  const flight = await getFlight(supabase, flightId);
  if (!flight) redirect("/admin/vuelos");

  if (note.length < 3) redirect(`/admin/vuelos/${flightId}`);

  await supabase.from("flight_internal_notes").insert({
    flight_id: flightId,
    admin_id: admin.id,
    note: note.slice(0, 1200),
  });

  await logFlightAction(supabase, {
    user_id: admin.id,
    action: "internal_note_created",
    flight_id: flightId,
    metadata: { preview: note.slice(0, 160) },
  });

  revalidateFlight(flightId);
  redirect(`/admin/vuelos/${flightId}?note=1`);
}

export async function uploadInternalFilesAction(formData: FormData) {
  const supabase = await createClient();
  const flightId = cleanText(formData.get("flight_id"));
  const files = formData.getAll("internal_files").filter((item): item is File => item instanceof File && item.size > 0);

  if (!flightId) redirect("/admin/vuelos");

  const admin = await getCurrentAdmin(supabase);
  if (!admin) redirect("/login");

  const flight = await getFlight(supabase, flightId);
  if (!flight) redirect("/admin/vuelos");

  if (!files.length) redirect(`/admin/vuelos/${flightId}`);

  const maxSize = 10 * 1024 * 1024;
  let uploaded = 0;

  for (const file of files) {
    const allowed = file.type.startsWith("image/") || file.type === "application/pdf";
    if (!allowed || file.size > maxSize) continue;

    const filePath = `${admin.id}/flights/${flightId}/internos/${crypto.randomUUID()}-${slugFileName(file.name)}`;
    const { error: uploadError } = await supabase.storage.from("flight-files").upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });

    if (!uploadError) {
      uploaded += 1;
      await supabase.from("flight_attachments").insert({
        flight_id: flightId,
        uploaded_by: admin.id,
        file_path: filePath,
        file_name: file.name,
        file_type: file.type,
        category: "interno",
      });
    }
  }

  if (uploaded > 0) {
    await logFlightAction(supabase, {
      user_id: admin.id,
      action: "internal_files_uploaded",
      flight_id: flightId,
      metadata: { files: uploaded },
    });
  }

  revalidateFlight(flightId);
  revalidatePath("/admin/archivos");
  redirect(`/admin/vuelos/${flightId}?internal_files=${uploaded}`);
}

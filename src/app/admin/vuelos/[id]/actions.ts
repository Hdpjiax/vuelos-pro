"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { slugFileName } from "@/lib/storage";
import { buildStatusNotification, logFlightAction, notifyUser } from "@/lib/flight-operations";
import { updateFlightStatusSchema, sendBankAccountSchema, updateFinancialsSchema } from "@/lib/schemas";

function cleanText(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function cleanMoney(value: FormDataEntryValue | null) {
  const raw = cleanText(value).replace(/,/g, ".");
  const number = Number(raw);
  if (!Number.isFinite(number) || number < 0) return 0;
  return Math.round(number * 100) / 100;
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
  const amountToPay = Math.round(((totalAmount * paymentPercentage) / 100) * 100) / 100;
  const discountAmount = Math.max(0, totalAmount - amountToPay);

  const { data: bankAccount } = await supabase
    .from("bank_accounts")
    .select("bank_name, account_holder, clabe")
    .eq("id", bankAccountId)
    .eq("active", true)
    .single();

  if (!bankAccount) redirect(`/admin/vuelos/${flightId}`);

  const message = [
    "DATOS PARA DEPOSITO",
    "Admin ya reviso tu vuelo. Usa los siguientes datos para realizar tu pago:",
    `Titular: ${bankAccount.account_holder}`,
    `Banco: ${bankAccount.bank_name}`,
    `CLABE: ${bankAccount.clabe}`,
    `Total original: ${formatMXN(totalAmount)}`,
    `Porcentaje autorizado: ${paymentPercentage}%`,
    `Descuento aplicado: ${formatMXN(discountAmount)}`,
    `Total a depositar: ${formatMXN(amountToPay)}`,
    note ? `Nota: ${note}` : "",
    "Despues de pagar, sube tu comprobante desde el detalle del vuelo.",
  ].filter(Boolean).join("\n");

  await supabase.from("flight_messages").insert({
    flight_id: flightId,
    sender_id: admin.id,
    receiver_id: flight.user_id,
    message,
    message_type: "cuenta_bancaria",
  });

  await supabase
    .from("flights")
    .update({
      status: "esperando_pago",
      payment_percentage: paymentPercentage,
      amount_to_pay: amountToPay,
    })
    .eq("id", flightId);

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

  await supabase.from("flight_messages").insert({
    flight_id: flightId,
    sender_id: admin.id,
    receiver_id: flight.user_id,
    message: "Pago confirmado. El vuelo queda pendiente por enviar QR.",
    message_type: "pago_confirmado",
  });

  await notifyUser(supabase, {
    user_id: flight.user_id,
    flight_id: flightId,
    title: "Pago confirmado",
    body: "Tu comprobante fue validado. Estamos preparando tus QR.",
  });

  await logFlightAction(supabase, {
    user_id: admin.id,
    action: "flight_status_changed",
    flight_id: flightId,
    metadata: { status: "pendiente_qr" },
  });

  revalidateFlight(flightId);
  redirect(`/admin/vuelos/${flightId}`);
}

export async function uploadQrAction(formData: FormData) {
  const supabase = await createClient();
  const flightId = cleanText(formData.get("flight_id"));

  if (!flightId) redirect("/admin/vuelos");

  const admin = await getCurrentAdmin(supabase);
  if (!admin) redirect("/login");

  const flight = await getFlight(supabase, flightId);
  if (!flight) redirect("/admin/vuelos");

  const files = [...formData.getAll("qr_files"), ...formData.getAll("qr_file")]
    .filter((file): file is File => file instanceof File && file.size > 0);

  if (!files.length) redirect(`/admin/vuelos/${flightId}`);

  const uploaded: { name: string; path: string; size: number; type: string }[] = [];

  for (const file of files) {
    const isAllowed = file.type.startsWith("image/") || file.type === "application/pdf";
    if (!isAllowed || file.size > 12 * 1024 * 1024) continue;

    const path = `${flight.user_id}/flights/${flightId}/qr/${crypto.randomUUID()}-${slugFileName(file.name)}`;
    const { error: uploadError } = await supabase.storage.from("flight-files").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });

    if (uploadError) continue;

    await supabase.from("flight_attachments").insert({
      flight_id: flightId,
      uploaded_by: admin.id,
      file_path: path,
      file_name: file.name,
      file_type: file.type,
      category: "qr",
    });

    await supabase.from("flight_files").insert({
      flight_id: flightId,
      user_id: flight.user_id,
      file_type: "qr",
      file_path: path,
      original_name: file.name,
      mime_type: file.type,
      size_bytes: file.size,
    });

    uploaded.push({ name: file.name, path, size: file.size, type: file.type });
  }

  if (!uploaded.length) redirect(`/admin/vuelos/${flightId}`);

  await supabase.from("flights").update({ status: "qr_enviado" }).eq("id", flightId);

  const message = uploaded.length === 1
    ? "QR enviado. Ya puedes abrirlo o descargarlo desde el detalle de tu vuelo."
    : `QR enviados. Se adjuntaron ${uploaded.length} archivos. Ya puedes abrirlos o descargarlos desde el detalle de tu vuelo.`;

  await supabase.from("flight_messages").insert({
    flight_id: flightId,
    sender_id: admin.id,
    receiver_id: flight.user_id,
    message,
    message_type: "qr_enviado",
  });

  await notifyUser(supabase, {
    user_id: flight.user_id,
    flight_id: flightId,
    title: uploaded.length === 1 ? "QR enviado" : "QR enviados",
    body: uploaded.length === 1
      ? "Tu QR ya esta disponible en el detalle del vuelo."
      : `Tus ${uploaded.length} archivos QR ya estan disponibles en el detalle del vuelo.`,
  });

  await logFlightAction(supabase, {
    user_id: admin.id,
    action: "qr_uploaded",
    flight_id: flightId,
    metadata: { files: uploaded.map((file) => ({ name: file.name, size: file.size, type: file.type })) },
  });

  revalidateFlight(flightId);
  redirect(`/admin/vuelos/${flightId}`);
}

export async function uploadInternalFilesAction(formData: FormData) {
  const supabase = await createClient();
  const flightId = cleanText(formData.get("flight_id"));

  if (!flightId) redirect("/admin/vuelos");

  const admin = await getCurrentAdmin(supabase);
  if (!admin) redirect("/login");

  const flight = await getFlight(supabase, flightId);
  if (!flight) redirect("/admin/vuelos");

  const files = formData
    .getAll("internal_files")
    .filter((file): file is File => file instanceof File && file.size > 0);

  if (!files.length) redirect(`/admin/vuelos/${flightId}`);

  const uploaded: { name: string; path: string; size: number; type: string }[] = [];

  for (const file of files) {
    const isAllowed = file.type.startsWith("image/") || file.type === "application/pdf";
    if (!isAllowed || file.size > 12 * 1024 * 1024) continue;

    const path = `${flight.user_id}/flights/${flightId}/internos/${crypto.randomUUID()}-${slugFileName(file.name)}`;
    const { error: uploadError } = await supabase.storage.from("flight-files").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });

    if (uploadError) continue;

    await supabase.from("flight_attachments").insert({
      flight_id: flightId,
      uploaded_by: admin.id,
      file_path: path,
      file_name: file.name,
      file_type: file.type,
      category: "interno",
    });

    uploaded.push({ name: file.name, path, size: file.size, type: file.type });
  }

  if (uploaded.length) {
    await logFlightAction(supabase, {
      user_id: admin.id,
      action: "internal_files_uploaded",
      flight_id: flightId,
      metadata: { files: uploaded.map((file) => ({ name: file.name, size: file.size, type: file.type })) },
    });
  }

  revalidateFlight(flightId);
  redirect(`/admin/vuelos/${flightId}`);
}

export async function addInternalNoteAction(formData: FormData) {
  const supabase = await createClient();
  const flightId = cleanText(formData.get("flight_id"));
  const note = cleanText(formData.get("note"));

  if (!flightId || !note) redirect(`/admin/vuelos/${flightId}`);

  const admin = await getCurrentAdmin(supabase);
  if (!admin) redirect("/login");

  await supabase.from("flight_internal_notes").insert({
    flight_id: flightId,
    admin_id: admin.id,
    note,
  });

  revalidateFlight(flightId);
  redirect(`/admin/vuelos/${flightId}`);
}

export async function updateFinancialsAction(formData: FormData) {
  const supabase = await createClient();
  const parsed = updateFinancialsSchema.safeParse({
    flight_id: formData.get("flight_id"),
    provider_cost_amount: formData.get("provider_cost_amount"),
    admin_commission_amount: formData.get("admin_commission_amount"),
    financial_status: formData.get("financial_status"),
  });

  if (!parsed.success) redirect("/admin/vuelos");

  const admin = await getCurrentAdmin(supabase);
  if (!admin) redirect("/login");

  const { flight_id: flightId, provider_cost_amount, admin_commission_amount, financial_status } = parsed.data;
  const providerCost = cleanMoney(String(provider_cost_amount));
  const adminCommission = cleanMoney(String(admin_commission_amount));
  const profit = Math.round((adminCommission - providerCost) * 100) / 100;

  await supabase
    .from("flights")
    .update({
      provider_cost_amount: providerCost,
      admin_commission_amount: adminCommission,
      profit_amount: profit,
      financial_status,
    })
    .eq("id", flightId);

  await supabase.from("audit_logs").insert({
    user_id: admin.id,
    action: "flight_financials_updated",
    entity_type: "flight",
    entity_id: flightId,
    metadata: { provider_cost_amount: providerCost, admin_commission_amount: adminCommission, profit_amount: profit, financial_status },
  });

  revalidateFlight(flightId);
  redirect(`/admin/vuelos/${flightId}`);
}

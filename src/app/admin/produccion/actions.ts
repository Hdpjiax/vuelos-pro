"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function cleanText(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function cleanInteger(value: FormDataEntryValue | null, fallback: number, min: number, max: number) {
  const number = Number(cleanText(value));
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(number)));
}

function cleanBoolean(value: FormDataEntryValue | null) {
  return cleanText(value) === "on";
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

export async function saveProductionSettingsAction(formData: FormData) {
  const supabase = await createClient();
  const admin = await getCurrentAdmin(supabase);
  if (!admin) redirect("/login");

  const value = {
    site_url: cleanText(formData.get("site_url")),
    support_escalation_email: cleanText(formData.get("support_escalation_email")),
    legal_notice: cleanText(formData.get("legal_notice")),
    public_registration_enabled: cleanBoolean(formData.get("public_registration_enabled")),
    max_upload_mb: cleanInteger(formData.get("max_upload_mb"), 8, 1, 25),
    cleanup_read_notifications_days: cleanInteger(formData.get("cleanup_read_notifications_days"), 45, 7, 365),
  };

  await supabase.from("app_settings").upsert({
    key: "production",
    value,
    updated_by: admin.id,
  });

  await supabase.from("audit_logs").insert({
    user_id: admin.id,
    action: "production_settings_updated",
    entity_type: "settings",
    entity_id: null,
    metadata: value,
  });

  revalidatePath("/admin/produccion");
  revalidatePath("/register");
  redirect("/admin/produccion?saved=1");
}

export async function cleanupReadNotificationsAction(formData: FormData) {
  const supabase = await createClient();
  const admin = await getCurrentAdmin(supabase);
  if (!admin) redirect("/login");

  const days = cleanInteger(formData.get("older_than_days"), 45, 7, 365);
  const { data, error } = await supabase.rpc("cleanup_read_notifications", {
    p_older_than_days: days,
  });

  if (!error) {
    await supabase.from("audit_logs").insert({
      user_id: admin.id,
      action: "read_notifications_cleaned",
      entity_type: "maintenance",
      entity_id: null,
      metadata: { older_than_days: days, deleted_count: data ?? 0 },
    });
  }

  revalidatePath("/admin/produccion");
  revalidatePath("/admin/notificaciones");
  redirect(`/admin/produccion?cleaned=${encodeURIComponent(String(data ?? 0))}`);
}

export async function deleteAttachmentAction(formData: FormData) {
  const supabase = await createClient();
  const admin = await getCurrentAdmin(supabase);
  if (!admin) redirect("/login");

  const attachmentId = cleanText(formData.get("attachment_id"));
  if (!attachmentId) redirect("/admin/produccion");

  const { data: attachment } = await supabase
    .from("flight_attachments")
    .select("id, flight_id, file_path, file_name")
    .eq("id", attachmentId)
    .single();

  if (!attachment) redirect("/admin/produccion?deleted=0");

  if (attachment.file_path) {
    await supabase.storage.from("flight-files").remove([attachment.file_path]);
  }

  await supabase.from("flight_attachments").delete().eq("id", attachment.id);

  await supabase.from("audit_logs").insert({
    user_id: admin.id,
    action: "attachment_deleted",
    entity_type: "flight",
    entity_id: attachment.flight_id,
    metadata: {
      attachment_id: attachment.id,
      file_name: attachment.file_name,
      file_path: attachment.file_path,
    },
  });

  revalidatePath("/admin/produccion");
  revalidatePath(`/admin/vuelos/${attachment.flight_id}`);
  revalidatePath(`/user/vuelos/${attachment.flight_id}`);
  redirect("/admin/produccion?deleted=1");
}

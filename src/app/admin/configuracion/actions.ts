"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function cleanText(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function cleanInteger(value: FormDataEntryValue | null, fallback: number) {
  const number = Number(cleanText(value));
  if (!Number.isFinite(number)) return fallback;
  return Math.max(1, Math.min(15, Math.floor(number)));
}

export async function saveOperationsSettingsAction(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/login");

  const value = {
    support_email: cleanText(formData.get("support_email")),
    support_whatsapp: cleanText(formData.get("support_whatsapp")),
    default_bank_note: cleanText(formData.get("default_bank_note")),
    qr_delivery_note: cleanText(formData.get("qr_delivery_note")),
    urgent_window_days: cleanInteger(formData.get("urgent_window_days"), 3),
  };

  await supabase.from("app_settings").upsert({
    key: "operations",
    value,
    updated_by: user.id,
  });

  await supabase.from("audit_logs").insert({
    user_id: user.id,
    action: "app_settings_updated",
    entity_type: "settings",
    entity_id: null,
    metadata: value,
  });

  revalidatePath("/admin/configuracion");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/vuelos");
  redirect("/admin/configuracion?saved=1");
}

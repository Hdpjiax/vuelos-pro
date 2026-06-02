"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function cleanText(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

async function getCurrentUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabase, userId: user?.id ?? null };
}

function revalidateNotifications() {
  revalidatePath("/admin/notificaciones");
  revalidatePath("/user/notificaciones");
  revalidatePath("/admin/dashboard");
  revalidatePath("/user/dashboard");
}

export async function markNotificationReadAction(formData: FormData) {
  const notificationId = cleanText(formData.get("notification_id"));
  const redirectTo = cleanText(formData.get("redirect_to")) || "/user/notificaciones";

  if (!notificationId) redirect(redirectTo);

  const { supabase, userId } = await getCurrentUserId();
  if (!userId) redirect("/login");

  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", notificationId)
    .eq("user_id", userId);

  await supabase.from("audit_logs").insert({
    user_id: userId,
    action: "notification_read",
    entity_type: "notification",
    entity_id: notificationId,
  });

  revalidateNotifications();
  redirect(redirectTo);
}

export async function markNotificationGroupReadAction(formData: FormData) {
  const notificationIds = cleanText(formData.get("notification_ids"))
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  const redirectTo = cleanText(formData.get("redirect_to")) || "/user/notificaciones";

  if (!notificationIds.length) redirect(redirectTo);

  const { supabase, userId } = await getCurrentUserId();
  if (!userId) redirect("/login");

  await supabase
    .from("notifications")
    .update({ read: true })
    .in("id", notificationIds)
    .eq("user_id", userId);

  await supabase.from("audit_logs").insert({
    user_id: userId,
    action: "notification_group_read",
    entity_type: "notification",
    entity_id: notificationIds[0],
    metadata: { count: notificationIds.length, notification_ids: notificationIds },
  });

  revalidateNotifications();
  redirect(redirectTo);
}

export async function markAllNotificationsReadAction(formData: FormData) {
  const redirectTo = cleanText(formData.get("redirect_to")) || "/user/notificaciones";
  const { supabase, userId } = await getCurrentUserId();

  if (!userId) redirect("/login");

  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", userId)
    .eq("read", false);

  await supabase.from("audit_logs").insert({
    user_id: userId,
    action: "notifications_read_all",
    entity_type: "notification",
    metadata: { scope: "current_user" },
  });

  revalidateNotifications();
  redirect(redirectTo);
}

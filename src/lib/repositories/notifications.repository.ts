import type { SupabaseClient } from "@supabase/supabase-js";
import type { Notification } from "@/lib/types";

// Notificaciones de un usuario
export async function getUserNotifications(
  supabase: SupabaseClient,
  userId: string
): Promise<Notification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`getUserNotifications: ${error.message}`);
  return data ?? [];
}

// Cantidad de notificaciones no leídas
export async function getUnreadCount(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("read", false);

  if (error) throw new Error(`getUnreadCount: ${error.message}`);
  return count ?? 0;
}

// Marcar todas como leídas
export async function markAllAsRead(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", userId)
    .eq("read", false);

  if (error) throw new Error(`markAllAsRead: ${error.message}`);
}
import { NotificationsList } from "@/components/notifications/NotificationsList";
import { createClient } from "@/lib/supabase/server";

export default async function AdminNotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, title, body, read, created_at, flight_id, flights(id, flight_date, flight_time, status)")
    .eq("user_id", user?.id)
    .order("created_at", { ascending: false })
    .limit(100);

  return <NotificationsList role="admin" notifications={(notifications ?? []) as any} />;
}

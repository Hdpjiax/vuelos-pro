"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function sendChatMessageAction(formData: FormData) {
  const supabase = await createClient();
  const flightId = String(formData.get("flight_id") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!flightId || message.length < 1 || message.length > 1000) return;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  const { data: flight } = await supabase
    .from("flights")
    .select("id, user_id")
    .eq("id", flightId)
    .single();

  if (!flight) return;

  const receiverId =
    profile.role === "admin" ? flight.user_id : null;

  await supabase.from("flight_messages").insert({
    flight_id: flightId,
    sender_id: user.id,
    receiver_id: receiverId,
    message: message.slice(0, 1000),
    message_type: "chat",
  });

  revalidatePath(`/admin/vuelos/${flightId}`);
  revalidatePath(`/user/vuelos/${flightId}`);
}
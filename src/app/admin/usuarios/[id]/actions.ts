"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const allowedRoles = new Set(["user", "admin"]);

function cleanText(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

export async function updateUserRoleAction(formData: FormData) {
  const supabase = await createClient();
  const targetUserId = cleanText(formData.get("user_id"));
  const nextRole = cleanText(formData.get("role"));

  if (!targetUserId || !allowedRoles.has(nextRole)) redirect("/admin/usuarios");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();

  if (currentProfile?.role !== "admin") redirect("/user/dashboard");

  if (targetUserId === user.id && nextRole !== "admin") {
    redirect(`/admin/usuarios/${targetUserId}?error=${encodeURIComponent("No puedes quitarte tu propio rol de administrador.")}`);
  }

  const { data: targetProfile } = await supabase
    .from("profiles")
    .select("id, role, email")
    .eq("id", targetUserId)
    .single();

  if (!targetProfile) redirect("/admin/usuarios");

  await supabase
    .from("profiles")
    .update({ role: nextRole })
    .eq("id", targetUserId);

  await supabase.from("audit_logs").insert({
    user_id: user.id,
    action: "user_role_updated",
    entity_type: "profile",
    entity_id: targetUserId,
    metadata: { from: targetProfile.role, to: nextRole, email: targetProfile.email },
  });

  await supabase.from("notifications").insert({
    user_id: targetUserId,
    title: "Rol actualizado",
    body: nextRole === "admin" ? "Tu cuenta ahora tiene permisos de administrador." : "Tu cuenta ahora tiene permisos de usuario.",
  });

  revalidatePath("/admin/usuarios");
  revalidatePath(`/admin/usuarios/${targetUserId}`);
  redirect(`/admin/usuarios/${targetUserId}`);
}

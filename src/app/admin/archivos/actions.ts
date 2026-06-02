"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function cleanText(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

async function getCurrentAdmin(supabase: any) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") return null;
  return profile;
}

export async function deleteAdminAttachmentAction(formData: FormData) {
  const supabase = await createClient();
  const admin = await getCurrentAdmin(supabase);
  if (!admin) redirect("/login");

  const attachmentId = cleanText(formData.get("attachment_id"));
  const returnTo = cleanText(formData.get("return_to")) || "/admin/archivos";
  if (!attachmentId) redirect(returnTo);

  const { data: attachment } = await supabase
    .from("flight_attachments")
    .select("id, flight_id, file_path, file_name, category")
    .eq("id", attachmentId)
    .single();

  if (!attachment) redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}deleted=0`);

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
      category: attachment.category,
      file_path: attachment.file_path,
    },
  });

  revalidatePath("/admin/archivos");
  revalidatePath("/admin/produccion");
  revalidatePath(`/admin/vuelos/${attachment.flight_id}`);
  revalidatePath(`/user/vuelos/${attachment.flight_id}`);

  redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}deleted=1`);
}

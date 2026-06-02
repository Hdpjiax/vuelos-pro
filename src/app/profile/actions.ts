"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function cleanText(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function safeReturnTo(value: string) {
  if (value === "/admin/perfil" || value === "/user/perfil") return value;
  return "/user/perfil";
}

export async function updateOwnProfileAction(formData: FormData) {
  const returnTo = safeReturnTo(cleanText(formData.get("returnTo")));
  const fullName = cleanText(formData.get("fullName"));
  const phone = cleanText(formData.get("phone"));
  const companyName = cleanText(formData.get("companyName"));

  if (!fullName) {
    redirect(`${returnTo}?error=${encodeURIComponent("El nombre completo es obligatorio.")}`);
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { error } = await supabase.rpc("update_own_profile", {
    p_full_name: fullName,
    p_phone: phone,
    p_company_name: companyName,
  });

  if (error) {
    redirect(`${returnTo}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/perfil");
  revalidatePath("/user/perfil");
  revalidatePath("/admin/dashboard");
  revalidatePath("/user/dashboard");
  redirect(`${returnTo}?success=${encodeURIComponent("Perfil actualizado correctamente.")}`);
}

"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type RegisterState = {
  error?: string;
  success?: boolean;
};

export async function registerAction(
  _prev: RegisterState,
  formData: FormData
): Promise<RegisterState> {
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!fullName || !email || !password) {
    return { error: "Completa todos los campos." };
  }

  if (password.length < 6) {
    return { error: "La contraseña debe tener mínimo 6 caracteres." };
  }

  const supabase = await createClient();

  const { data: productionRow } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "production")
    .maybeSingle();

  const registrationEnabled =
    (productionRow?.value as { public_registration_enabled?: boolean } | null)
      ?.public_registration_enabled ?? true;

  if (!registrationEnabled) {
    return { error: "El registro público está desactivado. Solicita tu cuenta al administrador." };
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });

  if (error) {
    // ✅ Mensaje genérico — no expone detalles de Supabase
    return { error: "No se pudo crear la cuenta. Verifica los datos e intenta de nuevo." };
  }

  redirect("/login?success=1");
}
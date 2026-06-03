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

  // Verificar si el registro está habilitado — con manejo de error seguro
  try {
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
  } catch {
    // Si app_settings falla, continuar igual (no bloquear el registro)
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });

  if (error) {
    // Mapear errores comunes de Supabase a mensajes en español
    if (error.message.includes("already registered") || error.message.includes("already been registered")) {
      return { error: "Este correo ya tiene una cuenta registrada." };
    }
    if (error.message.includes("Password")) {
      return { error: "La contraseña no cumple los requisitos mínimos." };
    }
    if (error.message.includes("email")) {
      return { error: "El correo electrónico no es válido." };
    }
    if (error.message.includes("signup")) {
      return { error: "El registro está desactivado en este momento." };
    }
    // En desarrollo: mostrar el error real para diagnosticar
    return { error: `Error: ${error.message}` };
  }

  redirect("/login?success=1");
}
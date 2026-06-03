"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resend } from "@/lib/resend";
import { WelcomeEmail } from "@/lib/emails/welcome";

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
    // continuar si falla app_settings
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });

  if (error) {
    if (error.message.includes("rate limit")) {
      return { error: "Demasiados registros en poco tiempo. Espera unos minutos." };
    }
    return { error: `Error: ${error.message}` };
  }

  // Enviar correo de bienvenida (sin bloquear el registro si falla)
  try {
    await resend.emails.send({
      from: 'VuelosPro <garia350@vuelos-gn.com>',
      to: email,
      subject: '¡Bienvenido a VuelosPro! ✈️',
      react: WelcomeEmail({ fullName }),
    });
  } catch {
    // No bloquear si el correo falla
  }

  redirect("/login?success=1");
}

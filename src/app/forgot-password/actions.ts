"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ForgotPasswordState = {
  error?: string;
  success?: boolean;
};

function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

export async function requestPasswordResetAction(
  _prev: ForgotPasswordState,
  formData: FormData
): Promise<ForgotPasswordState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!email) {
    return { error: "Escribe tu correo." };
  }

  const supabase = await createClient();
  const redirectTo = `${getSiteUrl()}/auth/callback?next=/update-password`;

  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

  if (error) {
    // ✅ Mensaje genérico — no exponemos el error interno de Supabase
    return { error: "No se pudo enviar el enlace. Intenta de nuevo en un momento." };
  }

  // ✅ Éxito — mensaje ambiguo por seguridad (no confirma si el email existe)
  return { success: true };
}
"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowLeft, Mail, Plane } from "lucide-react";
import { buttonPrimary, buttonSecondary } from "@/lib/styles";
import { requestPasswordResetAction, type ForgotPasswordState } from "./actions";

const initialState: ForgotPasswordState = {};

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState(requestPasswordResetAction, initialState);

  return (
    <main className="min-h-screen dashboard-bg flex items-center justify-center px-4 py-10">
      <section className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white/95 p-8 shadow-2xl shadow-slate-200/80 backdrop-blur">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-sky-200 bg-sky-100 text-sky-900">
            <Plane size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-950">
              Vuelos<span className="text-sky-500">Pro</span>
            </h1>
            <p className="text-sm font-semibold text-slate-500">Recuperación de acceso</p>
          </div>
        </div>

        <h2 className="mb-2 text-2xl font-black text-slate-950">Restablecer contraseña</h2>
        <p className="mb-6 text-sm font-semibold leading-6 text-slate-500">
          Escribe tu correo y te enviaremos un enlace seguro para crear una nueva contraseña.
        </p>

        {/* ✅ Error nunca aparece en URL */}
        {state.error ? (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {state.error}
          </div>
        ) : null}

        {/* ✅ Éxito reemplaza el form — no hay ?success= en la URL */}
        {state.success ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
              Si el correo existe, recibirás un enlace para cambiar la contraseña.
            </div>
            <Link href="/login" className={`${buttonSecondary} w-full`}>
              <ArrowLeft size={16} /> Volver a iniciar sesión
            </Link>
          </div>
        ) : (
          <form action={formAction} className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-700">Correo</span>
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 focus-within:border-sky-400 focus-within:ring-4 focus-within:ring-sky-100">
                <Mail size={18} className="text-slate-400" />
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="correo@ejemplo.com"
                  className="min-w-0 flex-1 bg-transparent py-3 text-sm font-semibold text-slate-900 outline-none"
                />
              </div>
            </label>

            <button
              className={`${buttonPrimary} w-full`}
              disabled={pending}
              aria-disabled={pending}
            >
              {pending ? "Enviando..." : "Enviar enlace"}
            </button>
          </form>
        )}

        {!state.success ? (
          <Link href="/login" className={`${buttonSecondary} mt-4 w-full`}>
            <ArrowLeft size={16} /> Volver a iniciar sesión
          </Link>
        ) : null}
      </section>
    </main>
  );
}
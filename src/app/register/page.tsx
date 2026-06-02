"use client";

import Link from "next/link";
import { useActionState } from "react";
import { LockKeyhole, Plane } from "lucide-react";
import { buttonPrimary, buttonSecondary } from "@/lib/styles";
import { registerAction, type RegisterState } from "./actions";

const initialState: RegisterState = {};

export default function RegisterPage() {
  const [state, formAction, pending] = useActionState(registerAction, initialState);

  return (
    <main className="min-h-screen dashboard-bg flex items-center justify-center px-4 py-10">
      <section className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white/90 p-8 shadow-2xl shadow-slate-200/80 backdrop-blur">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-sky-200 bg-sky-100 text-sky-900">
            <Plane size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-950">
              Vuelos<span className="text-sky-500">Pro</span>
            </h1>
            <p className="text-sm text-slate-500">Crea una cuenta de usuario</p>
          </div>
        </div>

        <h2 className="mb-2 text-2xl font-bold text-slate-950">Registro</h2>
        <p className="mb-6 text-sm text-slate-500">
          Las cuentas nuevas se crean como usuarios. El admin se asigna desde base de datos.
        </p>

        {/* ✅ Error en estado — nunca en URL */}
        {state.error ? (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {state.error}
          </div>
        ) : null}

        {/* Registro desactivado — la action lo detecta y retorna error */}
        <form action={formAction} className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Nombre completo</span>
            <input
              name="fullName"
              type="text"
              required
              placeholder="Nombre del usuario"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Correo</span>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="correo@ejemplo.com"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Contraseña</span>
            <input
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              placeholder="Mínimo 6 caracteres"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
            />
          </label>

          <button
            className={`${buttonPrimary} w-full`}
            disabled={pending}
            aria-disabled={pending}
          >
            {pending ? "Creando cuenta..." : "Crear cuenta"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="font-bold text-sky-700 hover:text-sky-900">
            Iniciar sesión
          </Link>
        </p>

        <p className="mt-3 text-center text-xs font-semibold text-slate-400">
          <Link href="/" className="hover:text-sky-700">Volver a la página principal</Link>
        </p>
      </section>
    </main>
  );
}
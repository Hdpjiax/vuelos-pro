"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Mail, Lock, Plane } from "lucide-react";
import { buttonPrimary, buttonSecondary } from "@/lib/styles";
import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = {};

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

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
            <p className="text-sm font-semibold text-slate-500">Acceso a tu panel</p>
          </div>
        </div>

        <h2 className="mb-6 text-2xl font-black text-slate-950">Iniciar sesión</h2>

        {state.error ? (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {state.error}
          </div>
        ) : null}

        <form action={formAction} className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-slate-700">Correo</span>
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 focus-within:border-sky-400 focus-within:ring-4 focus-within:ring-sky-100">
              <Mail size={18} className="text-slate-400" />
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="correo@ejemplo.com"
                className="min-w-0 flex-1 bg-transparent py-3 text-sm font-semibold text-slate-900 outline-none"
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-bold text-slate-700">Contraseña</span>
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 focus-within:border-sky-400 focus-within:ring-4 focus-within:ring-sky-100">
              <Lock size={18} className="text-slate-400" />
              <input
                name="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="min-w-0 flex-1 bg-transparent py-3 text-sm font-semibold text-slate-900 outline-none"
              />
            </div>
          </label>

          <button
            className={`${buttonPrimary} w-full`}
            disabled={pending}
            aria-disabled={pending}
          >
            {pending ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <div className="mt-4 flex flex-col gap-2">
          <Link href="/forgot-password" className={`${buttonSecondary} w-full`}>
            Olvidé mi contraseña
          </Link>
          <Link href="/register" className={`${buttonSecondary} w-full`}>
            Crear cuenta
          </Link>
        </div>
      </section>
    </main>
  );
}
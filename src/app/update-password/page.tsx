import { LockKeyhole, Plane } from "lucide-react";
import { buttonPrimary } from "@/lib/styles";
import { updatePasswordAction } from "./actions";

type PageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function UpdatePasswordPage({ searchParams }: PageProps) {
  const params = await searchParams;

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
            <p className="text-sm font-semibold text-slate-500">Nueva contraseña</p>
          </div>
        </div>

        <h2 className="mb-2 text-2xl font-black text-slate-950">Crear nueva contraseña</h2>
        <p className="mb-6 text-sm font-semibold leading-6 text-slate-500">
          Usa una contraseña segura. Después tendrás que iniciar sesión nuevamente.
        </p>

        {params.error ? (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {params.error}
          </div>
        ) : null}

        <form action={updatePasswordAction} className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-slate-700">Nueva contraseña</span>
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 focus-within:border-sky-400 focus-within:ring-4 focus-within:ring-sky-100">
              <LockKeyhole size={18} className="text-slate-400" />
              <input
                name="password"
                type="password"
                required
                minLength={6}
                placeholder="Mínimo 6 caracteres"
                className="min-w-0 flex-1 bg-transparent py-3 text-sm font-semibold text-slate-900 outline-none"
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-bold text-slate-700">Confirmar contraseña</span>
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 focus-within:border-sky-400 focus-within:ring-4 focus-within:ring-sky-100">
              <LockKeyhole size={18} className="text-slate-400" />
              <input
                name="confirmPassword"
                type="password"
                required
                minLength={6}
                placeholder="Repite la contraseña"
                className="min-w-0 flex-1 bg-transparent py-3 text-sm font-semibold text-slate-900 outline-none"
              />
            </div>
          </label>

          <button className={`${buttonPrimary} w-full`}>Guardar contraseña</button>
        </form>
      </section>
    </main>
  );
}

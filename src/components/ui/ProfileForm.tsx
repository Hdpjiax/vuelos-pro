import Link from "next/link";
import { Building2, Mail, Phone, UserCircle } from "lucide-react";
import { updateOwnProfileAction } from "@/app/profile/actions";
import { buttonPrimary, buttonSecondary, labelClass, panelClass } from "@/lib/styles";

type ProfileFormProps = {
  role: "admin" | "user";
  profile: {
    email: string;
    full_name: string;
    phone?: string | null;
    company_name?: string | null;
  };
  success?: string;
  error?: string;
};

export function ProfileForm({ role, profile, success, error }: ProfileFormProps) {
  const returnTo = role === "admin" ? "/admin/perfil" : "/user/perfil";

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white/95 p-6 shadow-xl shadow-slate-200/60 md:p-8">
        <p className="mb-3 text-sm font-black uppercase tracking-[0.35em] text-sky-700">
          {role === "admin" ? "Panel administrativo" : "Panel de usuario"}
        </p>
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-950 md:text-4xl">Mi perfil</h1>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
              Actualiza tus datos de contacto. El correo y el rol se controlan desde autenticación y administración.
            </p>
          </div>
          <Link href="/forgot-password" className={buttonSecondary}>
            Cambiar contraseña
          </Link>
        </div>
      </section>

      {success ? (
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-800">
          {success}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-bold text-rose-800">
          {error}
        </div>
      ) : null}

      <section className={`${panelClass} grid gap-6 lg:grid-cols-[1fr_0.8fr]`}>
        <form action={updateOwnProfileAction} className="space-y-5">
          <input type="hidden" name="returnTo" value={returnTo} />

          <label className="block">
            <span className={labelClass}>Nombre completo</span>
            <div className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 focus-within:border-sky-400 focus-within:ring-4 focus-within:ring-sky-100">
              <UserCircle size={18} className="text-slate-400" />
              <input name="fullName" required defaultValue={profile.full_name} className="min-w-0 flex-1 bg-transparent py-3 text-sm font-semibold text-slate-900 outline-none" />
            </div>
          </label>

          <label className="block">
            <span className={labelClass}>Telefono / WhatsApp</span>
            <div className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 focus-within:border-sky-400 focus-within:ring-4 focus-within:ring-sky-100">
              <Phone size={18} className="text-slate-400" />
              <input name="phone" defaultValue={profile.phone ?? ""} placeholder="Opcional" className="min-w-0 flex-1 bg-transparent py-3 text-sm font-semibold text-slate-900 outline-none" />
            </div>
          </label>

          <label className="block">
            <span className={labelClass}>Empresa / referencia</span>
            <div className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 focus-within:border-sky-400 focus-within:ring-4 focus-within:ring-sky-100">
              <Building2 size={18} className="text-slate-400" />
              <input name="companyName" defaultValue={profile.company_name ?? ""} placeholder="Opcional" className="min-w-0 flex-1 bg-transparent py-3 text-sm font-semibold text-slate-900 outline-none" />
            </div>
          </label>

          <button className={`${buttonPrimary} w-full sm:w-auto`}>Guardar perfil</button>
        </form>

        <aside className="rounded-[2rem] border border-slate-200 bg-slate-50 p-5">
          <h2 className="text-lg font-black text-slate-950">Datos de cuenta</h2>
          <div className="mt-4 space-y-3">
            <div className="rounded-3xl border border-slate-200 bg-white p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                <Mail size={16} /> Correo
              </div>
              <p className="break-all text-sm font-bold text-slate-900">{profile.email}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Rol actual</p>
              <p className="mt-2 text-sm font-black text-sky-900">{role === "admin" ? "Administrador" : "Usuario"}</p>
            </div>
            <p className="text-sm font-semibold leading-6 text-slate-500">
              Para cambiar el correo, contacta al administrador de autenticación en Supabase. Para cambiar tu contraseña, usa la recuperación por correo.
            </p>
          </div>
        </aside>
      </section>
    </div>
  );
}

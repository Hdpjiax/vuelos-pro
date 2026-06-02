import Link from "next/link";
import { ArrowRight, BellRing, CreditCard, LayoutDashboard, MessageSquare, Plane, ShieldCheck, Smartphone } from "lucide-react";
import { buttonPrimary, buttonSecondary } from "@/lib/styles";
import { createClient } from "@/lib/supabase/server";
export const revalidate = 300;
export default async function HomePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let dashboardHref = "/login";

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    dashboardHref = profile?.role === "admin" ? "/admin/dashboard" : "/user/dashboard";
  }

  const features = [
    {
      icon: <LayoutDashboard size={22} />,
      title: "Dashboards separados",
      text: "Panel administrativo y panel de usuario con flujos diferentes, claros y seguros.",
    },
    {
      icon: <CreditCard size={22} />,
      title: "Pagos y comprobantes",
      text: "Envio de cuenta bancaria, subida de comprobantes y validación del pago por vuelo.",
    },
    {
      icon: <MessageSquare size={22} />,
      title: "Mensajes agrupados",
      text: "Conversaciones por usuario y por vuelo para evitar listas extensas o confusas.",
    },
    {
      icon: <BellRing size={22} />,
      title: "Notificaciones por vuelo",
      text: "Avisos agrupados que se marcan como leídos al abrir cada grupo de información.",
    },
  ];

  return (
    <main className="min-h-screen dashboard-bg">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-sky-200 bg-sky-100 text-sky-900 shadow-sm shadow-sky-100">
            <Plane size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-950">
              Vuelos<span className="text-sky-500">Pro</span>
            </h1>
            <p className="hidden text-xs font-black uppercase tracking-[0.22em] text-slate-500 sm:block">Gestión de vuelos</p>
          </div>
        </Link>

        <nav className="flex items-center gap-2">
          <Link href="/login" className="rounded-2xl px-4 py-2 text-sm font-black text-slate-700 transition hover:bg-white hover:text-sky-900">
            Login
          </Link>
          <Link href={dashboardHref} className={buttonPrimary}>
            {user ? "Abrir panel" : "Entrar"}
          </Link>
        </nav>
      </header>

      <section className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-16">
        <div className="flex flex-col justify-center">
          <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-sky-200 bg-white/80 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-sky-800 shadow-sm shadow-sky-100">
            <ShieldCheck size={16} /> Plataforma en producción
          </div>
          <h2 className="text-4xl font-black leading-tight text-slate-950 sm:text-5xl lg:text-6xl">
            Administra vuelos, pagos, QR y mensajes desde un solo lugar.
          </h2>
          <p className="mt-6 max-w-2xl text-base font-semibold leading-8 text-slate-600 sm:text-lg">
            Sistema profesional para recibir vuelos de usuarios, revisar datos, enviar cuenta bancaria, validar pagos, adjuntar QR y mantener historial por usuario y por vuelo.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href={dashboardHref} className={buttonPrimary}>
              {user ? "Continuar a mi panel" : "Iniciar sesión"} <ArrowRight size={18} />
            </Link>
            <Link href="/register" className={buttonSecondary}>
              Crear cuenta de usuario
            </Link>
          </div>
        </div>

        <div className="rounded-[2.5rem] border border-slate-200 bg-white/90 p-4 shadow-2xl shadow-slate-200/70 backdrop-blur sm:p-6">
          <div className="rounded-[2rem] bg-sky-950 p-4 text-white sm:p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-sky-200">Panel administrativo</p>
                <h3 className="mt-2 text-2xl font-black">Resumen operativo</h3>
              </div>
              <div className="rounded-2xl bg-white/10 p-3"><LayoutDashboard size={24} /></div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-3xl bg-white/10 p-4">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-sky-200">Usuarios</p>
                <p className="mt-3 text-3xl font-black">24</p>
              </div>
              <div className="rounded-3xl bg-white/10 p-4">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-sky-200">Urgentes</p>
                <p className="mt-3 text-3xl font-black">6</p>
              </div>
              <div className="rounded-3xl bg-white/10 p-4">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-sky-200">Pagos</p>
                <p className="mt-3 text-3xl font-black">12</p>
              </div>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {features.map((feature) => (
              <article key={feature.title} className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-900">
                  {feature.icon}
                </div>
                <h3 className="text-base font-black text-slate-950">{feature.title}</h3>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">{feature.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
        <div className="grid gap-4 rounded-[2rem] border border-slate-200 bg-white/85 p-5 shadow-xl shadow-slate-200/50 sm:grid-cols-3 sm:p-6">
          <div className="flex items-start gap-3">
            <Smartphone className="mt-1 text-sky-700" size={22} />
            <div>
              <h3 className="font-black text-slate-950">Responsive móvil</h3>
              <p className="mt-1 text-sm font-semibold text-slate-500">Navegación superior compacta para teléfonos y tablets.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-1 text-sky-700" size={22} />
            <div>
              <h3 className="font-black text-slate-950">Roles protegidos</h3>
              <p className="mt-1 text-sm font-semibold text-slate-500">Acceso separado para usuario y administrador.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Plane className="mt-1 text-sky-700" size={22} />
            <div>
              <h3 className="font-black text-slate-950">Listo para operación</h3>
              <p className="mt-1 text-sm font-semibold text-slate-500">Flujo completo desde cotización hasta envío de QR.</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

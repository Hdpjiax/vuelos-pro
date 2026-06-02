import { Plane } from "lucide-react";

export function AppLoading({ title = "Cargando VuelosPro" }: { title?: string }) {
  return (
    <main className="vuelos-loader">
      <section className="vuelos-loader-card">
        {/* Logo + spinner */}
        <div className="flex items-center gap-4">
          <div className="relative flex-shrink-0">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-700 to-cyan-400 text-white shadow-lg shadow-sky-200">
              <Plane size={22} />
            </div>
            {/* Ring spinner alrededor del ícono */}
            <span className="absolute -inset-1 rounded-[1.1rem] border-2 border-sky-200 border-t-sky-500 animate-spin" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-600">VuelosPro</p>
            <h1 className="mt-0.5 text-lg font-black text-slate-950 leading-tight">{title}</h1>
          </div>
        </div>

        {/* Barras skeleton */}
        <div className="mt-7 space-y-3" aria-hidden="true">
          <div className="vuelos-loader-line skeleton-shine w-full" />
          <div className="vuelos-loader-line skeleton-shine w-9/12" />
          <div className="vuelos-loader-line skeleton-shine w-6/12" />
        </div>

        {/* Cards skeleton */}
        <div className="mt-5 grid grid-cols-3 gap-3" aria-hidden="true">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 rounded-2xl bg-slate-100/80 skeleton-shine relative overflow-hidden"
              style={{ animationDelay: `${i * 0.12}s` }}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
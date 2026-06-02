export function AppLoading({ title = "Cargando VuelosPro" }: { title?: string }) {
  return (
    <main className="vuelos-loader">
      <section className="vuelos-loader-card">
        <div className="vuelos-loader-logo">
          <div className="vuelos-loader-mark" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-sky-700">VuelosPro</p>
            <h1 className="mt-1 text-xl font-black text-slate-950">{title}</h1>
            <p className="mt-1 text-xs font-bold text-slate-500">Optimizando la información solicitada...</p>
          </div>
          <div className="vuelos-loader-spinner" aria-hidden="true" />
        </div>

        <div className="mt-6 space-y-3" aria-hidden="true">
          <div className="vuelos-loader-line skeleton-shine w-full" />
          <div className="vuelos-loader-line skeleton-shine w-10/12" />
          <div className="vuelos-loader-line skeleton-shine w-7/12" />
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3" aria-hidden="true">
          <div className="h-20 rounded-3xl bg-slate-100 skeleton-shine relative overflow-hidden" />
          <div className="h-20 rounded-3xl bg-slate-100 skeleton-shine relative overflow-hidden" />
          <div className="h-20 rounded-3xl bg-slate-100 skeleton-shine relative overflow-hidden" />
        </div>
      </section>
    </main>
  );
}

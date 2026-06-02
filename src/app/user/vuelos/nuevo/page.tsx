import { NewFlightForm } from "./NewFlightForm";

export default function NewFlightPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/40 bg-white/90 p-6 shadow-xl shadow-slate-900/5 backdrop-blur">
        <p className="text-sm font-black uppercase tracking-[0.24em] text-sky-700">Panel de usuario</p>
        <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Subir nuevo vuelo</h2>
        <p className="mt-2 max-w-3xl text-slate-500">
          Registra la fecha, horario, pasajeros, tarifa, total, extras y la imagen del vuelo. Al enviarlo, administración lo verá automáticamente.
        </p>
      </section>

      <NewFlightForm />
    </div>
  );
}

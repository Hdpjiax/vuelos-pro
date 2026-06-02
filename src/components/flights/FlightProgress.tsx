import { CheckCircle2, Circle, XCircle } from "lucide-react";
import { flightStageDescriptions, flightStageLabels, flightStageOrder, getFlightStageIndex } from "@/lib/flight-operations";
import { cn } from "@/lib/utils";
import type { FlightStatus } from "@/lib/types";

export function FlightProgress({ status }: { status: FlightStatus }) {
  const currentIndex = getFlightStageIndex(status);
  const cancelled = status === "cancelado";

  if (cancelled) {
    return (
      <section className="rounded-[2rem] border border-rose-200 bg-rose-50 p-5 text-rose-900 shadow-xl shadow-rose-100/60">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-white p-2 text-rose-700 ring-1 ring-rose-200"><XCircle size={20} /></div>
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-rose-700">Seguimiento operativo</p>
            <h3 className="mt-1 text-xl font-black">Vuelo cancelado</h3>
            <p className="mt-1 text-sm font-semibold leading-6 text-rose-800">{flightStageDescriptions.cancelado}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-5 shadow-xl shadow-slate-200/60 backdrop-blur">
      <div className="mb-5">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-sky-700">Seguimiento operativo</p>
        <h3 className="mt-1 text-xl font-black text-slate-950">Recibido → cuenta enviada → pago → QR → completado</h3>
        <p className="mt-1 text-sm text-slate-500">La línea muestra exactamente en qué etapa se encuentra este vuelo.</p>
      </div>

      <div className="grid gap-3 lg:grid-cols-7">
        {flightStageOrder.map((stage, index) => {
          const done = index < currentIndex;
          const active = index === currentIndex;
          const upcoming = index > currentIndex;

          return (
            <div
              key={stage}
              className={cn(
                "relative rounded-3xl border p-4 transition",
                done && "border-emerald-200 bg-emerald-50 text-emerald-900",
                active && "border-sky-300 bg-sky-50 text-sky-950 shadow-lg shadow-sky-100/70",
                upcoming && "border-slate-200 bg-slate-50 text-slate-500"
              )}
            >
              <div className="flex items-center gap-2">
                <span className={cn(
                  "inline-flex h-8 w-8 items-center justify-center rounded-2xl ring-1",
                  done && "bg-emerald-600 text-white ring-emerald-500",
                  active && "bg-sky-700 text-white ring-sky-600",
                  upcoming && "bg-white text-slate-400 ring-slate-200"
                )}>
                  {done ? <CheckCircle2 size={17} /> : <Circle size={16} />}
                </span>
                <span className="text-[10px] font-black uppercase tracking-[0.14em]">Etapa {index + 1}</span>
              </div>
              <p className="mt-3 text-sm font-black">{flightStageLabels[stage]}</p>
              <p className="mt-1 text-xs font-semibold leading-5 opacity-80">{flightStageDescriptions[stage]}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

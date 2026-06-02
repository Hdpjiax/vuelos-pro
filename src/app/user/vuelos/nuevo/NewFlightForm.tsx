"use client";

import { useActionState, useMemo, useState } from "react";
import { Plus, Trash2, UploadCloud } from "lucide-react";
import { buttonPrimary, buttonSecondarySmall, inputClass, labelClass } from "@/lib/styles";
import { createFlightAction, type FlightFormState } from "./actions";

const initialState: FlightFormState = {};

type PassengerDraft = {
  id: string;
};

export function NewFlightForm() {
  const [state, formAction, pending] = useActionState(createFlightAction, initialState);
  const [flightType, setFlightType] = useState("sencillo");
  const [passengers, setPassengers] = useState<PassengerDraft[]>([{ id: crypto.randomUUID() }]);
  const [checkedBags, setCheckedBags] = useState("0");
  const [carryOnBags, setCarryOnBags] = useState("0");
  const [seats, setSeats] = useState("0");

  const extrasSummary = useMemo(() => {
    const checked = Number(checkedBags || 0);
    const carry = Number(carryOnBags || 0);
    const seatCount = Number(seats || 0);
    const parts = [];

    if (checked > 0) parts.push(`${checked} maleta(s) documentada(s)`);
    if (carry > 0) parts.push(`${carry} equipaje(s) de mano`);
    if (seatCount > 0) parts.push(`${seatCount} asiento(s)`);

    return parts.length ? parts.join(" · ") : "Sin extras seleccionados";
  }, [checkedBags, carryOnBags, seats]);

  function addPassenger() {
    setPassengers((current) => [...current, { id: crypto.randomUUID() }]);
  }

  function removePassenger(id: string) {
    setPassengers((current) => (current.length === 1 ? current : current.filter((item) => item.id !== id)));
  }

  return (
    <form action={formAction} className="space-y-6">
      {state.error ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-bold text-rose-700">
          {state.error}
        </div>
      ) : null}

      <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/60 backdrop-blur">
        <div className="mb-6 flex flex-col gap-2">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-sky-700">Datos del vuelo</p>
          <h3 className="text-2xl font-black tracking-tight text-slate-950">Información principal</h3>
          <p className="text-sm text-slate-500">
            Esta información se enviará automáticamente al panel administrativo para revisión.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-2">
            <span className={labelClass}>Tipo de viaje</span>
            <select className={inputClass} name="flight_type" value={flightType} onChange={(event) => setFlightType(event.target.value)} required>
              <option value="sencillo">Sencillo</option>
              <option value="redondo">Redondo</option>
            </select>
          </label>

          <label className="space-y-2">
            <span className={labelClass}>Fecha de ida</span>
            <input className={inputClass} type="date" name="flight_date" required />
          </label>

          <label className="space-y-2">
            <span className={labelClass}>Horario de ida</span>
            <input className={inputClass} type="time" name="flight_time" required />
          </label>

          <label className="space-y-2">
            <span className={labelClass}>Tipo de tarifa</span>
            <select className={inputClass} name="fare_type" required defaultValue="">
              <option value="" disabled>Selecciona una tarifa</option>
              <option value="Basica">Básica</option>
              <option value="Clasica">Clásica</option>
              <option value="Flexible">Flexible</option>
              <option value="Premium">Premium</option>
              <option value="Otro">Otro</option>
            </select>
          </label>

          {flightType === "redondo" ? (
            <>
              <label className="space-y-2">
                <span className={labelClass}>Fecha de regreso</span>
                <input className={inputClass} type="date" name="return_flight_date" required />
              </label>

              <label className="space-y-2">
                <span className={labelClass}>Horario de regreso</span>
                <input className={inputClass} type="time" name="return_flight_time" required />
              </label>
            </>
          ) : (
            <>
              <input type="hidden" name="return_flight_date" value="" />
              <input type="hidden" name="return_flight_time" value="" />
            </>
          )}

          <label className="space-y-2">
            <span className={labelClass}>Total del vuelo</span>
            <input className={inputClass} type="number" min="1" step="0.01" name="total_amount" placeholder="1800.00" required />
          </label>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/60 backdrop-blur">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.24em] text-sky-700">Pasajeros</p>
            <h3 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Datos de pasajeros</h3>
            <p className="mt-1 text-sm text-slate-500">Incluye nombre, documento, fecha de nacimiento y nacionalidad.</p>
          </div>
          <button type="button" onClick={addPassenger} className={buttonPrimary}>
            <Plus size={16} /> Agregar pasajero
          </button>
        </div>

        <div className="space-y-4">
          {passengers.map((passenger, index) => (
            <div key={passenger.id} className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <p className="font-black text-slate-900">Pasajero {index + 1}</p>
                <button
                  type="button"
                  onClick={() => removePassenger(passenger.id)}
                  disabled={passengers.length === 1}
                  className={`${buttonSecondarySmall} hover:border-rose-200 hover:text-rose-600`}
                >
                  <Trash2 size={14} /> Quitar
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <label className="space-y-2 xl:col-span-2">
                  <span className={labelClass}>Nombre completo</span>
                  <input className={inputClass} name="passenger_full_name" placeholder="Nombre del pasajero" required={index === 0} />
                </label>

                <label className="space-y-2">
                  <span className={labelClass}>Documento / ID</span>
                  <input className={inputClass} name="passenger_document" placeholder="INE, pasaporte, etc." />
                </label>

                <label className="space-y-2">
                  <span className={labelClass}>Nacimiento</span>
                  <input className={inputClass} type="date" name="passenger_birth_date" />
                </label>

                <label className="space-y-2">
                  <span className={labelClass}>Nacionalidad</span>
                  <input className={inputClass} name="passenger_nationality" placeholder="Mexicana" />
                </label>

                <label className="space-y-2 md:col-span-2 xl:col-span-1">
                  <span className={labelClass}>Teléfono</span>
                  <input className={inputClass} name="passenger_phone" placeholder="Contacto" />
                </label>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/60 backdrop-blur">
        <div className="mb-6">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-sky-700">Extras</p>
          <h3 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Maletas, asientos y notas</h3>
          <p className="mt-2 rounded-2xl bg-sky-50 px-4 py-3 text-sm font-bold text-sky-900">{extrasSummary}</p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <label className="space-y-2">
            <span className={labelClass}>Maletas documentadas</span>
            <input className={inputClass} type="number" min="0" name="checked_bags" value={checkedBags} onChange={(event) => setCheckedBags(event.target.value)} />
          </label>

          <label className="space-y-2">
            <span className={labelClass}>Equipaje de mano</span>
            <input className={inputClass} type="number" min="0" name="carry_on_bags" value={carryOnBags} onChange={(event) => setCarryOnBags(event.target.value)} />
          </label>

          <label className="space-y-2">
            <span className={labelClass}>Asientos</span>
            <input className={inputClass} type="number" min="0" name="seats" value={seats} onChange={(event) => setSeats(event.target.value)} />
          </label>
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <label className="space-y-2">
            <span className={labelClass}>Otros extras</span>
            <input className={inputClass} name="other_extras" placeholder="Mascota, prioridad, cambios, etc." />
          </label>

          <label className="space-y-2">
            <span className={labelClass}>Notas para administración</span>
            <textarea className={`${inputClass} min-h-28 resize-y`} name="notes" placeholder="Detalles adicionales del vuelo" />
          </label>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/60 backdrop-blur">
        <div className="mb-5">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-sky-700">Comprobante visual</p>
          <h3 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Foto o captura del vuelo</h3>
          <p className="mt-1 text-sm text-slate-500">Acepta imágenes. Peso máximo: 5 MB.</p>
        </div>

        <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-sky-300 bg-sky-50/70 px-6 py-10 text-center transition hover:bg-sky-50">
          <UploadCloud className="text-sky-700" size={34} />
          <span className="text-sm font-black text-slate-900">Seleccionar imagen del vuelo</span>
          <span className="text-xs font-semibold text-slate-500">PNG, JPG, WEBP o similar</span>
          <input className="sr-only" type="file" name="flight_image" accept="image/*" required />
        </label>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <button type="submit" disabled={pending} className={buttonPrimary}>
          {pending ? "Enviando vuelo..." : "Enviar vuelo a revisión"}
        </button>
      </div>
    </form>
  );
}

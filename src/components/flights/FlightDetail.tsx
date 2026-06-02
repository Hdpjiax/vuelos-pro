import { StatusBadge } from "@/components/ui/StatusBadge";
import { financialStatusLabel, flightTypeLabel, formatCurrency, formatDate, formatFlightFolio, formatTime, getAmountToPay, getCommissionAmount, getDiscountAmount, getFlightProfit, getProviderCostAmount, statusHelper, statusLabel } from "@/lib/utils";

type Passenger = {
  full_name?: string;
  document?: string;
  phone?: string;
  birth_date?: string;
  nationality?: string;
};

type FlightDetailProps = {
  flight: any;
  imageUrl?: string | null;
  showUser?: boolean;
  actions?: React.ReactNode;
};

function normalizePassengers(value: unknown): Passenger[] {
  return Array.isArray(value) ? (value as Passenger[]) : [];
}

function normalizeExtras(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {} as Record<string, unknown>;
  }

  return value as Record<string, unknown>;
}

export function FlightDetail({ flight, imageUrl, showUser = false, actions }: FlightDetailProps) {
  const passengers = normalizePassengers(flight.passengers);
  const extras = normalizeExtras(flight.extras);
  const paymentPercentage = Number(flight.payment_percentage ?? 100);
  const amountToPay = getAmountToPay(flight);
  const originalTotal = Number(flight.total_amount ?? 0);
  const discountAmount = getDiscountAmount(flight);
  const providerCost = getProviderCostAmount(flight);
  const commissionAmount = getCommissionAmount(flight);
  const profitAmount = getFlightProfit(flight);

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/60 backdrop-blur">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <StatusBadge status={flight.status} />
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-slate-600">
                {formatFlightFolio(flight)}
              </span>
              <span className="rounded-full bg-slate-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                ID {String(flight.id).slice(0, 8)}
              </span>
              <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-sky-700">
                {flightTypeLabel(flight.flight_type)}
              </span>
            </div>
            <h2 className="text-3xl font-black tracking-tight text-slate-950">Detalle del vuelo</h2>
            <p className="mt-2 text-slate-500">
              Ida: {formatDate(flight.flight_date)} · {formatTime(flight.flight_time)} · {statusLabel(flight.status)}
            </p>
            <p className="mt-2 max-w-2xl rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm font-bold text-sky-900">
              {statusHelper(flight.status)}
            </p>
            {flight.flight_type === "redondo" ? (
              <p className="mt-1 text-sm font-bold text-slate-600">
                Regreso: {formatDate(flight.return_flight_date)} · {formatTime(flight.return_flight_time)}
              </p>
            ) : null}
            {showUser ? (
              <p className="mt-2 text-sm font-bold text-slate-700">
                Usuario: {flight.profiles?.full_name || flight.profiles?.email || "Usuario"}
              </p>
            ) : null}
          </div>

          <div className="rounded-3xl border border-sky-200 bg-sky-50 px-6 py-5 text-sky-950 shadow-xl shadow-sky-100/70">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-700">Total a pagar</p>
            <p className="mt-1 text-3xl font-black">{formatCurrency(amountToPay)}</p>
            <p className="mt-2 text-xs font-bold text-sky-800">
              Total vuelo: {formatCurrency(originalTotal)} · {Number.isFinite(paymentPercentage) ? paymentPercentage : 100}% a pagar
            </p>
            {discountAmount > 0 ? (
              <p className="mt-1 text-xs font-black text-emerald-700">Descuento aplicado: {formatCurrency(discountAmount)}</p>
            ) : null}
          </div>
        </div>
      </section>

      {actions ? <section>{actions}</section> : null}

      {flight.status === "cancelado" && flight.user_cancel_reason ? (
        <section className="rounded-[2rem] border border-rose-200 bg-rose-50 p-6 text-rose-800 shadow-xl shadow-rose-100/60">
          <h3 className="text-xl font-black">Motivo de cancelación</h3>
          <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6">{String(flight.user_cancel_reason)}</p>
          {flight.cancelled_at ? (
            <p className="mt-3 text-xs font-black uppercase tracking-[0.16em] text-rose-600">Cancelado el {new Date(flight.cancelled_at).toLocaleString("es-MX")}</p>
          ) : null}
        </section>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/60 backdrop-blur">
          <h3 className="text-xl font-black text-slate-950">Información principal</h3>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <InfoItem label="Folio interno" value={formatFlightFolio(flight)} />
            <InfoItem label="Tipo de viaje" value={flightTypeLabel(flight.flight_type)} />
            <InfoItem label="Fecha ida" value={formatDate(flight.flight_date)} />
            <InfoItem label="Hora ida" value={formatTime(flight.flight_time)} />
            {flight.flight_type === "redondo" ? (
              <>
                <InfoItem label="Fecha regreso" value={formatDate(flight.return_flight_date)} />
                <InfoItem label="Hora regreso" value={formatTime(flight.return_flight_time)} />
              </>
            ) : null}
            <InfoItem label="Tipo de tarifa" value={flight.fare_type} />
            <InfoItem label="Total del vuelo" value={formatCurrency(flight.total_amount)} />
            <InfoItem label="Porcentaje a pagar" value={`${Number.isFinite(paymentPercentage) ? paymentPercentage : 100}%`} />
            <InfoItem label="Total a pagar" value={formatCurrency(amountToPay)} />
            <InfoItem label="Descuento" value={formatCurrency(discountAmount)} />
            <InfoItem label="Costo proveedor" value={formatCurrency(providerCost)} />
            <InfoItem label="Comisión / gastos" value={formatCurrency(commissionAmount)} />
            <InfoItem label="Ganancia" value={formatCurrency(profitAmount)} />
            <InfoItem label="Estado financiero" value={financialStatusLabel(flight.financial_status)} />
          </div>
          {flight.financial_notes ? (
            <div className="mt-4 rounded-3xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold leading-6 text-emerald-900">
              <span className="font-black">Notas financieras:</span> {String(flight.financial_notes)}
            </div>
          ) : null}
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/60 backdrop-blur">
          <h3 className="text-xl font-black text-slate-950">Extras</h3>
          <div className="mt-5 space-y-3 text-sm">
            <InfoLine label="Maletas documentadas" value={String(extras.checked_bags ?? 0)} />
            <InfoLine label="Equipaje de mano" value={String(extras.carry_on_bags ?? 0)} />
            <InfoLine label="Asientos" value={String(extras.seats ?? 0)} />
            <InfoLine label="Otros" value={String(extras.other || "Sin extras adicionales")} />
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/60 backdrop-blur">
          <h3 className="text-xl font-black text-slate-950">Pasajeros</h3>
          <div className="mt-5 space-y-3">
            {passengers.map((passenger, index) => (
              <div key={`${passenger.full_name}-${index}`} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="font-black text-slate-900">{passenger.full_name || `Pasajero ${index + 1}`}</p>
                <div className="mt-2 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                  <span>Documento: <strong>{passenger.document || "No capturado"}</strong></span>
                  <span>Teléfono: <strong>{passenger.phone || "No capturado"}</strong></span>
                  <span>Nacimiento: <strong>{passenger.birth_date ? formatDate(passenger.birth_date) : "No capturado"}</strong></span>
                  <span>Nacionalidad: <strong>{passenger.nationality || "No capturada"}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/60 backdrop-blur">
          <h3 className="text-xl font-black text-slate-950">Imagen del vuelo</h3>
          {imageUrl ? (
            <a href={imageUrl} target="_blank" rel="noreferrer" className="mt-5 block overflow-hidden rounded-3xl border border-slate-200 bg-slate-100">
              <img src={imageUrl} alt="Imagen del vuelo" className="max-h-[420px] w-full object-contain" />
            </a>
          ) : (
            <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm font-bold text-slate-500">
              No hay imagen disponible.
            </div>
          )}
        </div>
      </section>

      {extras.notes ? (
        <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/60 backdrop-blur">
          <h3 className="text-xl font-black text-slate-950">Notas</h3>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{String(extras.notes)}</p>
        </section>
      ) : null}
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-black text-slate-950">{value}</p>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3">
      <span className="font-bold text-slate-500">{label}</span>
      <span className="text-right font-black text-slate-900">{value}</span>
    </div>
  );
}

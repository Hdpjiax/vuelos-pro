import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { createClient } from "@/lib/supabase/server";
import { buttonPrimary, buttonPrimarySmall, inputClass, labelClass } from "@/lib/styles";
import { formatCurrency, formatFlightFolio, formatDate, formatTime, getAmountToPay } from "@/lib/utils";
import { saveBankAccountAction } from "./actions";

type PageProps = {
  searchParams: Promise<{ saved?: string }>;
};

export default async function AdminPaymentsPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const supabase = await createClient();

  const [{ data: rawFlights }, { data: bankAccounts }] = await Promise.all([
    supabase
      .from("flights")
      .select("id, flight_folio, user_id, flight_type, flight_date, flight_time, return_flight_date, return_flight_time, fare_type, total_amount, payment_percentage, amount_to_pay, status")
      .in("status", ["esperando_pago", "pago_subido", "pago_confirmado", "pendiente_qr"])
      .order("created_at", { ascending: false }),
    supabase
      .from("bank_accounts")
      .select("id, bank_name, account_holder, clabe, active")
      .eq("active", true)
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  const userIds = Array.from(new Set((rawFlights ?? []).map((flight: any) => flight.user_id).filter(Boolean)));
  const { data: profiles } = userIds.length
    ? await supabase.from("profiles").select("id, full_name, email").in("id", userIds)
    : { data: [] };
  const profileMap = new Map((profiles ?? []).map((profile: any) => [profile.id, profile]));
  const flights = (rawFlights ?? []).map((flight: any) => ({
    ...flight,
    profiles: profileMap.get(flight.user_id) ?? null,
  }));

  const activeBankAccount = bankAccounts?.[0];

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/60 backdrop-blur">
        <p className="text-sm font-black uppercase tracking-[0.24em] text-sky-700">Panel administrativo</p>
        <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Validar pagos</h2>
        <p className="mt-2 text-slate-500">Configura la cuenta bancaria, revisa comprobantes y confirma pagos.</p>
      </section>

      {query.saved === "1" ? (
        <div className="rounded-[2rem] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-black text-emerald-800">
          Cuenta bancaria guardada correctamente.
        </div>
      ) : null}

      <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/60 backdrop-blur">
        <div className="mb-5">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-sky-700">Cuenta bancaria</p>
          <h3 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Datos para depósitos</h3>
          <p className="mt-2 text-sm text-slate-500">
            Esta cuenta será la que puedas enviar al usuario desde el detalle de cada vuelo.
          </p>
        </div>

        <form action={saveBankAccountAction} className="grid gap-4 xl:grid-cols-[1fr_1fr_1fr_auto] xl:items-end">
          <input type="hidden" name="bank_account_id" value={activeBankAccount?.id ?? ""} />

          <label className="space-y-2">
            <span className={labelClass}>Banco</span>
            <input className={inputClass} name="bank_name" defaultValue={activeBankAccount?.bank_name ?? ""} placeholder="BBVA, Santander, Banorte..." required />
          </label>

          <label className="space-y-2">
            <span className={labelClass}>Titular</span>
            <input className={inputClass} name="account_holder" defaultValue={activeBankAccount?.account_holder ?? ""} placeholder="Nombre del titular" required />
          </label>

          <label className="space-y-2">
            <span className={labelClass}>CLABE</span>
            <input className={inputClass} name="clabe" defaultValue={activeBankAccount?.clabe ?? ""} placeholder="18 dígitos" required />
          </label>

          <button className={buttonPrimary}>{activeBankAccount ? "Actualizar cuenta" : "Guardar cuenta"}</button>
        </form>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/60 backdrop-blur">
        <div className="mb-5">
          <h3 className="text-xl font-black text-slate-950">Pagos y comprobantes</h3>
          <p className="text-sm text-slate-500">Abre un vuelo para revisar comprobantes, confirmar pago o enviar QR.</p>
        </div>

        {!flights?.length ? (
          <EmptyState title="No hay pagos por validar." />
        ) : (
          <div className="overflow-x-auto rounded-3xl border border-slate-200">
            <table className="w-full min-w-[860px] border-collapse bg-white text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.16em] text-slate-500">
                <tr>
                  <th className="px-5 py-4">Folio</th>
                  <th className="px-5 py-4">Usuario</th>
                  <th className="px-5 py-4">Ida / regreso</th>
                  <th className="px-5 py-4">Tarifa</th>
                  <th className="px-5 py-4">Total / a pagar</th>
                  <th className="px-5 py-4">Estado</th>
                  <th className="px-5 py-4">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {flights.map((flight: any) => (
                  <tr key={flight.id} className="hover:bg-slate-50/70">
                    <td data-label="Folio" className="px-5 py-4 font-black text-slate-900">{formatFlightFolio(flight)}</td>
                    <td data-label="Usuario" className="px-5 py-4 font-bold text-slate-800">{flight.profiles?.full_name || flight.profiles?.email || "Usuario"}</td>
                    <td data-label="Ida / regreso" className="px-5 py-4 text-slate-600">
                      <p>Ida: {formatDate(flight.flight_date)} · {formatTime(flight.flight_time)}</p>
                      {flight.flight_type === "redondo" ? (
                        <p className="mt-1 text-xs font-semibold text-slate-500">Regreso: {formatDate(flight.return_flight_date)} · {formatTime(flight.return_flight_time)}</p>
                      ) : null}
                    </td>
                    <td data-label="Tarifa" className="px-5 py-4 text-slate-600">{flight.fare_type}</td>
                    <td data-label="Total / a pagar" className="px-5 py-4">
                      <p className="font-bold text-slate-900">{formatCurrency(flight.total_amount)}</p>
                      <p className="text-xs font-black text-sky-700">A pagar: {formatCurrency(getAmountToPay(flight))}</p>
                    </td>
                    <td data-label="Estado" className="px-5 py-4"><StatusBadge status={flight.status} /></td>
                    <td data-label="Acción" className="px-5 py-4">
                      <Link href={`/admin/vuelos/${flight.id}`} className={buttonPrimarySmall}>
                        Abrir
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CreditCard, History, Plane, ShieldCheck, Users } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { CustomSelectField } from "@/components/ui/CustomSelectField";
import { createClient } from "@/lib/supabase/server";
import { buttonPrimary, buttonSecondary, buttonSecondarySmall } from "@/lib/styles";
import { actionLabel, flightTypeLabel, formatCurrency, formatDate, formatDateTime, formatTime, getAmountToPay } from "@/lib/utils";
import { updateUserRoleAction } from "./actions";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

const confirmedStatuses = ["pago_confirmado", "pendiente_qr", "qr_enviado", "completado"];

export default async function AdminUserDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createClient();

  const [{ data: profile }, { data: flights, error: flightsError }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email, role, created_at").eq("id", id).single(),
    supabase
      .from("flights")
      .select("id, flight_folio, flight_type, flight_date, flight_time, return_flight_date, return_flight_time, fare_type, total_amount, payment_percentage, amount_to_pay, status, created_at")
      .eq("user_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (!profile) notFound();

  const safeFlights = flights ?? [];
  const flightIds = safeFlights.map((flight: any) => flight.id).filter(Boolean);

  const [{ data: directLogs }, { data: flightLogs }, { data: messages }] = await Promise.all([
    supabase
      .from("audit_logs")
      .select("id, action, entity_type, entity_id, metadata, created_at")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(30),
    flightIds.length
      ? supabase
          .from("audit_logs")
          .select("id, action, entity_type, entity_id, metadata, created_at")
          .eq("entity_type", "flight")
          .in("entity_id", flightIds)
          .order("created_at", { ascending: false })
          .limit(50)
      : Promise.resolve({ data: [] }),
    flightIds.length
      ? supabase
          .from("flight_messages")
          .select("id, flight_id, message, message_type, created_at")
          .in("flight_id", flightIds)
          .order("created_at", { ascending: false })
          .limit(12)
      : Promise.resolve({ data: [] }),
  ]);

  const logMap = new Map<string, any>();
  for (const log of [...(directLogs ?? []), ...(flightLogs ?? [])]) logMap.set(log.id, log);
  const logs = Array.from(logMap.values()).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 40);

  const totalConfirmed = safeFlights.reduce((sum: number, flight: any) => {
    return confirmedStatuses.includes(flight.status) ? sum + getAmountToPay(flight) : sum;
  }, 0);
  const activeFlights = safeFlights.filter((flight: any) => !["completado", "cancelado"].includes(flight.status)).length;
  const completedFlights = safeFlights.filter((flight: any) => ["qr_enviado", "completado"].includes(flight.status)).length;

  return (
    <div className="space-y-6">
      <div className="flex justify-start">
        <Link href="/admin/usuarios" className={buttonSecondary}>
          Volver a usuarios
        </Link>
      </div>

      <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/60 backdrop-blur">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.24em] text-sky-700">Perfil de usuario</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">{profile.full_name || "Sin nombre"}</h2>
            <p className="mt-2 text-slate-500">{profile.email}</p>
            <p className="mt-1 text-sm font-semibold text-slate-400">Registro: {formatDate(String(profile.created_at).slice(0, 10))}</p>
            {query.error || flightsError ? (
              <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
                {query.error || flightsError?.message}
              </p>
            ) : null}
          </div>

          <form action={updateUserRoleAction} className="w-full max-w-sm rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-2xl bg-sky-100 p-2 text-sky-800"><ShieldCheck size={18} /></div>
              <div>
                <h3 className="font-black text-slate-950">Rol de cuenta</h3>
                <p className="text-xs font-semibold text-slate-500">Cambia permisos de navegación.</p>
              </div>
            </div>
            <input type="hidden" name="user_id" value={profile.id} />
            <CustomSelectField
              name="role"
              label="Rol"
              defaultValue={profile.role}
              options={[
                { value: "user", label: "Usuario" },
                { value: "admin", label: "Administrador" },
              ]}
            />
            <button className={`${buttonPrimary} mt-4 w-full`}>Guardar rol</button>
          </form>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatMini icon={<Plane size={20} />} title="Vuelos totales" value={safeFlights.length} helper="Solicitudes creadas" />
        <StatMini icon={<History size={20} />} title="Activos" value={activeFlights} helper="En proceso" />
        <StatMini icon={<CreditCard size={20} />} title="Confirmado" value={formatCurrency(totalConfirmed)} helper="Pagos validados" />
        <StatMini icon={<Users size={20} />} title="Cerrados" value={completedFlights} helper="QR enviados o completados" />
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/60 backdrop-blur">
        <h3 className="text-xl font-black text-slate-950">Vuelos del usuario</h3>
        <p className="mt-1 text-sm text-slate-500">Historial completo de solicitudes asociadas a esta cuenta.</p>

        {!safeFlights.length ? (
          <div className="mt-5"><EmptyState title="Este usuario todavía no tiene vuelos." /></div>
        ) : (
          <div className="mt-5 overflow-x-auto rounded-3xl border border-slate-200">
            <table className="w-full min-w-[860px] border-collapse bg-white text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.16em] text-slate-500">
                <tr>
                  <th className="px-5 py-4">Folio</th>
                  <th className="px-5 py-4">Viaje</th>
                  <th className="px-5 py-4">Ida / regreso</th>
                  <th className="px-5 py-4">Tarifa</th>
                  <th className="px-5 py-4">Total / a pagar</th>
                  <th className="px-5 py-4">Estado</th>
                  <th className="px-5 py-4">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {safeFlights.map((flight: any) => (
                  <tr key={flight.id} className="hover:bg-slate-50/70">
                    <td data-label="Folio" className="px-5 py-4 font-black text-slate-900">{flight.flight_folio || `VP-${flight.id.slice(0, 8).toUpperCase()}`}</td>
                    <td data-label="Viaje" className="px-5 py-4 font-bold text-slate-700">{flightTypeLabel(flight.flight_type)}</td>
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
                      <Link href={`/admin/vuelos/${flight.id}`} className={buttonSecondarySmall}>Abrir</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/60 backdrop-blur">
          <h3 className="text-xl font-black text-slate-950">Actividad reciente</h3>
          <p className="mt-1 text-sm text-slate-500">Incluye eventos directos del usuario y eventos de sus vuelos.</p>
          <div className="mt-5 space-y-3">
            {!logs.length ? <EmptyState title="No hay actividad registrada." /> : logs.map((log: any) => (
              <article key={log.id} className="rounded-3xl border border-slate-200 bg-white p-4">
                <p className="font-black text-slate-900">{actionLabel(log.action)}</p>
                <p className="mt-1 text-sm text-slate-500">{log.entity_type} · {log.entity_id ?? "sin ID"}</p>
                <p className="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{formatDateTime(log.created_at)}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/60 backdrop-blur">
          <h3 className="text-xl font-black text-slate-950">Mensajes recientes</h3>
          <div className="mt-5 space-y-3">
            {!messages?.length ? <EmptyState title="No hay mensajes recientes." /> : messages.map((message: any) => (
              <article key={message.id} className="rounded-3xl border border-slate-200 bg-white p-4">
                <p className="line-clamp-2 text-sm font-semibold leading-6 text-slate-700">{message.message}</p>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{formatDateTime(message.created_at)}</p>
                  <Link href={`/admin/vuelos/${message.flight_id}`} className={buttonSecondarySmall}>Ver vuelo</Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function StatMini({ icon, title, value, helper }: { icon: ReactNode; title: string; value: ReactNode; helper: string }) {
  return (
    <article className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/60 backdrop-blur">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-800">
        {icon}
      </div>
      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{title}</p>
      <p className="mt-3 text-3xl font-black text-slate-950">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{helper}</p>
    </article>
  );
}

import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatCard } from "@/components/dashboard/StatCard";
import { createClient } from "@/lib/supabase/server";
import { buttonSecondarySmall, filterActive, filterInactive, inputClass } from "@/lib/styles";
import { formatCurrency, formatDate, getAmountToPay } from "@/lib/utils";

const roleFilters = [
  { label: "Todos", value: "todos" },
  { label: "Usuarios", value: "user" },
  { label: "Administradores", value: "admin" },
];

const confirmedStatuses = ["pago_confirmado", "pendiente_qr", "qr_enviado", "completado"];

type PageProps = {
  searchParams: Promise<{ role?: string; q?: string }>;
};

export default async function AdminUsersPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const activeRole = query.role ?? "todos";
  const search = (query.q ?? "").trim();
  const supabase = await createClient();

  let usersRequest = supabase
    .from("profiles")
    .select("id, full_name, email, role, created_at")
    .order("created_at", { ascending: false });

  if (activeRole !== "todos") {
    usersRequest = usersRequest.eq("role", activeRole);
  }

  if (search) {
    const safeSearch = search.replace(/[%_]/g, "\\$&");
    usersRequest = usersRequest.or(`full_name.ilike.%${safeSearch}%,email.ilike.%${safeSearch}%`);
  }

  const { data: users, error: usersError } = await usersRequest;
  const safeUsers = users ?? [];
  const userIds = safeUsers.map((user: any) => user.id).filter(Boolean);

  const { data: flightsData, error: flightsError } = userIds.length
    ? await supabase
        .from("flights")
        .select("id, user_id, total_amount, payment_percentage, amount_to_pay, status, flight_date")
        .in("user_id", userIds)
    : { data: [], error: null };

  const flightsByUser = new Map<string, any[]>();
  for (const flight of flightsData ?? []) {
    const current = flightsByUser.get(flight.user_id) ?? [];
    current.push(flight);
    flightsByUser.set(flight.user_id, current);
  }

  const admins = safeUsers.filter((user: any) => user.role === "admin");
  const totalConfirmed = safeUsers.reduce((sum: number, user: any) => {
    const flights = flightsByUser.get(user.id) ?? [];
    return sum + flights.reduce((inner: number, flight: any) => {
      return confirmedStatuses.includes(flight.status) ? inner + getAmountToPay(flight) : inner;
    }, 0);
  }, 0);

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/60 backdrop-blur">
        <p className="text-sm font-black uppercase tracking-[0.24em] text-sky-700">Panel administrativo</p>
        <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Usuarios</h2>
        <p className="mt-2 text-slate-500">Consulta usuarios, historial individual, vuelos enviados y total confirmado.</p>
        {usersError || flightsError ? (
          <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
            {usersError?.message || flightsError?.message || "No se pudo cargar toda la información de usuarios."}
          </p>
        ) : null}
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        <StatCard title="Usuarios encontrados" value={safeUsers.length} helper="Según filtros actuales" />
        <StatCard title="Administradores" value={admins.length} helper="Cuentas con permisos admin" />
        <StatCard title="Total confirmado" value={formatCurrency(totalConfirmed)} helper="Usuarios mostrados" />
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-4 shadow-xl shadow-slate-200/60 backdrop-blur">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">
            {roleFilters.map((filter) => {
              const href = filter.value === "todos" ? `/admin/usuarios${search ? `?q=${encodeURIComponent(search)}` : ""}` : `/admin/usuarios?role=${filter.value}${search ? `&q=${encodeURIComponent(search)}` : ""}`;
              return (
                <Link key={filter.value} href={href} className={filter.value === activeRole ? filterActive : filterInactive}>
                  {filter.label}
                </Link>
              );
            })}
          </div>

          <form className="flex w-full flex-col gap-2 sm:flex-row xl:w-auto" action="/admin/usuarios">
            {activeRole !== "todos" ? <input type="hidden" name="role" value={activeRole} /> : null}
            <input className={`${inputClass} sm:w-80`} name="q" defaultValue={search} placeholder="Buscar nombre o correo" />
            <button className="rounded-2xl border border-sky-200 bg-sky-50 px-5 py-3 text-sm font-black text-sky-900 transition hover:bg-sky-100">
              Buscar
            </button>
          </form>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/60 backdrop-blur">
        {!safeUsers.length ? (
          <EmptyState title="No hay usuarios con estos filtros." description="Prueba limpiando la búsqueda o cambiando el filtro de rol." />
        ) : (
          <div className="overflow-x-auto rounded-3xl border border-slate-200">
            <table className="w-full min-w-[980px] border-collapse bg-white text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.16em] text-slate-500">
                <tr>
                  <th className="px-5 py-4">Nombre</th>
                  <th className="px-5 py-4">Correo</th>
                  <th className="px-5 py-4">Rol</th>
                  <th className="px-5 py-4">Vuelos</th>
                  <th className="px-5 py-4">Confirmado</th>
                  <th className="px-5 py-4">Registro</th>
                  <th className="px-5 py-4">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {safeUsers.map((user: any) => {
                  const flights = flightsByUser.get(user.id) ?? [];
                  const confirmed = flights.reduce((sum: number, flight: any) => {
                    return confirmedStatuses.includes(flight.status) ? sum + getAmountToPay(flight) : sum;
                  }, 0);

                  return (
                    <tr key={user.id} className="hover:bg-slate-50/70">
                      <td data-label="Nombre" className="px-5 py-4 font-bold text-slate-800">{user.full_name || "Sin nombre"}</td>
                      <td data-label="Correo" className="px-5 py-4 text-slate-600">{user.email}</td>
                      <td data-label="Rol" className="px-5 py-4">
                        <span className={user.role === "admin" ? "rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-black text-sky-900" : "rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-700"}>
                          {user.role === "admin" ? "Admin" : "Usuario"}
                        </span>
                      </td>
                      <td data-label="Vuelos" className="px-5 py-4 text-slate-600">{flights.length}</td>
                      <td data-label="Confirmado" className="px-5 py-4 font-bold text-slate-900">{formatCurrency(confirmed)}</td>
                      <td data-label="Registro" className="px-5 py-4 text-slate-600">{formatDate(String(user.created_at).slice(0, 10))}</td>
                      <td data-label="Acción" className="px-5 py-4">
                        <Link href={`/admin/usuarios/${user.id}`} className={buttonSecondarySmall}>
                          Ver historial
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

import Link from "next/link";
import { MessageSquare, Plane, Headphones } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { createClient } from "@/lib/supabase/server";
import { buttonSecondary, buttonPrimarySmall } from "@/lib/styles";
import { formatDate, formatDateTime } from "@/lib/utils";
import { AdminSupportChat } from "@/components/flights/AdminSupportChat";

type PageProps = {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ tab?: string }>;
};

type FlightMessageGroup = {
  flightId: string; flight: any; messages: any[]; latest: any;
};

function shortId(v?: string | null) { return v ? v.slice(0, 8).toUpperCase() : "SIN ID"; }
function getFlight(row: any) { return Array.isArray(row?.flights) ? row.flights[0] : row?.flights; }
function normalizeProfile(value: any) { return Array.isArray(value) ? (value[0] ?? null) : value; }

export default async function AdminUserMessagesPage({ params, searchParams }: PageProps) {
  const { userId } = await params;
  const { tab } = await searchParams;
  const supabase = await createClient();

  const [
    { data: profileRaw },
    { data: flightMessages },
    { data: supportMessagesRaw },
    { data: { user: adminUser } },
  ] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email").eq("id", userId).maybeSingle(),
    supabase
      .from("flight_messages")
      .select("id, message, message_type, created_at, flight_id, sender_id, flights!inner(id, user_id, flight_date, flight_time, status), profiles:sender_id(full_name, email)")
      .eq("flights.user_id", userId)
      .order("created_at", { ascending: false })
      .limit(120),
    supabase
      .from("support_messages")
      .select("id, message, sender_id, created_at, profiles:sender_id(full_name, email)")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(100),
    supabase.auth.getUser(),
  ]);

  const adminId = adminUser?.id ?? "";
  const activeTab = tab === "soporte" ? "soporte" : "vuelos";

  const supportMessages = (supportMessagesRaw ?? []).map((msg: any) => ({
    ...msg,
    profiles: normalizeProfile(msg.profiles),
  }));

  const supportOwner = supportMessages.find((msg: any) => msg.sender_id === userId)?.profiles;
  const flightOwner = (flightMessages ?? []).find((msg: any) => msg.sender_id === userId)?.profiles;
  const profile = profileRaw ?? supportOwner ?? normalizeProfile(flightOwner) ?? {
    id: userId,
    full_name: `Usuario ${shortId(userId)}`,
    email: "Sin correo registrado",
  };

  const grouped = new Map<string, FlightMessageGroup>();
  for (const msg of flightMessages ?? []) {
    const flight = getFlight(msg);
    const flightId = msg.flight_id ?? flight?.id;
    if (!flightId) continue;
    if (!grouped.has(flightId)) grouped.set(flightId, { flightId, flight, messages: [], latest: msg });
    const g = grouped.get(flightId)!;
    g.messages.push(msg);
    if (new Date(msg.created_at) > new Date(g.latest.created_at)) g.latest = msg;
  }
  const groups = Array.from(grouped.values()).sort(
    (a, b) => new Date(b.latest.created_at).getTime() - new Date(a.latest.created_at).getTime()
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-start">
        <Link href="/admin/mensajes" className={buttonSecondary}>← Volver a mensajes</Link>
      </div>

      <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/60 backdrop-blur">
        <p className="text-sm font-black uppercase tracking-[0.24em] text-sky-700">Conversación con usuario</p>
        <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">{profile.full_name || "Usuario"}</h2>
        <p className="mt-1 text-slate-500">{profile.email || "Sin correo registrado"}</p>
      </section>

      <div className="flex gap-2">
        <Link
          href={`/admin/mensajes/${userId}`}
          className={`rounded-2xl px-5 py-2.5 text-sm font-black transition ${
            activeTab === "vuelos"
              ? "bg-sky-600 text-white shadow"
              : "bg-white border border-slate-200 text-slate-600 hover:bg-sky-50"
          }`}
        >
          <span className="flex items-center gap-2"><Plane size={15} /> Vuelos ({groups.length})</span>
        </Link>
        <Link
          href={`/admin/mensajes/${userId}?tab=soporte`}
          className={`rounded-2xl px-5 py-2.5 text-sm font-black transition ${
            activeTab === "soporte"
              ? "bg-sky-600 text-white shadow"
              : "bg-white border border-slate-200 text-slate-600 hover:bg-sky-50"
          }`}
        >
          <span className="flex items-center gap-2"><Headphones size={15} /> Soporte ({supportMessages.length})</span>
        </Link>
      </div>

      {activeTab === "soporte" && (
        <AdminSupportChat
          messages={supportMessages}
          userId={userId}
          adminId={adminId}
          userName={profile.full_name || profile.email || "Usuario"}
        />
      )}

      {activeTab === "vuelos" && (
        <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/60 backdrop-blur">
          {!groups.length ? (
            <EmptyState title="Este usuario no tiene mensajes de vuelos todavía." />
          ) : (
            <div className="grid gap-4">
              {groups.map((group) => (
                <article key={group.flightId} className="rounded-3xl border border-slate-200 bg-white p-5">
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="flex gap-4">
                      <div className="mt-1 rounded-2xl bg-sky-50 p-3 text-sky-800"><Plane size={19} /></div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-black text-slate-950">Vuelo {shortId(group.flightId)}</h3>
                          {group.flight?.status ? <StatusBadge status={group.flight.status} /> : null}
                        </div>
                        <p className="mt-2 text-sm font-semibold text-slate-500">
                          {group.flight?.flight_date ? formatDate(group.flight.flight_date) : "Sin fecha"} · {String(group.flight?.flight_time ?? "").slice(0, 5) || "Sin hora"}
                        </p>
                        <p className="mt-4 line-clamp-2 max-w-3xl text-sm leading-6 text-slate-700">{group.latest.message}</p>
                        <p className="mt-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                          {group.messages.length} mensaje{group.messages.length === 1 ? "" : "s"} · último: {formatDateTime(group.latest.created_at)}
                        </p>
                        {group.messages.length > 1 && (
                          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Últimos mensajes</p>
                            <div className="space-y-2">
                              {group.messages.slice(0, 3).map((message: any) => (
                                <div key={message.id} className="text-xs leading-5 text-slate-600">
                                  <span className="font-black text-slate-800">
                                    {Array.isArray(message.profiles)
                                      ? (message.profiles[0]?.full_name || message.profiles[0]?.email || "Sistema")
                                      : (message.profiles?.full_name || message.profiles?.email || "Sistema")}: {" "}
                                  </span>
                                  <span className="line-clamp-1">{message.message}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <Link href={`/admin/vuelos/${group.flightId}`} className={buttonPrimarySmall}>
                      <MessageSquare size={15} />
                      Abrir vuelo
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

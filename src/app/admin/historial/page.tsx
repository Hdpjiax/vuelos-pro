import Link from "next/link";
import { History, UserRound } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { createClient } from "@/lib/supabase/server";
import { buttonSecondarySmall, filterActive, filterInactive } from "@/lib/styles";
import { actionLabel, formatDateTime, safeJsonPreview } from "@/lib/utils";

const actionFilters = [
  { label: "Todo", value: "todos" },
  { label: "Vuelos", value: "flight_created" },
  { label: "Estados", value: "flight_status_changed" },
  { label: "Comprobantes", value: "payment_proof_uploaded" },
  { label: "QR", value: "qr_uploaded" },
  { label: "Roles", value: "user_role_updated" },
];

type PageProps = {
  searchParams: Promise<{ action?: string }>;
};

type LogGroup = {
  key: string;
  entityType: string;
  entityId?: string | null;
  logs: any[];
  latest: any;
};

function groupLogs(logs: any[]) {
  const map = new Map<string, LogGroup>();

  for (const log of logs) {
    const key = log.entity_id ? `${log.entity_type}:${log.entity_id}` : `${log.entity_type}:${log.action}:${log.id}`;
    const current = map.get(key);

    if (!current) {
      map.set(key, {
        key,
        entityType: log.entity_type,
        entityId: log.entity_id,
        logs: [log],
        latest: log,
      });
      continue;
    }

    current.logs.push(log);
    if (new Date(log.created_at).getTime() > new Date(current.latest.created_at).getTime()) {
      current.latest = log;
    }
  }

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.latest.created_at).getTime() - new Date(a.latest.created_at).getTime()
  );
}

export default async function AdminHistoryPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const activeAction = query.action ?? "todos";
  const supabase = await createClient();

  let request = supabase
    .from("audit_logs")
    .select("id, action, entity_type, entity_id, metadata, created_at, profiles:user_id(full_name, email)")
    .order("created_at", { ascending: false })
    .limit(90);

  if (activeAction !== "todos") {
    request = request.eq("action", activeAction);
  }

  const { data: logs } = await request;
  const safeLogs = logs ?? [];
  const groups = groupLogs(safeLogs as any[]);

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/60 backdrop-blur">
        <p className="text-sm font-black uppercase tracking-[0.24em] text-sky-700">Panel administrativo</p>
        <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Historial general</h2>
        <p className="mt-2 text-slate-500">Registro agrupado por entidad para revisar actividad sin una lista interminable de eventos.</p>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-4 shadow-xl shadow-slate-200/60 backdrop-blur">
        <div className="flex flex-wrap gap-2">
          {actionFilters.map((filter) => (
            <Link
              key={filter.value}
              href={filter.value === "todos" ? "/admin/historial" : `/admin/historial?action=${filter.value}`}
              className={filter.value === activeAction ? filterActive : filterInactive}
            >
              {filter.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        <article className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/60">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Grupos</p>
          <p className="mt-3 text-3xl font-black text-slate-950">{groups.length}</p>
          <p className="mt-1 text-sm text-slate-500">Entidades con actividad</p>
        </article>
        <article className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/60">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Eventos</p>
          <p className="mt-3 text-3xl font-black text-slate-950">{safeLogs.length}</p>
          <p className="mt-1 text-sm text-slate-500">Últimos registros</p>
        </article>
        <article className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/60">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Última actividad</p>
          <p className="mt-3 text-xl font-black text-slate-950">{groups[0]?.latest ? formatDateTime(groups[0].latest.created_at) : "Sin actividad"}</p>
          <p className="mt-1 text-sm text-slate-500">Según filtro actual</p>
        </article>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/60 backdrop-blur">
        {!groups.length ? (
          <EmptyState title="Aún no hay historial para este filtro." />
        ) : (
          <div className="grid gap-4">
            {groups.map((group) => (
              <article key={group.key} className="rounded-3xl border border-slate-200 bg-white p-5">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div className="flex gap-4">
                    <div className="mt-1 rounded-2xl bg-sky-50 p-3 text-sky-800">
                      {group.entityType === "flight" ? <History size={19} /> : <UserRound size={19} />}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-black text-slate-950">{group.entityType} · {group.entityId ?? "sin ID"}</h3>
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-600">
                          {group.logs.length} evento{group.logs.length === 1 ? "" : "s"}
                        </span>
                      </div>
                      <p className="mt-2 font-black text-slate-800">{actionLabel(group.latest.action)}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        Usuario: {group.latest.profiles?.full_name || group.latest.profiles?.email || "Sistema"}
                      </p>
                      <p className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                        Último movimiento: {formatDateTime(group.latest.created_at)}
                      </p>

                      {group.logs.length > 1 ? (
                        <div className="history-activity-panel mt-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Actividad reciente</p>
                          <div className="space-y-2">
                            {group.logs.slice(0, 3).map((log) => (
                              <div key={log.id} className="flex items-start justify-between gap-3 text-xs">
                                <p className="font-bold text-slate-700">{actionLabel(log.action)}</p>
                                <p className="shrink-0 font-semibold text-slate-400">{formatDateTime(log.created_at)}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="w-full shrink-0 xl:w-96">
                    {group.entityType === "flight" && group.entityId ? (
                      <Link href={`/admin/vuelos/${group.entityId}`} className={`${buttonSecondarySmall} mb-3`}>
                        Abrir vuelo
                      </Link>
                    ) : null}
                    <pre className="max-h-44 w-full overflow-auto rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs leading-5 text-slate-600">
                      {safeJsonPreview(group.latest.metadata)}
                    </pre>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

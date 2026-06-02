
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Database, ExternalLink, Rocket, ShieldCheck, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { buttonDangerSmall, buttonPrimary, buttonPrimarySmall, buttonSecondarySmall, inputClass, labelClass, panelClass, subtlePanelClass } from "@/lib/styles";
import { formatDateTime } from "@/lib/utils";
import { cleanupReadNotificationsAction, deleteAttachmentAction, saveProductionSettingsAction } from "./actions";

type PageProps = {
  searchParams: Promise<{ saved?: string; cleaned?: string; deleted?: string }>;
};

type ProductionSettings = {
  site_url?: string;
  support_escalation_email?: string;
  legal_notice?: string;
  public_registration_enabled?: boolean;
  max_upload_mb?: number;
  cleanup_read_notifications_days?: number;
};

const defaultProductionSettings: Required<ProductionSettings> = {
  site_url: "",
  support_escalation_email: "",
  legal_notice: "",
  public_registration_enabled: true,
  max_upload_mb: 8,
  cleanup_read_notifications_days: 45,
};

async function getCount(supabase: any, table: string, filters?: (query: any) => any) {
  let query = supabase.from(table).select("id", { count: "exact", head: true });
  if (filters) query = filters(query);
  const { count } = await query;
  return count ?? 0;
}

function CheckItem({ ok, label, description }: { ok: boolean; label: string; description: string }) {
  return (
    <div className="flex items-start gap-3 rounded-3xl border border-slate-200 bg-white p-4">
      <div className={ok ? "rounded-2xl bg-emerald-100 p-2 text-emerald-700" : "rounded-2xl bg-amber-100 p-2 text-amber-700"}>
        {ok ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
      </div>
      <div>
        <p className="font-black text-slate-950">{label}</p>
        <p className="mt-1 text-sm font-semibold text-slate-500">{description}</p>
      </div>
    </div>
  );
}

export default async function AdminProductionPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const supabase = await createClient();

  const [
    { data: productionRow },
    { data: operationsRow },
    adminCount,
    userCount,
    pendingFlights,
    unreadNotifications,
    recentAttachmentsResponse,
  ] = await Promise.all([
    supabase.from("app_settings").select("value, updated_at").eq("key", "production").maybeSingle(),
    supabase.from("app_settings").select("value, updated_at").eq("key", "operations").maybeSingle(),
    getCount(supabase, "profiles", (request) => request.eq("role", "admin")),
    getCount(supabase, "profiles", (request) => request.eq("role", "user")),
    getCount(supabase, "flights", (request) => request.not("status", "in", "(completado,cancelado)")),
    getCount(supabase, "notifications", (request) => request.eq("read", false)),
    supabase
      .from("flight_attachments")
      .select("id, flight_id, file_path, file_name, file_type, category, created_at, flights(status, profiles(full_name, email))")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const settings: Required<ProductionSettings> = {
    ...defaultProductionSettings,
    ...((productionRow?.value as ProductionSettings | null) ?? {}),
  };
  const operations = (operationsRow?.value ?? {}) as { support_email?: string; support_whatsapp?: string; urgent_window_days?: number };
  const recentAttachments = recentAttachmentsResponse?.data ?? [];

  const envChecks = [
    {
      ok: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      label: "Supabase URL",
      description: "Variable NEXT_PUBLIC_SUPABASE_URL configurada.",
    },
    {
      ok: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      label: "Supabase anon key",
      description: "Variable NEXT_PUBLIC_SUPABASE_ANON_KEY configurada.",
    },
    {
      ok: Boolean(process.env.NEXT_PUBLIC_SITE_URL || settings.site_url),
      label: "URL pública del sitio",
      description: "Configura NEXT_PUBLIC_SITE_URL o guarda la URL pública aquí.",
    },
    {
      ok: adminCount > 0,
      label: "Usuario administrador",
      description: "Debe existir al menos una cuenta con rol admin.",
    },
  ];

  return (
    <div className="space-y-6">
      <section className={panelClass}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.24em] text-sky-700">Panel administrativo</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Producción y seguridad</h2>
            <p className="mt-2 max-w-3xl text-slate-500">
              Checklist final para publicar la plataforma, revisar variables, controlar registros y limpiar datos operativos sin perder historial importante.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/configuracion" className={buttonSecondarySmall}>Operación</Link>
            <Link href="/admin/historial" className={buttonSecondarySmall}>Ver auditoría</Link>
          </div>
        </div>
      </section>

      {query.saved === "1" ? (
        <div className="rounded-[2rem] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-800">
          Configuración de producción guardada correctamente.
        </div>
      ) : null}
      {query.cleaned ? (
        <div className="rounded-[2rem] border border-sky-200 bg-sky-50 px-5 py-4 text-sm font-bold text-sky-900">
          Limpieza realizada. Notificaciones leídas eliminadas: {query.cleaned}.
        </div>
      ) : null}
      {query.deleted === "1" ? (
        <div className="rounded-[2rem] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-800">
          Archivo eliminado de forma segura.
        </div>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-4">
        <article className={subtlePanelClass}>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Administradores</p>
          <p className="mt-2 text-3xl font-black text-slate-950">{adminCount}</p>
        </article>
        <article className={subtlePanelClass}>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Usuarios</p>
          <p className="mt-2 text-3xl font-black text-slate-950">{userCount}</p>
        </article>
        <article className={subtlePanelClass}>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Vuelos abiertos</p>
          <p className="mt-2 text-3xl font-black text-slate-950">{pendingFlights}</p>
        </article>
        <article className={subtlePanelClass}>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Notificaciones sin leer</p>
          <p className="mt-2 text-3xl font-black text-slate-950">{unreadNotifications}</p>
        </article>
      </section>

      <section className={panelClass}>
        <div className="mb-5 flex items-start gap-3">
          <div className="rounded-2xl bg-sky-100 p-2 text-sky-800"><ShieldCheck size={20} /></div>
          <div>
            <h3 className="text-2xl font-black tracking-tight text-slate-950">Checklist de publicación</h3>
            <p className="mt-1 text-sm text-slate-500">Estos puntos ayudan a detectar lo básico antes de subir el proyecto a una web real.</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {envChecks.map((item) => <CheckItem key={item.label} {...item} />)}
          <CheckItem
            ok={Boolean(operations.support_email || operations.support_whatsapp)}
            label="Soporte visible"
            description="Configura correo o WhatsApp en Configuración para que el usuario tenga contacto de soporte."
          />
          <CheckItem
            ok={Number(operations.urgent_window_days ?? 0) > 0}
            label="Urgencias configuradas"
            description="El dashboard admin usa este rango para mostrar vuelos cercanos."
          />
        </div>
      </section>

      <section className={panelClass}>
        <div className="mb-6 flex items-start gap-3">
          <div className="rounded-2xl bg-sky-100 p-2 text-sky-800"><Rocket size={20} /></div>
          <div>
            <h3 className="text-2xl font-black tracking-tight text-slate-950">Ajustes para producción</h3>
            <p className="mt-1 text-sm text-slate-500">Controla registros públicos, URL final, límites de carga y textos legales internos.</p>
          </div>
        </div>

        <form action={saveProductionSettingsAction} className="space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            <label className="space-y-2">
              <span className={labelClass}>URL pública del sitio</span>
              <input className={inputClass} name="site_url" defaultValue={settings.site_url} placeholder="https://tudominio.com" />
            </label>
            <label className="space-y-2">
              <span className={labelClass}>Correo de escalamiento</span>
              <input className={inputClass} name="support_escalation_email" defaultValue={settings.support_escalation_email} placeholder="admin@tudominio.com" />
            </label>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="space-y-2">
              <span className={labelClass}>Límite de carga por archivo MB</span>
              <input className={inputClass} type="number" min="1" max="25" name="max_upload_mb" defaultValue={settings.max_upload_mb} />
            </label>
            <label className="space-y-2">
              <span className={labelClass}>Días para limpiar notificaciones leídas</span>
              <input className={inputClass} type="number" min="7" max="365" name="cleanup_read_notifications_days" defaultValue={settings.cleanup_read_notifications_days} />
            </label>
          </div>

          <label className="flex items-start gap-3 rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
            <input type="checkbox" name="public_registration_enabled" defaultChecked={settings.public_registration_enabled} className="mt-1 h-5 w-5 rounded border-slate-300" />
            <span>
              <span className="block font-black text-slate-950">Permitir registro público de usuarios</span>
              <span className="mt-1 block text-sm font-semibold text-slate-500">Desactívalo cuando quieras crear cuentas solo de forma controlada desde administración/base de datos.</span>
            </span>
          </label>

          <label className="block space-y-2">
            <span className={labelClass}>Aviso interno / nota legal</span>
            <textarea className={`${inputClass} min-h-28 resize-y`} name="legal_notice" defaultValue={settings.legal_notice} placeholder="Texto interno para operación, políticas de servicio o notas legales." />
          </label>

          <div className="flex justify-end">
            <button className={buttonPrimary}>Guardar ajustes de producción</button>
          </div>
        </form>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className={panelClass}>
          <div className="mb-5 flex items-start gap-3">
            <div className="rounded-2xl bg-amber-100 p-2 text-amber-700"><Database size={20} /></div>
            <div>
              <h3 className="text-2xl font-black tracking-tight text-slate-950">Mantenimiento seguro</h3>
              <p className="mt-1 text-sm text-slate-500">Limpia ruido operativo sin eliminar vuelos ni auditoría.</p>
            </div>
          </div>

          <form action={cleanupReadNotificationsAction} className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
            <label className="space-y-2">
              <span className={labelClass}>Eliminar notificaciones leídas mayores a</span>
              <input className={inputClass} type="number" min="7" max="365" name="older_than_days" defaultValue={settings.cleanup_read_notifications_days} />
            </label>
            <button className={`${buttonPrimarySmall} mt-4`}>
              Limpiar notificaciones leídas
            </button>
          </form>
        </div>

        <div className={panelClass}>
          <div className="mb-5 flex items-start gap-3">
            <div className="rounded-2xl bg-sky-100 p-2 text-sky-800"><ExternalLink size={20} /></div>
            <div>
              <h3 className="text-2xl font-black tracking-tight text-slate-950">Checklist de despliegue</h3>
              <p className="mt-1 text-sm text-slate-500">Usa esta guía cuando subas el proyecto a producción.</p>
            </div>
          </div>
          <div className="space-y-3 text-sm font-semibold text-slate-600">
            <p>1. Sube el código a GitHub.</p>
            <p>2. Crea el proyecto web y conecta el repositorio.</p>
            <p>3. Agrega las variables de entorno del archivo <code className="rounded bg-slate-100 px-1 py-0.5">.env.production.example</code>.</p>
            <p>4. Ejecuta todos los SQL hasta <code className="rounded bg-slate-100 px-1 py-0.5">07_etapa_7.sql</code>.</p>
            <p>5. Prueba login, registro, subir vuelo, comprobante, QR y notificaciones.</p>
          </div>
        </div>
      </section>

      <section className={panelClass}>
        <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.24em] text-sky-700">Archivos recientes</p>
            <h3 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Eliminación segura</h3>
            <p className="mt-1 text-sm text-slate-500">Solo administración puede eliminar adjuntos. La acción borra el archivo del bucket y su registro.</p>
          </div>
        </div>

        {!recentAttachments.length ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 px-6 py-8 text-center text-sm font-bold text-slate-500">
            No hay archivos recientes.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-3xl border border-slate-200">
            <table className="w-full min-w-[920px] border-collapse bg-white text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.16em] text-slate-500">
                <tr>
                  <th className="px-5 py-4">Archivo</th>
                  <th className="px-5 py-4">Categoría</th>
                  <th className="px-5 py-4">Vuelo</th>
                  <th className="px-5 py-4">Usuario</th>
                  <th className="px-5 py-4">Fecha</th>
                  <th className="px-5 py-4">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentAttachments.map((attachment: any) => (
                  <tr key={attachment.id} className="hover:bg-slate-50/70">
                    <td data-label="Archivo" className="px-5 py-4">
                      <p className="max-w-[280px] truncate font-black text-slate-900">{attachment.file_name}</p>
                      <p className="max-w-[280px] truncate text-xs font-semibold text-slate-500">{attachment.file_path}</p>
                    </td>
                    <td data-label="Categoría" className="px-5 py-4 font-bold text-slate-600">{attachment.category}</td>
                    <td data-label="Vuelo" className="px-5 py-4">
                      <Link href={`/admin/vuelos/${attachment.flight_id}`} className="font-black text-sky-800 hover:text-sky-950">
                        {String(attachment.flight_id).slice(0, 8)}...
                      </Link>
                    </td>
                    <td data-label="Usuario" className="px-5 py-4">
                      <p className="font-bold text-slate-700">{attachment.flights?.profiles?.full_name || "Usuario"}</p>
                      <p className="text-xs font-semibold text-slate-500">{attachment.flights?.profiles?.email || "Sin correo"}</p>
                    </td>
                    <td data-label="Fecha" className="px-5 py-4 text-slate-600">{formatDateTime(attachment.created_at)}</td>
                    <td data-label="Acción" className="px-5 py-4">
                      <form action={deleteAttachmentAction}>
                        <input type="hidden" name="attachment_id" value={attachment.id} />
                        <button className={buttonDangerSmall}>
                          <Trash2 size={14} />
                          Eliminar
                        </button>
                      </form>
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

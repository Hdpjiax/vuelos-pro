import Link from "next/link";
import { Download, FileImage, Files, Search, Trash2 } from "lucide-react";
import { ConfirmSubmitButton } from "@/components/ui/ConfirmSubmitButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { createClient } from "@/lib/supabase/server";
import { createSignedAttachmentUrls } from "@/lib/storage";
import { buttonDangerSmall, buttonPrimarySmall, buttonSecondarySmall, inputClass, labelClass, panelClass } from "@/lib/styles";
import { formatDateTime, formatFlightFolio } from "@/lib/utils";
import { deleteAdminAttachmentAction } from "./actions";

const categories = [
  { label: "Todos", value: "todos" },
  { label: "Capturas de vuelo", value: "vuelo" },
  { label: "Comprobantes", value: "comprobante_pago" },
  { label: "QR", value: "qr" },
  { label: "Internos", value: "interno" },
  { label: "Otros", value: "otro" },
];

function categoryLabel(value: string) {
  return categories.find((item) => item.value === value)?.label ?? value;
}

type PageProps = {
  searchParams: Promise<{ category?: string; q?: string; deleted?: string }>;
};

export default async function AdminFilesPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const activeCategory = categories.some((item) => item.value === query.category) ? query.category || "todos" : "todos";
  const q = (query.q || "").trim().toLowerCase();
  const supabase = await createClient();

  let request = supabase
    .from("flight_attachments")
    .select("id, flight_id, uploaded_by, file_path, file_name, file_type, category, created_at")
    .order("created_at", { ascending: false })
    .limit(120);

  if (activeCategory !== "todos") request = request.eq("category", activeCategory);

  const { data: rawAttachments, error } = await request;
  const flightIds = Array.from(new Set((rawAttachments ?? []).map((item: any) => item.flight_id).filter(Boolean)));
  const uploaderIds = Array.from(new Set((rawAttachments ?? []).map((item: any) => item.uploaded_by).filter(Boolean)));

  const [{ data: flights }, { data: profiles }] = await Promise.all([
    flightIds.length
      ? supabase.from("flights").select("id, flight_folio, user_id, fare_type, flight_date, status").in("id", flightIds)
      : Promise.resolve({ data: [] }),
    uploaderIds.length
      ? supabase.from("profiles").select("id, full_name, email, role").in("id", uploaderIds)
      : Promise.resolve({ data: [] }),
  ]);

  const flightMap = new Map((flights ?? []).map((flight: any) => [flight.id, flight]));
  const uploadProfileMap = new Map((profiles ?? []).map((profile: any) => [profile.id, profile]));
  const attachmentsWithMeta = (rawAttachments ?? []).map((attachment: any) => ({
    ...attachment,
    flight: flightMap.get(attachment.flight_id) ?? null,
    uploader: uploadProfileMap.get(attachment.uploaded_by) ?? null,
  }));

  const filteredAttachments = attachmentsWithMeta.filter((attachment: any) => {
    if (!q) return true;
    const haystack = [
      attachment.file_name,
      attachment.file_type,
      attachment.category,
      attachment.flight_id,
      formatFlightFolio(attachment.flight ?? { id: attachment.flight_id }),
      attachment.flight?.fare_type,
      attachment.uploader?.full_name,
      attachment.uploader?.email,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });

  const attachments = await createSignedAttachmentUrls(supabase, filteredAttachments.slice(0, 80));
  const proofCount = filteredAttachments.filter((item: any) => item.category === "comprobante_pago").length;
  const qrCount = filteredAttachments.filter((item: any) => item.category === "qr").length;
  const flightCaptureCount = filteredAttachments.filter((item: any) => item.category === "vuelo").length;
  const internalCount = filteredAttachments.filter((item: any) => item.category === "interno").length;

  const currentPath = `/admin/archivos?category=${encodeURIComponent(activeCategory)}${query.q ? `&q=${encodeURIComponent(query.q)}` : ""}`;

  return (
    <div className="space-y-6">
      <section className={panelClass}>
        <p className="text-sm font-black uppercase tracking-[0.24em] text-sky-700">Panel administrativo</p>
        <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Centro de archivos</h2>
        <p className="mt-2 max-w-3xl text-slate-500">
          Revisa capturas de vuelo, comprobantes y QR desde un solo lugar. Puedes abrir, descargar o eliminar archivos seguros.
        </p>
      </section>

      {query.deleted ? (
        <section className="rounded-[2rem] border border-emerald-200 bg-emerald-50 p-5 text-emerald-900 shadow-xl shadow-emerald-100/60">
          <p className="font-black">{query.deleted === "1" ? "Archivo eliminado correctamente." : "No se pudo eliminar el archivo."}</p>
        </section>
      ) : null}

      <section className={panelClass}>
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-2xl bg-sky-100 p-2 text-sky-800"><Files size={20} /></div>
          <div>
            <h3 className="font-black text-slate-950">Filtros de archivos</h3>
            <p className="text-sm text-slate-500">Filtra por categoría, folio, usuario, archivo o tipo.</p>
          </div>
        </div>
        <form className="grid gap-4 md:grid-cols-[1fr_1.5fr_auto] md:items-end">
          <label className="space-y-2">
            <span className={labelClass}>Categoría</span>
            <select className={inputClass} name="category" defaultValue={activeCategory}>
              {categories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          <label className="space-y-2">
            <span className={labelClass}>Buscar</span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input className={`${inputClass} pl-11`} name="q" defaultValue={query.q || ""} placeholder="Folio, usuario, nombre del archivo..." />
            </div>
          </label>
          <button className={buttonPrimarySmall}>Aplicar</button>
        </form>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/admin/archivos" className={activeCategory === "todos" ? buttonPrimarySmall : buttonSecondarySmall}>Todos</Link>
          <Link href="/admin/archivos?category=comprobante_pago" className={activeCategory === "comprobante_pago" ? buttonPrimarySmall : buttonSecondarySmall}>Comprobantes</Link>
          <Link href="/admin/archivos?category=qr" className={activeCategory === "qr" ? buttonPrimarySmall : buttonSecondarySmall}>QR</Link>
          <Link href="/admin/archivos?category=interno" className={activeCategory === "interno" ? buttonPrimarySmall : buttonSecondarySmall}>Internos</Link>
          <Link href="/admin/archivos?category=vuelo" className={activeCategory === "vuelo" ? buttonPrimarySmall : buttonSecondarySmall}>Capturas</Link>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-4">
        <Mini label="Comprobantes" value={proofCount} />
        <Mini label="QR" value={qrCount} />
        <Mini label="Capturas" value={flightCaptureCount} />
        <Mini label="Internos" value={internalCount} />
      </section>

      {error ? (
        <section className="rounded-[2rem] border border-amber-200 bg-amber-50 p-5 text-amber-900 shadow-xl shadow-amber-100/60">
          <p className="font-black">No se pudieron cargar los archivos.</p>
          <p className="mt-1 text-sm font-semibold">{error.message}</p>
        </section>
      ) : null}

      <section className={panelClass}>
        <div className="mb-5">
          <h3 className="text-xl font-black text-slate-950">Archivos encontrados</h3>
          <p className="text-sm text-slate-500">{filteredAttachments.length} archivo(s) encontrados. Se muestran hasta 80 para cargar más rápido.</p>
        </div>
        {!attachments.length ? (
          <EmptyState title="No hay archivos con estos filtros." description="Prueba con otra categoría o búsqueda." />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {attachments.map((attachment: any) => (
              <article key={attachment.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
                {attachment.signedUrl && attachment.file_type?.startsWith("image/") ? (
                  <a href={attachment.signedUrl} target="_blank" rel="noreferrer" className="block bg-white">
                    <img src={attachment.signedUrl} alt={attachment.file_name} className="h-52 w-full object-contain" />
                  </a>
                ) : (
                  <div className="flex h-52 items-center justify-center bg-white text-slate-400"><FileImage size={42} /></div>
                )}
                <div className="space-y-3 p-4">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-sky-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-sky-700 ring-1 ring-sky-100">{categoryLabel(attachment.category)}</span>
                    <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500 ring-1 ring-slate-200">{attachment.file_type || "archivo"}</span>
                  </div>
                  <p className="truncate font-black text-slate-900">{attachment.file_name}</p>
                  <div className="rounded-2xl bg-white px-3 py-3 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                    <p><strong>Folio:</strong> {formatFlightFolio(attachment.flight ?? { id: attachment.flight_id })}</p>
                    <p><strong>Subido por:</strong> {attachment.uploader?.full_name || attachment.uploader?.email || "Usuario"}</p>
                    <p><strong>Fecha:</strong> {formatDateTime(attachment.created_at)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/admin/vuelos/${attachment.flight_id}`} className={buttonSecondarySmall}>Ver vuelo</Link>
                    {attachment.signedUrl ? (
                      <a href={attachment.signedUrl} target="_blank" rel="noreferrer" className={buttonPrimarySmall}>Abrir</a>
                    ) : null}
                    {attachment.signedUrl ? (
                      <a href={attachment.signedUrl} download={attachment.file_name} className={buttonSecondarySmall}><Download size={14} /> Descargar</a>
                    ) : null}
                    <form action={deleteAdminAttachmentAction}>
                      <input type="hidden" name="attachment_id" value={attachment.id} />
                      <input type="hidden" name="return_to" value={currentPath} />
                      <ConfirmSubmitButton className={buttonDangerSmall} confirmMessage="¿Eliminar este archivo? Esta acción también lo quitará del almacenamiento.">
                        <Trash2 size={14} /> Eliminar
                      </ConfirmSubmitButton>
                    </form>
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

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-5 shadow-xl shadow-slate-200/60">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-black text-slate-950">{value}</p>
    </div>
  );
}

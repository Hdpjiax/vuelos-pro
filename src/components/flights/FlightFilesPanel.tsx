import Link from "next/link";
import { Download, ExternalLink, FileArchive, FileImage, ShieldCheck } from "lucide-react";
import { ConfirmSubmitButton } from "@/components/ui/ConfirmSubmitButton";
import { buttonPrimary, buttonSecondarySmall, inputClass, labelClass } from "@/lib/styles";
import { formatDateTime } from "@/lib/utils";

const groups = [
  { key: "vuelo", title: "Capturas del vuelo", description: "Imágenes o capturas originales/subidas por el usuario." },
  { key: "comprobante_pago", title: "Comprobantes de pago", description: "Archivos enviados por el usuario para validar depósito." },
  { key: "qr", title: "QR y documentos enviados", description: "QR o fotos finales enviados por administración." },
  { key: "interno", title: "Archivos internos", description: "Documentos privados de administración. El usuario no los ve." },
  { key: "otro", title: "Otros archivos", description: "Archivos operativos no clasificados." },
];

function groupAttachments(attachments: any[]) {
  const map = new Map<string, any[]>();
  for (const group of groups) map.set(group.key, []);
  for (const attachment of attachments) {
    const key = map.has(attachment.category) ? attachment.category : "otro";
    map.get(key)!.push(attachment);
  }
  return map;
}

export function FlightFilesPanel({
  flightId,
  attachments,
  canUploadInternal = false,
  uploadAction,
  downloadAllHref,
}: {
  flightId: string;
  attachments: any[];
  canUploadInternal?: boolean;
  uploadAction?: (formData: FormData) => Promise<void>;
  downloadAllHref?: string;
}) {
  const grouped = groupAttachments(attachments);
  const visibleGroups = groups.filter((group) => canUploadInternal || group.key !== "interno");

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/60 backdrop-blur">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.18em] text-sky-700">Control de archivos</p>
          <h3 className="mt-1 text-xl font-black text-slate-950">Archivos separados por etapa</h3>
          <p className="mt-1 text-sm text-slate-500">Captura, comprobante, QR y archivos internos separados para operación limpia.</p>
        </div>
        {downloadAllHref ? (
          <Link href={downloadAllHref} className={buttonPrimary} target="_blank">
            <FileArchive size={16} /> Descargar todo ZIP
          </Link>
        ) : null}
      </div>

      {canUploadInternal && uploadAction ? (
        <form action={uploadAction} className="mb-6 rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
          <input type="hidden" name="flight_id" value={flightId} />
          <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
            <label className="space-y-2">
              <span className={labelClass}>Subir archivo interno</span>
              <input className={inputClass} type="file" name="internal_files" multiple accept="image/*,.pdf" />
              <span className="block text-xs font-semibold text-slate-500">Solo admin. Sirve para proveedores, incidencias o respaldo interno.</span>
            </label>
            <ConfirmSubmitButton className={buttonPrimary} confirmMessage="¿Subir estos archivos internos? No serán visibles para el usuario.">
              Subir interno
            </ConfirmSubmitButton>
          </div>
        </form>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        {visibleGroups.map((group) => {
          const files = grouped.get(group.key) ?? [];
          return (
            <article key={group.key} className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h4 className="font-black text-slate-950">{group.title}</h4>
                  <p className="text-xs font-semibold leading-5 text-slate-500">{group.description}</p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-700 ring-1 ring-slate-200">{files.length}</span>
              </div>

              {!files.length ? (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-6 text-center text-sm font-bold text-slate-500">
                  Sin archivos en esta categoría.
                </div>
              ) : (
                <div className="space-y-3">
                  {files.map((file) => (
                    <div key={file.id} className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-100 text-slate-400">
                        {file.signedUrl && file.file_type?.startsWith("image/") ? (
                          <img src={file.signedUrl} alt={file.file_name} className="h-full w-full object-cover" />
                        ) : group.key === "interno" ? (
                          <ShieldCheck size={24} />
                        ) : (
                          <FileImage size={24} />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black text-slate-900">{file.file_name}</p>
                        <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">{formatDateTime(file.created_at)}</p>
                      </div>
                      {file.signedUrl ? (
                        <div className="flex flex-wrap gap-2">
                          <a href={file.signedUrl} target="_blank" rel="noreferrer" className={buttonSecondarySmall}><ExternalLink size={14} /> Abrir</a>
                          <a href={file.signedUrl} download={file.file_name} className={buttonSecondarySmall}><Download size={14} /> Descargar</a>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

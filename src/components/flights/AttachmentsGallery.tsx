import { Download, ExternalLink, FileImage } from "lucide-react";

const categoryLabels: Record<string, string> = {
  vuelo: "Captura de vuelo",
  comprobante_pago: "Comprobante",
  qr: "QR",
  otro: "Otro",
};

type Attachment = {
  id: string;
  file_name: string;
  file_type?: string | null;
  category: string;
  created_at: string;
  signedUrl?: string | null;
};

export function AttachmentsGallery({
  title,
  description,
  attachments,
  emptyText,
}: {
  title: string;
  description?: string;
  attachments: Attachment[];
  emptyText: string;
}) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/60 backdrop-blur">
      <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.24em] text-sky-700">Archivos</p>
          <h3 className="mt-1 text-2xl font-black tracking-tight text-slate-950">{title}</h3>
          {description ? <p className="mt-2 text-sm text-slate-500">{description}</p> : null}
        </div>
        <span className="w-fit rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
          {attachments.length} archivo(s)
        </span>
      </div>

      {!attachments.length ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 px-6 py-8 text-center text-sm font-bold text-slate-500">
          {emptyText}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {attachments.map((attachment) => (
            <article key={attachment.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
              {attachment.signedUrl && attachment.file_type?.startsWith("image/") ? (
                <a href={attachment.signedUrl} target="_blank" rel="noreferrer" className="block bg-white">
                  <img src={attachment.signedUrl} alt={attachment.file_name} className="h-52 w-full object-contain" />
                </a>
              ) : (
                <div className="flex h-52 items-center justify-center bg-white px-4 text-center text-slate-400">
                  <FileImage size={42} />
                </div>
              )}
              <div className="p-4">
                <div className="mb-3 flex flex-wrap gap-2">
                  <span className="rounded-full bg-sky-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-sky-700 ring-1 ring-sky-100">
                    {categoryLabels[attachment.category] ?? attachment.category}
                  </span>
                  <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500 ring-1 ring-slate-200">
                    {attachment.file_type || "archivo"}
                  </span>
                </div>
                <p className="truncate font-black text-slate-900">{attachment.file_name}</p>
                <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                  {new Date(attachment.created_at).toLocaleString("es-MX")}
                </p>
                {attachment.signedUrl ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <a href={attachment.signedUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-black text-sky-900 transition hover:bg-sky-100">
                      <ExternalLink size={14} /> Abrir
                    </a>
                    <a href={attachment.signedUrl} download={attachment.file_name} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-100">
                      <Download size={14} /> Descargar
                    </a>
                  </div>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

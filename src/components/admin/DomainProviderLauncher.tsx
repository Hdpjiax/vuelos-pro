"use client";

import { useMemo, useState } from "react";
import { Copy, ExternalLink, FileText, Globe2, Mail, ShieldCheck, Sparkles } from "lucide-react";

const EXAMPLE_DOMAINS = "empresa.com\nvuelos-pro.com\ncliente-autorizado.mx";

const PROVIDER_LINKS: Record<string, string> = {
  "gmail.com": "https://mail.google.com/",
  "googlemail.com": "https://mail.google.com/",
  "yahoo.com": "https://mail.yahoo.com/",
  "yahoo.com.mx": "https://mail.yahoo.com/",
  "outlook.com": "https://outlook.live.com/",
  "hotmail.com": "https://outlook.live.com/",
  "live.com": "https://outlook.live.com/",
  "msn.com": "https://outlook.live.com/",
  "icloud.com": "https://www.icloud.com/mail/",
  "me.com": "https://www.icloud.com/mail/",
  "mac.com": "https://www.icloud.com/mail/",
  "proton.me": "https://mail.proton.me/",
  "protonmail.com": "https://mail.proton.me/",
  "zoho.com": "https://mail.zoho.com/",
  "aol.com": "https://mail.aol.com/",
  "gmx.com": "https://www.gmx.com/mail/",
  "mail.com": "https://www.mail.com/",
  "fastmail.com": "https://www.fastmail.com/login/",
  "yandex.com": "https://mail.yandex.com/",
  "tuta.com": "https://app.tuta.com/",
  "tutanota.com": "https://app.tuta.com/",
  "hey.com": "https://app.hey.com/",
};

type GeneratedContact = {
  value: string;
  pattern: string;
  domain: string;
};

function normalizeDomain(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^@+/, "")
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .replace(/[^a-z0-9.-]/g, "");
}

function getProviderUrl(domain: string) {
  return PROVIDER_LINKS[domain] ?? `https://${domain}`;
}

function unique(items: string[]) {
  return Array.from(new Set(items));
}

function normalizeName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getNameParts(value: string) {
  const parts = normalizeName(value).split(" ").filter(Boolean);
  const first = parts[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1] : "";
  const middle = parts.length > 2 ? parts.slice(1, -1).join("") : "";
  return {
    parts,
    first,
    last,
    middle,
    firstInitial: first[0] ?? "",
    lastInitial: last[0] ?? "",
  };
}

function buildLocalFormats(name: string) {
  const { parts, first, last, middle, firstInitial, lastInitial } = getNameParts(name);
  if (!first) return [];

  const joined = parts.join("");
  const dotted = parts.join(".");
  const underscored = parts.join("_");
  const dashed = parts.join("-");

  const formats = [
    { local: first, pattern: "nombre" },
    { local: joined, pattern: "nombreapellido" },
    { local: dotted, pattern: "nombre.apellido" },
    { local: underscored, pattern: "nombre_apellido" },
    { local: dashed, pattern: "nombre-apellido" },
  ];

  if (last) {
    formats.push(
      { local: `${first}.${last}`, pattern: "nombre.apellido" },
      { local: `${first}${last}`, pattern: "nombreapellido" },
      { local: `${first}_${last}`, pattern: "nombre_apellido" },
      { local: `${first}-${last}`, pattern: "nombre-apellido" },
      { local: `${firstInitial}${last}`, pattern: "inicialapellido" },
      { local: `${firstInitial}.${last}`, pattern: "inicial.apellido" },
      { local: `${first}.${lastInitial}`, pattern: "nombre.inicial" },
      { local: `${last}.${first}`, pattern: "apellido.nombre" },
      { local: `${last}${firstInitial}`, pattern: "apellidoinicial" },
      { local: `${last}_${first}`, pattern: "apellido_nombre" },
    );
  }

  if (middle && last) {
    formats.push(
      { local: `${first}.${middle}.${last}`, pattern: "nombre.segundo.apellido" },
      { local: `${first}${middle}${last}`, pattern: "nombresegundoapellido" },
      { local: `${firstInitial}${middle[0] ?? ""}${last}`, pattern: "inicialesapellido" },
    );
  }

  const seen = new Set<string>();
  return formats.filter((item) => {
    if (!item.local || seen.has(item.local)) return false;
    seen.add(item.local);
    return true;
  });
}

function buildGeneratedContacts(fullName: string, domains: string[]): GeneratedContact[] {
  const localFormats = buildLocalFormats(fullName);
  return domains.flatMap((domain) =>
    localFormats.map((item) => ({
      value: `${item.local}@${domain}`,
      pattern: item.pattern,
      domain,
    })),
  );
}

async function copyText(value: string) {
  await navigator.clipboard.writeText(value);
}

function downloadTxt(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function DomainProviderLauncher() {
  const [fullName, setFullName] = useState("Juan Perez");
  const [domainsText, setDomainsText] = useState(EXAMPLE_DOMAINS);
  const [copied, setCopied] = useState("");

  const domains = useMemo(() => {
    return unique(
      domainsText
        .split(/[\n,;\s]+/)
        .map(normalizeDomain)
        .filter((domain) => domain.includes(".") && !domain.startsWith(".")),
    );
  }, [domainsText]);

  const generatedContacts = useMemo(() => buildGeneratedContacts(fullName, domains), [fullName, domains]);

  const groupedContacts = useMemo(() => {
    return generatedContacts.reduce<Record<string, GeneratedContact[]>>((acc, item) => {
      acc[item.domain] = acc[item.domain] ?? [];
      acc[item.domain].push(item);
      return acc;
    }, {});
  }, [generatedContacts]);

  async function handleCopy(value: string, label: string) {
    await copyText(value);
    setCopied(label);
    window.setTimeout(() => setCopied(""), 1500);
  }

  const allGeneratedText = generatedContacts.map((item) => item.value).join("\n");

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/60 backdrop-blur">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.24em] text-sky-700">Admin Tools</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Mail Generator</h2>
            <p className="mt-2 max-w-3xl text-slate-500">
              Genera formatos de contacto usando únicamente dominios propios o autorizados. El botón de proveedor abre el sitio oficial de cada dominio.
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
            <span className="flex items-center gap-2"><ShieldCheck size={16} /> Dominios autorizados</span>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/60 backdrop-blur">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-2xl bg-sky-50 p-3 text-sky-700"><Sparkles size={20} /></div>
            <div>
              <h3 className="text-xl font-black text-slate-950">Datos base</h3>
              <p className="text-sm text-slate-500">Pega nombre y apellido, luego agrega dominios permitidos.</p>
            </div>
          </div>

          <div className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-500">Nombre y apellido</span>
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Ej. Juan Perez"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-semibold text-slate-900 outline-none transition focus:border-sky-300 focus:bg-white"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-500">Dominios autorizados</span>
              <textarea
                value={domainsText}
                onChange={(event) => setDomainsText(event.target.value)}
                rows={8}
                placeholder="empresa.com\ncliente-autorizado.mx"
                className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-semibold text-slate-900 outline-none transition focus:border-sky-300 focus:bg-white"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                disabled={!generatedContacts.length}
                onClick={() => handleCopy(allGeneratedText, "todos")}
                className="flex items-center justify-center gap-2 rounded-2xl bg-sky-600 px-4 py-3 font-black text-white shadow-lg shadow-sky-100 transition disabled:opacity-50"
              >
                <Copy size={16} /> Copiar todos
              </button>
              <button
                type="button"
                disabled={!generatedContacts.length}
                onClick={() => downloadTxt("formatos-contacto.txt", allGeneratedText)}
                className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-black text-slate-700 shadow-sm transition hover:bg-sky-50 disabled:opacity-50"
              >
                <FileText size={16} /> Exportar TXT
              </button>
            </div>

            {copied && <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700">Copiado: {copied}</p>}
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/60 backdrop-blur">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-black text-slate-950">Formatos generados</h3>
              <p className="text-sm text-slate-500">{generatedContacts.length} sugerencia{generatedContacts.length === 1 ? "" : "s"} disponibles.</p>
            </div>
            <div className="rounded-2xl bg-violet-50 p-3 text-violet-700"><Mail size={20} /></div>
          </div>

          {!generatedContacts.length ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
              <p className="font-black text-slate-700">Agrega un nombre y al menos un dominio válido.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {Object.entries(groupedContacts).map(([domain, items]) => (
                <div key={domain} className="rounded-3xl border border-slate-200 bg-white/70 p-4">
                  <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-black text-slate-950">@{domain}</p>
                      <p className="text-xs font-semibold text-slate-400">{items.length} formatos</p>
                    </div>
                    <a
                      href={getProviderUrl(domain)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-black text-sky-700 transition hover:bg-sky-100"
                    >
                      <ExternalLink size={15} /> Abrir proveedor
                    </a>
                  </div>

                  <div className="grid gap-2">
                    {items.map((item) => (
                      <div key={item.value} className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="break-all font-black text-slate-900">{item.value}</p>
                          <p className="text-xs font-semibold text-slate-400">Patrón: {item.pattern}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(item.value, item.value)}
                          className="flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-sky-50"
                        >
                          <Copy size={13} /> Copiar
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

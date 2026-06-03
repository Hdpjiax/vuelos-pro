"use client";

import { useMemo, useState } from "react";
import { Copy, ExternalLink, Globe2, ShieldCheck } from "lucide-react";

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

export function DomainProviderLauncher() {
  const [domainsText, setDomainsText] = useState(EXAMPLE_DOMAINS);
  const [copied, setCopied] = useState(false);

  const domains = useMemo(() => {
    return unique(
      domainsText
        .split(/[\n,;\s]+/)
        .map(normalizeDomain)
        .filter((domain) => domain.includes(".") && !domain.startsWith(".")),
    );
  }, [domainsText]);

  async function copyDomains() {
    await navigator.clipboard.writeText(domains.join("\n"));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/60 backdrop-blur">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.24em] text-sky-700">Admin Tools</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Mail Generator</h2>
            <p className="mt-2 max-w-3xl text-slate-500">
              Versión segura para trabajar solo con dominios propios o autorizados. Desde aquí puedes abrir el proveedor o sitio oficial de cada dominio.
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
            <div className="rounded-2xl bg-sky-50 p-3 text-sky-700"><Globe2 size={20} /></div>
            <div>
              <h3 className="text-xl font-black text-slate-950">Dominios</h3>
              <p className="text-sm text-slate-500">Agrega un dominio por línea o separado por comas.</p>
            </div>
          </div>

          <textarea
            value={domainsText}
            onChange={(event) => setDomainsText(event.target.value)}
            rows={12}
            placeholder="empresa.com\ncliente-autorizado.mx"
            className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-semibold text-slate-900 outline-none transition focus:border-sky-300 focus:bg-white"
          />

          <button
            type="button"
            disabled={!domains.length}
            onClick={copyDomains}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-600 px-4 py-3 font-black text-white shadow-lg shadow-sky-100 transition disabled:opacity-50"
          >
            <Copy size={16} /> Copiar dominios
          </button>

          {copied && <p className="mt-3 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700">Dominios copiados.</p>}
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/60 backdrop-blur">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-black text-slate-950">Proveedores detectados</h3>
              <p className="text-sm text-slate-500">{domains.length} dominio{domains.length === 1 ? "" : "s"} disponibles.</p>
            </div>
            <div className="rounded-2xl bg-violet-50 p-3 text-violet-700"><ExternalLink size={20} /></div>
          </div>

          {!domains.length ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
              <p className="font-black text-slate-700">Agrega al menos un dominio válido.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {domains.map((domain) => (
                <div key={domain} className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white/70 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="break-all text-lg font-black text-slate-950">{domain}</p>
                    <p className="text-xs font-semibold text-slate-400">Destino: {getProviderUrl(domain)}</p>
                  </div>
                  <a
                    href={getProviderUrl(domain)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex shrink-0 items-center justify-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-black text-sky-700 transition hover:bg-sky-100"
                  >
                    <ExternalLink size={15} /> Abrir proveedor
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

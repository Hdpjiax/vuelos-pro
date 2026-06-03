"use client";

import { useState } from "react";
import { Mail, Search, Copy, CheckCheck, Trash2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const EMAIL_DOMAINS = [
  { domain: "gmail.com",       label: "Gmail",         color: "from-red-400 to-orange-400",    verifyUrl: "https://accounts.google.com" },
  { domain: "yahoo.com",       label: "Yahoo",         color: "from-violet-500 to-purple-600", verifyUrl: "https://login.yahoo.com" },
  { domain: "outlook.com",     label: "Outlook",       color: "from-blue-500 to-sky-500",      verifyUrl: "https://outlook.live.com" },
  { domain: "hotmail.com",     label: "Hotmail",       color: "from-blue-400 to-cyan-500",     verifyUrl: "https://outlook.live.com" },
  { domain: "icloud.com",      label: "iCloud",        color: "from-slate-400 to-slate-600",   verifyUrl: "https://www.icloud.com/mail" },
  { domain: "protonmail.com",  label: "ProtonMail",    color: "from-purple-500 to-indigo-600", verifyUrl: "https://account.proton.me" },
  { domain: "live.com",        label: "Live",          color: "from-sky-400 to-blue-500",      verifyUrl: "https://outlook.live.com" },
  { domain: "me.com",          label: "Me (Apple)",    color: "from-zinc-400 to-slate-500",    verifyUrl: "https://www.icloud.com/mail" },
  { domain: "aol.com",         label: "AOL",           color: "from-amber-400 to-yellow-500",  verifyUrl: "https://login.aol.com" },
  { domain: "zoho.com",        label: "Zoho",          color: "from-orange-500 to-red-500",    verifyUrl: "https://accounts.zoho.com" },
  { domain: "gmx.com",         label: "GMX",           color: "from-teal-500 to-green-500",    verifyUrl: "https://www.gmx.com" },
  { domain: "mail.com",        label: "Mail.com",      color: "from-emerald-400 to-teal-500",  verifyUrl: "https://www.mail.com" },
  { domain: "tutanota.com",    label: "Tuta",          color: "from-lime-500 to-green-600",    verifyUrl: "https://app.tuta.com" },
  { domain: "yandex.com",      label: "Yandex",        color: "from-red-500 to-rose-600",      verifyUrl: "https://mail.yandex.com" },
  { domain: "fastmail.com",    label: "Fastmail",      color: "from-indigo-500 to-violet-600", verifyUrl: "https://app.fastmail.com" },
  { domain: "msn.com",         label: "MSN",           color: "from-blue-600 to-indigo-600",   verifyUrl: "https://outlook.live.com" },
];

function generateEmails(input: string): string[] {
  const clean = input
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return [];
  const [first = "", last = ""] = parts;
  const patterns: string[] = [];
  if (first && last) {
    patterns.push(`${first}.${last}`);
    patterns.push(`${first}${last}`);
    patterns.push(`${first}_${last}`);
    patterns.push(`${last}.${first}`);
    patterns.push(`${first}${last[0]}`);
    patterns.push(`${first[0]}${last}`);
    patterns.push(`${first[0]}.${last}`);
    patterns.push(`${first}.${last[0]}`);
  } else if (first) {
    patterns.push(first);
    patterns.push(`${first}1`);
    patterns.push(`${first}2024`);
  }
  const results: string[] = [];
  for (const { domain } of EMAIL_DOMAINS) {
    for (const pattern of patterns) {
      results.push(`${pattern}@${domain}`);
    }
  }
  return results;
}

export function EmailGenerator() {
  const [input, setInput] = useState("");
  const [emails, setEmails] = useState<string[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [generated, setGenerated] = useState(false);

  function handleGenerate() {
    if (!input.trim()) return;
    setEmails(generateEmails(input));
    setGenerated(true);
  }

  async function handleCopy(email: string) {
    await navigator.clipboard.writeText(email);
    setCopied(email);
    setTimeout(() => setCopied(null), 1800);
  }

  function handleVerify(email: string) {
    const domain = email.split("@")[1];
    const found = EMAIL_DOMAINS.find((d) => d.domain === domain);
    if (found) window.open(found.verifyUrl, "_blank");
  }

  function handleClear() {
    setInput("");
    setEmails([]);
    setGenerated(false);
  }

  const grouped = EMAIL_DOMAINS.map(({ domain, label, color, verifyUrl }) => ({
    domain, label, color, verifyUrl,
    emails: emails.filter((e) => e.endsWith(`@${domain}`)),
  })).filter((g) => g.emails.length > 0);

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-violet-600 text-white shadow-lg">
          <Mail size={22} />
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">Mail Generator</h2>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
            Genera combinaciones de correos a partir de un nombre
          </p>
        </div>
      </div>

      {/* ── Input card ── */}
      <div
        className="rounded-3xl border-2 border-slate-300 p-5 shadow-md dark:border-white/10 dark:bg-slate-800"
        style={{ backgroundColor: "#ffffff" }}
      >
        {/* Label */}
        <label
          htmlFor="email-gen-input"
          className="mb-2 block text-sm font-bold dark:text-slate-200"
          style={{ color: "#1e293b" }}
        >
          Nombre completo
        </label>

        <div className="flex gap-3">
          {/* Input */}
          <input
            id="email-gen-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
            placeholder="Ej: Juan García"
            className="flex-1 rounded-2xl border-2 px-4 py-3 text-sm font-semibold shadow-sm outline-none focus:ring-2 focus:ring-sky-300 dark:border-white/10 dark:bg-slate-700 dark:text-white dark:placeholder:text-slate-400 dark:focus:border-cyan-400"
            style={{
              backgroundColor: "#f1f5f9",
              color: "#0f172a",
              borderColor: "#94a3b8",
            }}
          />

          {/* Boton generar */}
          <button
            onClick={handleGenerate}
            className="flex shrink-0 items-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 to-violet-500 px-5 py-3 text-sm font-black text-white shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl"
          >
            <Sparkles size={16} />
            Generar
          </button>

          {/* Boton limpiar */}
          {generated && (
            <button
              onClick={handleClear}
              className="flex shrink-0 items-center justify-center rounded-2xl border-2 border-rose-300 bg-rose-50 px-4 py-3 text-rose-600 transition-all hover:bg-rose-500 hover:text-white dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-300"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>

        {generated && (
          <p
            className="mt-2 text-xs font-semibold dark:text-slate-400"
            style={{ color: "#475569" }}
          >
            {emails.length} correos generados en {EMAIL_DOMAINS.length} dominios
          </p>
        )}
      </div>

      {/* ── Resultados por dominio ── */}
      {grouped.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {grouped.map(({ domain, label, color, verifyUrl, emails: domainEmails }) => (
            <div
              key={domain}
              className="rounded-3xl border-2 border-slate-200 p-4 shadow-md dark:border-white/10 dark:bg-slate-800"
              style={{ backgroundColor: "#ffffff" }}
            >
              {/* Domain header */}
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn("h-2.5 w-2.5 shrink-0 rounded-full bg-gradient-to-br", color)} />
                  <span
                    className="text-sm font-black dark:text-white"
                    style={{ color: "#1e293b" }}
                  >
                    {label}
                  </span>
                  <span
                    className="text-xs font-semibold dark:text-slate-400"
                    style={{ color: "#64748b" }}
                  >
                    @{domain}
                  </span>
                </div>
                <button
                  onClick={() => window.open(verifyUrl, "_blank")}
                  title={`Verificar en ${label}`}
                  className="flex items-center gap-1 rounded-xl border border-slate-300 bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-700 transition-all hover:border-sky-400 hover:bg-sky-50 hover:text-sky-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
                >
                  <Search size={11} />
                  Verificar
                </button>
              </div>

              {/* Email rows */}
              <div className="space-y-1.5">
                {domainEmails.map((email) => (
                  <div
                    key={email}
                    className="group flex items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2 dark:border-white/5 dark:bg-slate-700"
                    style={{ backgroundColor: "#f1f5f9" }}
                  >
                    <span
                      className="truncate text-[12px] font-semibold dark:text-slate-200"
                      style={{ color: "#1e293b" }}
                    >
                      {email}
                    </span>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        onClick={() => handleCopy(email)}
                        title="Copiar"
                        className="rounded-lg p-1 text-slate-500 transition-all hover:bg-sky-100 hover:text-sky-600 dark:text-slate-400 dark:hover:bg-cyan-400/10 dark:hover:text-cyan-300"
                      >
                        {copied === email
                          ? <CheckCheck size={13} className="text-green-600" />
                          : <Copy size={13} />}
                      </button>
                      <button
                        onClick={() => handleVerify(email)}
                        title="Ir al proveedor"
                        className="rounded-lg p-1 text-slate-500 transition-all hover:bg-violet-100 hover:text-violet-600 dark:text-slate-400 dark:hover:bg-violet-400/10 dark:hover:text-violet-300"
                      >
                        <Search size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Empty state ── */}
      {!generated && (
        <div
          className="flex flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-slate-300 py-16 text-center dark:border-white/10 dark:bg-slate-800/50"
          style={{ backgroundColor: "#f8fafc" }}
        >
          <Mail size={36} className="text-slate-400" />
          <p
            className="text-sm font-bold dark:text-slate-400"
            style={{ color: "#475569" }}
          >
            Escribe un nombre y presiona{" "}
            <span className="text-sky-600 dark:text-sky-400">Generar</span>
          </p>
          <p
            className="text-xs font-semibold dark:text-slate-500"
            style={{ color: "#64748b" }}
          >
            Genera combinaciones para {EMAIL_DOMAINS.length} dominios populares
          </p>
        </div>
      )}
    </div>
  );
}

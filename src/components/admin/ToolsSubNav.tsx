"use client";

import Link from "next/link";
import { Wrench, Mail, MapPin, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

const tools = [
  { slug: "mail-generator",    label: "Mail Generator",    icon: <Mail size={15} /> },
  { slug: "address-generator", label: "Address Generator", icon: <MapPin size={15} /> },
  { slug: "bin-checker",       label: "BIN Checker",       icon: <CreditCard size={15} /> },
];

export function ToolsSubNav({ active }: { active: string }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1.5 rounded-2xl border border-slate-300 bg-slate-100 px-3 py-2 text-xs font-black uppercase tracking-widest text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-sky-200/70">
        <Wrench size={13} className="text-sky-500 dark:text-cyan-400" />
        Tools
      </div>
      {tools.map((tool) => (
        <Link
          key={tool.slug}
          href={`/admin/tools/${tool.slug}`}
          className={cn(
            "flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-bold transition-all hover:-translate-y-0.5",
            active === tool.slug
              ? "border-transparent bg-gradient-to-r from-sky-400 to-violet-500 text-white shadow-lg shadow-sky-200/60 dark:shadow-cyan-950/30"
              : "border-slate-300 bg-slate-100 text-slate-700 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-cyan-400/10 dark:hover:text-cyan-200"
          )}
        >
          {tool.icon}
          {tool.label}
        </Link>
      ))}
    </div>
  );
}

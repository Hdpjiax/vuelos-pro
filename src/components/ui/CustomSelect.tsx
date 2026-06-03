"use client";

import { useState, type ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";

export type CustomSelectOption = {
  value: string;
  label: string;
  helper?: string;
  disabled?: boolean;
};

type CustomSelectProps = {
  name?: string;
  label?: string;
  value: string;
  options: CustomSelectOption[];
  onChange: (value: string) => void;
  required?: boolean;
  icon?: ReactNode;
  placeholder?: string;
  className?: string;
};

export function CustomSelect({
  name,
  label,
  value,
  options,
  onChange,
  required,
  icon,
  placeholder = "Selecciona una opción",
  className = "",
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);
  const display = selected?.label || placeholder;

  return (
    <div className={`relative min-w-0 ${className}`}>
      {name ? <input type="hidden" name={name} value={value} required={required} /> : null}
      {label ? (
        <label className="mb-2 flex items-center gap-1 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
          {icon}
          {label}
        </label>
      ) : null}
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        onBlur={() => window.setTimeout(() => setOpen(false), 140)}
        className="app-custom-select flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={`min-w-0 truncate ${selected ? "" : "text-slate-400"}`}>{display}</span>
        <ChevronDown size={16} className={`shrink-0 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div className="app-custom-select-menu absolute left-0 top-full z-[90] mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-2xl" role="listbox">
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value || "empty"}
                type="button"
                disabled={option.disabled}
                onMouseDown={(event) => {
                  event.preventDefault();
                  if (option.disabled) return;
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`app-custom-select-option flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold transition ${isSelected ? "is-selected" : ""} ${option.disabled ? "is-disabled cursor-not-allowed opacity-50" : "hover:bg-sky-50"}`}
                role="option"
                aria-selected={isSelected}
              >
                <span className="min-w-0">
                  <span className="block truncate">{option.label}</span>
                  {option.helper ? <span className="block text-[11px] font-semibold opacity-70">{option.helper}</span> : null}
                </span>
                {isSelected ? <Check size={15} className="shrink-0" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

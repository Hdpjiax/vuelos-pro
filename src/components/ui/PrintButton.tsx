"use client";

import { Printer } from "lucide-react";
import { buttonSecondarySmall } from "@/lib/styles";

export function PrintButton({ label = "Imprimir / PDF" }: { label?: string }) {
  return (
    <button type="button" className={buttonSecondarySmall} onClick={() => window.print()}>
      <Printer size={16} /> {label}
    </button>
  );
}

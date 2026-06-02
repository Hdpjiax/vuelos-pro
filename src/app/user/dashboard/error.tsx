"use client";

import { ErrorState } from "@/components/ui/ErrorState";
import { useEffect } from "react";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function DashboardError({ error, reset }: Props) {
  useEffect(() => {
    console.error("Error en dashboard:", error);
  }, [error]);

  return (
    <div className="p-6">
      <ErrorState
        title="No se pudo cargar el resumen"
        message="Ocurrió un error al obtener tus datos. Puedes intentar de nuevo."
      />
      <div className="mt-4 flex justify-center">
        <button
          onClick={reset}
          className="rounded-2xl bg-cyan-500 px-5 py-2.5 text-sm font-black text-white transition hover:bg-cyan-400 active:scale-95"
        >
          Intentar de nuevo
        </button>
      </div>
    </div>
  );
}
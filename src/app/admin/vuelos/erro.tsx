"use client";

import { ErrorState } from "@/components/ui/ErrorState";
import { useEffect } from "react";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AdminVuelosError({ error, reset }: Props) {
  useEffect(() => {
    console.error("Error en admin/vuelos:", error);
  }, [error]);

  return (
    <div className="p-6">
      <ErrorState
        title="Error al cargar vuelos"
        message="No se pudo obtener la lista de vuelos. Verifica la conexión o intenta de nuevo."
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
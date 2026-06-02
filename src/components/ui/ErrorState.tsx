import { AlertTriangle } from "lucide-react";

type Props = {
  title?: string;
  message?: string;
};

export function ErrorState({
  title = "Algo salió mal",
  message = "No se pudo cargar la información. Intenta recargar la página.",
}: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-6 py-10 text-center text-white">
      <AlertTriangle size={32} className="text-red-400" />
      <p className="text-base font-black">{title}</p>
      <p className="text-sm text-sky-100/70">{message}</p>
    </div>
  );
}
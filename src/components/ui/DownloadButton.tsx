"use client";

import { useState } from "react";
import { Download, Loader2, CheckCircle2 } from "lucide-react";

type DownloadButtonProps = {
  href: string;
  filename?: string;
  className?: string;
  children?: React.ReactNode;
};

export function DownloadButton({
  href,
  filename,
  className,
  children,
}: DownloadButtonProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function handleDownload() {
    if (status === "loading") return;
    setStatus("loading");

    try {
      const res = await fetch(href);
      if (!res.ok) throw new Error(`Error ${res.status}`);

      const blob = await res.blob();
      const contentDisposition = res.headers.get("content-disposition");
      const serverFilename = contentDisposition
        ?.split("filename=")[1]
        ?.replace(/"/g, "")
        ?.trim();

      const name = filename || serverFilename || "export.csv";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setStatus("done");
      setTimeout(() => setStatus("idle"), 2500);
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 2500);
    }
  }

  const isLoading = status === "loading";
  const isDone = status === "done";
  const isError = status === "error";

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={isLoading}
      className={`${className} inline-flex items-center gap-2 transition active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed`}
    >
      {isLoading ? (
        <>
          <Loader2 size={15} className="animate-spin shrink-0" />
          Descargando...
        </>
      ) : isDone ? (
        <>
          <CheckCircle2 size={15} className="shrink-0 text-emerald-500" />
          Descargado
        </>
      ) : isError ? (
        <>
          <Download size={15} className="shrink-0 text-rose-500" />
          Error, reintentar
        </>
      ) : (
        <>
          <Download size={15} className="shrink-0" />
          {children ?? "Exportar CSV"}
        </>
      )}
    </button>
  );
}
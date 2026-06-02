import JSZip from "jszip";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { formatFlightFolio } from "@/lib/utils";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return new NextResponse("No autenticado", { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return new NextResponse("No autorizado", { status: 403 });

  const [{ data: flight }, { data: attachments }] = await Promise.all([
    supabase.from("flights").select("id, flight_folio").eq("id", id).single(),
    supabase
      .from("flight_attachments")
      .select("file_path, file_name, category")
      .eq("flight_id", id)
      .order("created_at", { ascending: true }),
  ]);

  if (!flight) return new NextResponse("Vuelo no encontrado", { status: 404 });

  const zip = new JSZip();
  const usedNames = new Set<string>();

  for (const attachment of attachments ?? []) {
    if (!attachment.file_path) continue;
    const { data } = await supabase.storage.from("flight-files").download(attachment.file_path);
    if (!data) continue;

    const category = attachment.category || "otro";
    const safeName = String(attachment.file_name || "archivo").replace(/[\\/:*?"<>|]/g, "-");
    let name = `${category}/${safeName}`;
    let counter = 2;
    while (usedNames.has(name)) {
      name = `${category}/${counter}-${safeName}`;
      counter += 1;
    }
    usedNames.add(name);

    const buffer = await data.arrayBuffer();
    zip.file(name, buffer);
  }

  if (!usedNames.size) {
    zip.file("sin-archivos.txt", "Este vuelo no tiene archivos disponibles para descargar.");
  }

  const content = await zip.generateAsync({ type: "uint8array" });
  const folio = formatFlightFolio(flight).replace(/[^a-zA-Z0-9._-]/g, "-");

  return new NextResponse(Buffer.from(content), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${folio}-archivos.zip"`,
      "Cache-Control": "no-store",
    },
  });
}

import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ bin: string }> }
) {
  const { bin } = await params;

  // Validar: solo dígitos, 6-8 chars
  if (!/^\d{6,8}$/.test(bin)) {
    return NextResponse.json({ error: "BIN inválido" }, { status: 400 });
  }

  try {
    const res = await fetch(`https://lookup.binlist.net/${bin}`, {
      headers: {
        "Accept-Version": "3",
        "Accept": "application/json",
      },
      // No cache para siempre obtener datos frescos
      cache: "no-store",
    });

    if (res.status === 404) {
      return NextResponse.json({ error: "BIN no encontrado en la base de datos." }, { status: 404 });
    }
    if (res.status === 429) {
      return NextResponse.json({ error: "Límite de consultas alcanzado. Espera unos segundos." }, { status: 429 });
    }
    if (!res.ok) {
      return NextResponse.json({ error: `Error ${res.status} al consultar el BIN.` }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Error de red al consultar el BIN." }, { status: 500 });
  }
}

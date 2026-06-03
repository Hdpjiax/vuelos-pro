import { NextRequest, NextResponse } from 'next/server';
import { mockSearchFlights, mockSearchAirports } from '@/lib/flights-mock';

// Cuando tengas API key real, importa y reemplaza las funciones mock por las de @/lib/amadeus

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const mode = searchParams.get('mode');

  if (mode === 'airports') {
    const keyword = searchParams.get('keyword') ?? '';
    if (keyword.length < 2) return NextResponse.json({ data: [] });
    return NextResponse.json(mockSearchAirports(keyword));
  }

  const origin = searchParams.get('origin');
  const destination = searchParams.get('destination');
  const departureDate = searchParams.get('departureDate');
  const returnDate = searchParams.get('returnDate') ?? undefined;
  const adults = Number(searchParams.get('adults') ?? '1');

  if (!origin || !destination || !departureDate) {
    return NextResponse.json({ error: 'Faltan parámetros requeridos' }, { status: 400 });
  }

  try {
    const data = mockSearchFlights({ origin, destination, departureDate, returnDate, adults });
    return NextResponse.json(data);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error desconocido';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

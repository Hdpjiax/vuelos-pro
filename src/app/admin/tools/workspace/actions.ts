"use server";

import { createClient } from "@/lib/supabase/server";
import type { WorkspaceLabel } from "@/components/admin/WorkspaceNoteModal";

// ── BIN lookup ─────────────────────────────────────────────────────────────────────
export async function lookupBinAction(bin: string): Promise<{
  bank: string;
  scheme: string;
  country: string;
} | null> {
  try {
    const res = await fetch(`https://lookup.binlist.net/${bin}`, {
      headers: { "Accept-Version": "3" },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      bank: data.bank?.name ?? "Banco desconocido",
      scheme: data.scheme ?? "",
      country: data.country?.name ?? "",
    };
  } catch {
    return null;
  }
}

function escapeSearch(value: string) {
  return value.trim().replace(/[,%_]/g, " ").replace(/\s+/g, " ");
}

function flightDateValue(flight: any) {
  const value = flight?.flight_date ? new Date(flight.flight_date).getTime() : 0;
  return Number.isFinite(value) ? value : 0;
}

// ── Buscar vuelos ───────────────────────────────────────────────────────────────────
export async function searchFlightsAction(query: string) {
  const supabase = await createClient();
  const q = escapeSearch(query);

  if (q.length < 2) return [];

  const selectFlightFields = "id, flight_folio, flight_date, return_flight_date, flight_time, flight_type, fare_type, total_amount, user_id, passengers";

  const { data: matchedProfiles } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .or(`full_name.ilike.%${q}%,email.ilike.%${q}%`)
    .limit(25);

  const matchedUserIds = [...new Set((matchedProfiles ?? []).map((profile: any) => profile.id).filter(Boolean))];

  const [{ data: folioFlights }, { data: userFlights }] = await Promise.all([
    supabase
      .from("flights")
      .select(selectFlightFields)
      .ilike("flight_folio", `%${q}%`)
      .order("flight_date", { ascending: false })
      .limit(25),
    matchedUserIds.length
      ? supabase
          .from("flights")
          .select(selectFlightFields)
          .in("user_id", matchedUserIds)
          .order("flight_date", { ascending: false })
          .limit(25)
      : Promise.resolve({ data: [] }),
  ]);

  const flightMap = new Map<string, any>();
  for (const flight of [...(folioFlights ?? []), ...(userFlights ?? [])]) {
    if (flight?.id) flightMap.set(flight.id, flight);
  }

  const flights = Array.from(flightMap.values())
    .sort((a, b) => flightDateValue(b) - flightDateValue(a))
    .slice(0, 25);

  if (!flights.length) return [];

  const userIds = [...new Set(flights.map((f: any) => f.user_id).filter(Boolean))];
  const profileEntries = (matchedProfiles ?? []).map((profile: any): [string, any] => [profile.id, profile]);
  const existingProfiles = new Map<string, any>(profileEntries);
  const missingUserIds = userIds.filter((id) => !existingProfiles.has(id));

  let extraProfiles: any[] = [];
  if (missingUserIds.length) {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", missingUserIds);
    extraProfiles = data ?? [];
  }

  const extraProfileEntries = extraProfiles.map((profile: any): [string, any] => [profile.id, profile]);
  const profileMap = new Map<string, any>([...Array.from(existingProfiles.entries()), ...extraProfileEntries]);

  return flights.map((flight: any) => {
    const profile = profileMap.get(flight.user_id) ?? null;
    return {
      ...flight,
      profiles: profile,
      search_label: `${flight.flight_folio ?? flight.id} · ${profile?.full_name ?? "Usuario"} · ${profile?.email ?? "Sin correo"}`,
    };
  });
}

// ── Guardar nota ─────────────────────────────────────────────────────────────────────
export async function saveWorkspaceNoteAction(data: {
  flight_id: string | null;
  cc_number: string | null;
  cc_holder: string | null;
  cc_address: string | null;
  cc_bank: string | null;
  cc_charge_date: string | null;
  site_url: string | null;
  label: WorkspaceLabel;
  content: string;
}): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado." };

  const { error } = await supabase.from("workspace_notes").insert({
    admin_id: user.id,
    flight_id: data.flight_id,
    cc_number: data.cc_number,
    cc_holder: data.cc_holder,
    cc_address: data.cc_address,
    cc_bank: data.cc_bank,
    cc_charge_date: data.cc_charge_date,
    site_url: data.site_url,
    label: data.label,
    content: data.content,
  });

  return error ? { error: error.message } : {};
}

// ── Obtener notas ─────────────────────────────────────────────────────────────────────
export async function getWorkspaceNotesAction(opts?: { label?: string; search?: string }) {
  const supabase = await createClient();

  let q = supabase
    .from("workspace_notes")
    .select("id, flight_id, cc_number, cc_holder, cc_address, cc_bank, cc_charge_date, site_url, label, content, created_at, admin_id, flights(id, flight_folio, flight_date, return_flight_date, flight_type, fare_type, total_amount, passengers)")
    .order("created_at", { ascending: false })
    .limit(80);

  if (opts?.label && opts.label !== "todas") q = q.eq("label", opts.label);

  const { data, error } = await q;
  if (error) return [];

  const search = opts?.search?.trim().toLowerCase() ?? "";
  if (!search) return data;

  return data.filter((n: any) => [
    n.content, n.cc_number, n.cc_holder, n.cc_bank, n.site_url,
    (n.flights as any)?.[0]?.flight_folio ?? (n.flights as any)?.flight_folio,
  ].filter(Boolean).join(" ").toLowerCase().includes(search));
}

// ── Eliminar nota ─────────────────────────────────────────────────────────────────────
export async function deleteWorkspaceNoteAction(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("workspace_notes").delete().eq("id", id);
  return error ? { error: error.message } : {};
}

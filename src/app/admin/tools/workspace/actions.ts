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
      next: { revalidate: 86400 }, // cache 24h por BIN
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      bank:    data.bank?.name    ?? "Banco desconocido",
      scheme:  data.scheme        ?? "",
      country: data.country?.name ?? "",
    };
  } catch {
    return null;
  }
}

// ── Buscar vuelos ───────────────────────────────────────────────────────────────────
export async function searchFlightsAction(query: string) {
  const supabase = await createClient();
  const q = query.trim().toLowerCase();

  const { data: flights } = await supabase
    .from("flights")
    .select("id, flight_folio, flight_date, return_flight_date, flight_time, flight_type, fare_type, total_amount, user_id, passengers")
    .or(`flight_folio.ilike.%${q}%`)
    .order("flight_date", { ascending: false })
    .limit(20);

  if (!flights?.length) return [];

  const userIds = [...new Set(flights.map((f: any) => f.user_id).filter(Boolean))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("id", userIds);

  const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
  return flights.map((f: any) => ({ ...f, profiles: profileMap.get(f.user_id) ?? null }));
}

// ── Guardar nota ─────────────────────────────────────────────────────────────────────
export async function saveWorkspaceNoteAction(data: {
  flight_id:      string | null;
  cc_number:      string | null;
  cc_holder:      string | null;
  cc_address:     string | null;
  cc_bank:        string | null;
  cc_charge_date: string | null;
  site_url:       string | null;
  label:          WorkspaceLabel;
  content:        string;
}): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado." };

  const { error } = await supabase.from("workspace_notes").insert({
    admin_id:       user.id,
    flight_id:      data.flight_id,
    cc_number:      data.cc_number,
    cc_holder:      data.cc_holder,
    cc_address:     data.cc_address,
    cc_bank:        data.cc_bank,
    cc_charge_date: data.cc_charge_date,
    site_url:       data.site_url,
    label:          data.label,
    content:        data.content,
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

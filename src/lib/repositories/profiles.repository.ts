import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "@/lib/types";

// Perfil del usuario autenticado actual
export async function getMyProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw new Error(`getMyProfile: ${error.message}`);
  return data;
}

// Todos los perfiles (admin)
export async function getAllProfiles(
  supabase: SupabaseClient
): Promise<Profile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("full_name", { ascending: true });

  if (error) throw new Error(`getAllProfiles: ${error.message}`);
  return data ?? [];
}

// Solo admins
export async function getAdminProfiles(
  supabase: SupabaseClient
): Promise<Pick<Profile, "id" | "full_name" | "email">[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("role", "admin");

  if (error) throw new Error(`getAdminProfiles: ${error.message}`);
  return data ?? [];
}
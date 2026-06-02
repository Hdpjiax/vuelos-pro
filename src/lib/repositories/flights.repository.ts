import type { SupabaseClient } from "@supabase/supabase-js";
import type { Flight } from "@/lib/types";

// Todos los vuelos de un usuario
export async function getUserFlights(
    supabase: SupabaseClient,
    userId: string
): Promise<Flight[]> {
    const { data, error } = await supabase
        .from("flights")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

    if (error) throw new Error(`getUserFlights: ${error.message}`);
    return data ?? [];
}

// Un vuelo por ID (verifica que pertenezca al usuario)
export async function getUserFlightById(
    supabase: SupabaseClient,
    flightId: string,
    userId: string
): Promise<Flight | null> {
    const { data, error } = await supabase
        .from("flights")
        .select("*")
        .eq("id", flightId)
        .eq("user_id", userId)
        .maybeSingle();

    if (error) throw new Error(`getUserFlightById: ${error.message}`);
    return data;
}

// Todos los vuelos (admin)
export async function getAllFlights(
    supabase: SupabaseClient
): Promise<Flight[]> {
    const { data, error } = await supabase
        .from("flights")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) throw new Error(`getAllFlights: ${error.message}`);
    return data ?? [];
}

// Un vuelo por ID sin restricción de usuario (admin)
export async function getFlightById(
    supabase: SupabaseClient,
    flightId: string
): Promise<Flight | null> {
    const { data, error } = await supabase
        .from("flights")
        .select("*")
        .eq("id", flightId)
        .maybeSingle();

    if (error) throw new Error(`getFlightById: ${error.message}`);
    return data;
}
// Filtros opcionales para la página de vuelos del usuario
export type UserFlightsFilter = {
    status?: string;
    from?: string;
    to?: string;
};
export type FlightListItem = Pick<
    Flight,
    | "id"
    | "flight_folio"
    | "flight_type"
    | "flight_date"
    | "flight_time"
    | "return_flight_date"
    | "return_flight_time"
    | "passengers"
    | "fare_type"
    | "total_amount"
    | "payment_percentage"
    | "amount_to_pay"
    | "status"
    | "created_at"
>;
export async function getUserFlightsFiltered(
    supabase: SupabaseClient,
    userId: string,
    filters: UserFlightsFilter = {}
): Promise<FlightListItem[]> {
    let query = supabase
        .from("flights")
        .select("id, flight_folio, flight_type, flight_date, flight_time, return_flight_date, return_flight_time, passengers, fare_type, total_amount, payment_percentage, amount_to_pay, status, created_at")
        .eq("user_id", userId)
        .order("flight_date", { ascending: false })
        .order("created_at", { ascending: false });

    if (filters.status && filters.status !== "todos") {
        query = query.eq("status", filters.status);
    }
    if (filters.from) query = query.gte("flight_date", filters.from);
    if (filters.to) query = query.lte("flight_date", filters.to);

    const { data, error } = await query;
    if (error) throw new Error(`getUserFlightsFiltered: ${error.message}`);
    return (data ?? []) as FlightListItem[];
}
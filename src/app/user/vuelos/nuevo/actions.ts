"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { buildFlightCreatedAdminMessage, logFlightAction, notifyAdmins } from "@/lib/flight-operations";
import { createFlightSchema, passengerSchema } from "@/lib/schemas";
import { slugFileName } from "@/lib/storage";

export type FlightFormState = {
  error?: string;
};

export async function createFlightAction(
  _previousState: FlightFormState,
  formData: FormData
): Promise<FlightFormState> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Tu sesión expiró. Inicia sesión nuevamente." };

  // ✅ Validación con Zod — reemplaza todos los cleanText/cleanMoney manuales
  const parsed = createFlightSchema.safeParse({
    flight_type: formData.get("flight_type"),
    flight_date: formData.get("flight_date"),
    flight_time: formData.get("flight_time"),
    return_flight_date: formData.get("return_flight_date") ?? "",
    return_flight_time: formData.get("return_flight_time") ?? "",
    fare_type: formData.get("fare_type"),
    total_amount: formData.get("total_amount"),
    notes: formData.get("notes") ?? "",
    checked_bags: formData.get("checked_bags") ?? "0",
    carry_on_bags: formData.get("carry_on_bags") ?? "0",
    seats: formData.get("seats") ?? "0",
    other_extras: formData.get("other_extras") ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los datos del formulario." };
  }

  const data = parsed.data;

  // ✅ Pasajeros validados con Zod
  const passengerNames = formData.getAll("passenger_full_name").map((v) => String(v).trim());
  const passengerDocuments = formData.getAll("passenger_document").map((v) => String(v).trim());
  const passengerPhones = formData.getAll("passenger_phone").map((v) => String(v).trim());
  const passengerBirthDates = formData.getAll("passenger_birth_date").map((v) => String(v).trim());
  const passengerNationalities = formData.getAll("passenger_nationality").map((v) => String(v).trim());

  const passengers = passengerNames
    .flatMap((full_name, i) => {
      const result = passengerSchema.safeParse({
        full_name,
        document: passengerDocuments[i] ?? "",
        phone: passengerPhones[i] ?? "",
        birth_date: passengerBirthDates[i] ?? "",
        nationality: passengerNationalities[i] ?? "",
      });
      return result.success ? [result.data] : [];
    });

  if (passengers.length === 0) {
    return { error: "Agrega al menos un pasajero con nombre válido." };
  }

  // Validación de imagen (File — no aplica Zod)
  const image = formData.get("flight_image");
  if (!(image instanceof File) || image.size === 0) return { error: "Sube una foto o captura del vuelo." };
  if (!image.type.startsWith("image/")) return { error: "El archivo del vuelo debe ser una imagen." };
  if (image.size > 5 * 1024 * 1024) return { error: "La imagen no puede pesar más de 5 MB." };

  const filePath = `${user.id}/flights/${crypto.randomUUID()}-${slugFileName(image.name)}`;

  const { error: uploadError } = await supabase.storage
    .from("flight-files")
    .upload(filePath, image, { cacheControl: "3600", upsert: false, contentType: image.type });

  if (uploadError) return { error: `No se pudo subir la imagen: ${uploadError.message}` };

  const extras = {
    checked_bags: data.checked_bags,
    carry_on_bags: data.carry_on_bags,
    seats: data.seats,
    other: data.other_extras,
    notes: data.notes,
  };

  const { data: flight, error: flightError } = await supabase
    .from("flights")
    .insert({
      user_id: user.id,
      flight_type: data.flight_type,
      flight_date: data.flight_date,
      flight_time: data.flight_time,
      return_flight_date: data.flight_type === "redondo" ? data.return_flight_date : null,
      return_flight_time: data.flight_type === "redondo" ? data.return_flight_time : null,
      passengers,
      fare_type: data.fare_type,
      total_amount: data.total_amount,
      payment_percentage: 100,
      amount_to_pay: data.total_amount,
      extras,
      flight_image_path: filePath,
      status: "pendiente_revision",
    })
    .select("id")
    .single();

  if (flightError || !flight) {
    await supabase.storage.from("flight-files").remove([filePath]);
    return { error: `No se pudo registrar el vuelo: ${flightError?.message ?? "error desconocido"}` };
  }

  await supabase.from("flight_attachments").insert({
    flight_id: flight.id,
    uploaded_by: user.id,
    file_path: filePath,
    file_name: image.name,
    file_type: image.type,
    category: "vuelo",
  });

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("id", user.id)
    .maybeSingle();

  const createdFlight = {
    id: flight.id,
    user_id: user.id,
    flight_type: data.flight_type,
    flight_date: data.flight_date,
    flight_time: data.flight_time,
    return_flight_date: data.flight_type === "redondo" ? (data.return_flight_date ?? null) : null,
    return_flight_time: data.flight_type === "redondo" ? (data.return_flight_time ?? null) : null,
    passengers,
    fare_type: data.fare_type,
    total_amount: data.total_amount,
    status: "pendiente_revision" as const,
  };

  await notifyAdmins(supabase, {
    flight_id: flight.id,
    title: "Nuevo vuelo recibido",
    body: buildFlightCreatedAdminMessage(createdFlight, profile ?? undefined),
    excludeUserId: user.id,
  });

  await logFlightAction(supabase, {
    user_id: user.id,
    action: "flight_created",
    flight_id: flight.id,
    metadata: { passenger_count: passengers.length, total_amount: data.total_amount, flight_type: data.flight_type },
  });

  revalidatePath("/user/dashboard");
  revalidatePath("/user/vuelos");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/vuelos");

  redirect(`/user/vuelos/${flight.id}?created=1`);
}
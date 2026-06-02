"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { slugFileName } from "@/lib/storage";
import { formatFlightFolio } from "@/lib/utils";
import { logFlightAction, notifyAdmins } from "@/lib/flight-operations";

export type EditFlightFormState = {
  error?: string;
};

function cleanText(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function cleanMoney(value: FormDataEntryValue | null) {
  const raw = cleanText(value).replace(/,/g, "");
  const number = Number(raw);
  return Number.isFinite(number) ? number : NaN;
}

function cleanInteger(value: FormDataEntryValue | null) {
  const raw = Number(cleanText(value));
  return Number.isFinite(raw) ? Math.max(0, Math.floor(raw)) : 0;
}

function revalidateFlight(flightId: string) {
  revalidatePath("/user/dashboard");
  revalidatePath("/user/vuelos");
  revalidatePath("/user/mensajes");
  revalidatePath(`/user/vuelos/${flightId}`);
  revalidatePath(`/user/vuelos/${flightId}/editar`);
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/vuelos");
  revalidatePath("/admin/mensajes");
  revalidatePath(`/admin/vuelos/${flightId}`);
}

export async function updateUserFlightAction(
  _previousState: EditFlightFormState,
  formData: FormData
): Promise<EditFlightFormState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Tu sesión expiró. Inicia sesión nuevamente." };

  const flightId = cleanText(formData.get("flight_id"));
  const flightType = cleanText(formData.get("flight_type")) === "redondo" ? "redondo" : "sencillo";
  const flightDate = cleanText(formData.get("flight_date"));
  const flightTime = cleanText(formData.get("flight_time"));
  const returnFlightDate = flightType === "redondo" ? cleanText(formData.get("return_flight_date")) : "";
  const returnFlightTime = flightType === "redondo" ? cleanText(formData.get("return_flight_time")) : "";
  const fareType = cleanText(formData.get("fare_type"));
  const totalAmount = cleanMoney(formData.get("total_amount"));
  const notes = cleanText(formData.get("notes"));

  if (!flightId) return { error: "No se encontró el vuelo." };

  const passengerNames = formData.getAll("passenger_full_name").map((item) => cleanText(item));
  const passengerDocuments = formData.getAll("passenger_document").map((item) => cleanText(item));
  const passengerPhones = formData.getAll("passenger_phone").map((item) => cleanText(item));
  const passengerBirthDates = formData.getAll("passenger_birth_date").map((item) => cleanText(item));
  const passengerNationalities = formData.getAll("passenger_nationality").map((item) => cleanText(item));

  const passengers = passengerNames
    .map((fullName, index) => ({
      full_name: fullName,
      document: passengerDocuments[index] ?? "",
      phone: passengerPhones[index] ?? "",
      birth_date: passengerBirthDates[index] ?? "",
      nationality: passengerNationalities[index] ?? "",
    }))
    .filter((passenger) => passenger.full_name.length > 0);

  const extras = {
    checked_bags: cleanInteger(formData.get("checked_bags")),
    carry_on_bags: cleanInteger(formData.get("carry_on_bags")),
    seats: cleanInteger(formData.get("seats")),
    other: cleanText(formData.get("other_extras")),
    notes,
  };

  if (!flightDate || !flightTime || !fareType) {
    return { error: "Completa fecha de ida, horario de ida y tipo de tarifa." };
  }

  if (flightType === "redondo" && (!returnFlightDate || !returnFlightTime)) {
    return { error: "Para un vuelo redondo, agrega fecha y horario de regreso." };
  }

  if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
    return { error: "Escribe un total válido mayor a cero." };
  }

  if (passengers.length === 0) {
    return { error: "Agrega al menos un pasajero." };
  }

  const image = formData.get("flight_image");
  let newImagePath = "";

  if (image instanceof File && image.size > 0) {
    if (!image.type.startsWith("image/")) {
      return { error: "La nueva captura del vuelo debe ser una imagen." };
    }

    const maxSize = 5 * 1024 * 1024;
    if (image.size > maxSize) {
      return { error: "La imagen no puede pesar más de 5 MB." };
    }

    newImagePath = `${user.id}/flights/${flightId}/capturas/${crypto.randomUUID()}-${slugFileName(image.name)}`;
    const { error: uploadError } = await supabase.storage.from("flight-files").upload(newImagePath, image, {
      cacheControl: "3600",
      upsert: false,
      contentType: image.type,
    });

    if (uploadError) return { error: `No se pudo subir la nueva imagen: ${uploadError.message}` };
  }

  const { error } = await supabase.rpc("edit_user_flight", {
    p_flight_id: flightId,
    p_flight_type: flightType,
    p_flight_date: flightDate,
    p_flight_time: flightTime,
    p_return_flight_date: flightType === "redondo" ? returnFlightDate : "",
    p_return_flight_time: flightType === "redondo" ? returnFlightTime : "",
    p_passengers: passengers,
    p_fare_type: fareType,
    p_total_amount: totalAmount,
    p_extras: extras,
    p_flight_image_path: newImagePath,
  });

  if (error) {
    if (newImagePath) await supabase.storage.from("flight-files").remove([newImagePath]);
    return { error: error.message || "No se pudo actualizar el vuelo." };
  }

  if (newImagePath && image instanceof File) {
    await supabase.from("flight_attachments").insert({
      flight_id: flightId,
      uploaded_by: user.id,
      file_path: newImagePath,
      file_name: image.name,
      file_type: image.type,
      category: "vuelo",
    });
  }

  const { data: updatedFlight } = await supabase
    .from("flights")
    .select("id, flight_folio")
    .eq("id", flightId)
    .maybeSingle();

  await notifyAdmins(supabase, {
    flight_id: flightId,
    title: "Vuelo editado por usuario",
    body: `${formatFlightFolio(updatedFlight ?? { id: flightId })} fue editado por el usuario y requiere nueva revisión administrativa.`,
    excludeUserId: user.id,
  });

  await logFlightAction(supabase, {
    user_id: user.id,
    action: "flight_user_edited",
    flight_id: flightId,
    metadata: { new_image: Boolean(newImagePath), flight_type: flightType, total_amount: totalAmount },
  });

  revalidateFlight(flightId);
  redirect(`/user/vuelos/${flightId}?updated=1`);
}

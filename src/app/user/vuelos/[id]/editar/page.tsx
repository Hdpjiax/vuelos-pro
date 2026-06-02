import Link from "next/link";
import { notFound } from "next/navigation";
import { EditFlightForm } from "./EditFlightForm";
import { createClient } from "@/lib/supabase/server";
import { buttonSecondary, panelClass } from "@/lib/styles";
import { statusLabel } from "@/lib/utils";

const editableStatuses = new Set(["pendiente_revision", "esperando_pago"]);

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditUserFlightPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: flight } = await supabase
    .from("flights")
    .select("id, flight_type, flight_date, flight_time, return_flight_date, return_flight_time, passengers, fare_type, total_amount, extras, status")
    .eq("id", id)
    .single();

  if (!flight) notFound();

  if (!editableStatuses.has(flight.status)) {
    return (
      <div className="space-y-6">
        <Link href={`/user/vuelos/${id}`} className={buttonSecondary}>Volver al vuelo</Link>
        <section className={panelClass}>
          <p className="text-sm font-black uppercase tracking-[0.24em] text-sky-700">Edición bloqueada</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Este vuelo ya no se puede editar</h2>
          <p className="mt-2 text-slate-500">
            Estado actual: <strong>{statusLabel(flight.status)}</strong>. Para hacer cambios, contacta a administración desde mensajes.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href={`/user/vuelos/${id}`} className={buttonSecondary}>Volver al vuelo</Link>
      <EditFlightForm flight={flight as any} />
    </div>
  );
}

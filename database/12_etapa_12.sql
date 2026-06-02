-- Etapa 12: seguimiento operativo, notas internas, archivos internos y automatizaciones.
-- Ejecuta este archivo despues de database/11_etapa_11.sql.

alter type public.attachment_category add value if not exists 'interno';

create table if not exists public.flight_internal_notes (
  id uuid primary key default gen_random_uuid(),
  flight_id uuid not null references public.flights(id) on delete cascade,
  admin_id uuid not null references public.profiles(id) on delete cascade,
  note text not null,
  created_at timestamptz not null default now()
);

alter table public.flight_internal_notes enable row level security;

drop policy if exists flight_internal_notes_admin_select on public.flight_internal_notes;
create policy flight_internal_notes_admin_select
on public.flight_internal_notes for select
to authenticated
using (public.is_admin());

drop policy if exists flight_internal_notes_admin_insert on public.flight_internal_notes;
create policy flight_internal_notes_admin_insert
on public.flight_internal_notes for insert
to authenticated
with check (public.is_admin() and admin_id = auth.uid());

drop policy if exists flight_internal_notes_admin_delete on public.flight_internal_notes;
create policy flight_internal_notes_admin_delete
on public.flight_internal_notes for delete
to authenticated
using (public.is_admin());

create index if not exists flight_internal_notes_flight_created_idx
on public.flight_internal_notes(flight_id, created_at desc);

create index if not exists audit_logs_action_entity_created_idx
on public.audit_logs(action, entity_type, entity_id, created_at desc);

create index if not exists notifications_flight_read_created_idx
on public.notifications(flight_id, read, created_at desc);

-- Garantiza que usuarios no puedan modificar vuelos cuando ya avanzaron a pago confirmado, QR o completado.
-- Las funciones existentes edit_user_flight/cancel_user_flight ya validan estado; este indice ayuda a consultas operativas.
create index if not exists flights_status_flight_date_time_idx
on public.flights(status, flight_date, flight_time);

insert into public.audit_logs (user_id, action, entity_type, entity_id, metadata)
values (
  null,
  'system_upgrade',
  'database',
  null,
  jsonb_build_object('stage', 12, 'feature', 'seguimiento_notas_archivos_seguridad')
);

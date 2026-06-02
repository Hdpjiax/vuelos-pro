-- Etapa 2: vuelos reales, notificaciones iniciales y soporte para paneles.
-- Ejecuta este archivo despues de database/01_schema.sql si ya tienes la Etapa 1 instalada.

create or replace function public.notify_admins_new_flight()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, flight_id, title, body)
  select
    p.id,
    new.id,
    'Nuevo vuelo recibido',
    'Un usuario envio un vuelo para revision. ID: ' || new.id::text
  from public.profiles p
  where p.role = 'admin';

  insert into public.audit_logs (user_id, action, entity_type, entity_id, metadata)
  values (
    new.user_id,
    'flight_created',
    'flight',
    new.id,
    jsonb_build_object(
      'flight_date', new.flight_date,
      'flight_time', new.flight_time,
      'fare_type', new.fare_type,
      'total_amount', new.total_amount
    )
  );

  return new;
end;
$$;

drop trigger if exists on_flight_created_notify_admins on public.flights;
create trigger on_flight_created_notify_admins
after insert on public.flights
for each row execute function public.notify_admins_new_flight();

create or replace function public.log_flight_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status is distinct from new.status then
    insert into public.audit_logs (user_id, action, entity_type, entity_id, metadata)
    values (
      auth.uid(),
      'flight_status_changed',
      'flight',
      new.id,
      jsonb_build_object('from', old.status, 'to', new.status)
    );
  end if;

  return new;
end;
$$;

drop trigger if exists on_flight_status_changed_log on public.flights;
create trigger on_flight_status_changed_log
after update of status on public.flights
for each row execute function public.log_flight_status_change();

-- Realtime basico para escuchar cambios en vuelos y notificaciones en etapas posteriores.
do $$
begin
  begin
    alter publication supabase_realtime add table public.flights;
  exception when duplicate_object then
    null;
  end;

  begin
    alter publication supabase_realtime add table public.notifications;
  exception when duplicate_object then
    null;
  end;
end $$;

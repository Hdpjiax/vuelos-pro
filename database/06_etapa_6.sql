-- Etapa 6: filtros avanzados, edición controlada de vuelos, cancelación segura y configuración operativa.
-- Ejecuta este archivo despues de database/01_schema.sql, 02_etapa_2.sql, 03_etapa_3.sql, 04_etapa_4.sql y 05_etapa_5.sql.

alter table public.flights
  add column if not exists user_cancel_reason text,
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by uuid references public.profiles(id) on delete set null;

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;

drop policy if exists app_settings_select_authenticated on public.app_settings;
create policy app_settings_select_authenticated
on public.app_settings for select
to authenticated
using (true);

drop policy if exists app_settings_admin_all on public.app_settings;
create policy app_settings_admin_all
on public.app_settings for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

insert into public.app_settings (key, value)
values (
  'operations',
  jsonb_build_object(
    'support_email', '',
    'support_whatsapp', '',
    'default_bank_note', 'Despues de realizar el pago, sube tu comprobante en el detalle del vuelo.',
    'qr_delivery_note', 'Los QR se enviaran en cuanto el pago quede confirmado.',
    'urgent_window_days', 3
  )
)
on conflict (key) do nothing;

create or replace function public.touch_app_settings_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists app_settings_touch_updated_at on public.app_settings;
create trigger app_settings_touch_updated_at
before update on public.app_settings
for each row execute function public.touch_app_settings_updated_at();

-- Edicion segura: el usuario solo puede editar sus vuelos antes de pago/QR.
-- Si el vuelo ya estaba esperando pago y se edita, regresa a pendiente de revision para evitar cobrar datos desactualizados.
create or replace function public.edit_user_flight(
  p_flight_id uuid,
  p_flight_date text,
  p_flight_time text,
  p_passengers jsonb,
  p_fare_type text,
  p_total_amount numeric,
  p_extras jsonb,
  p_flight_image_path text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_flight public.flights%rowtype;
  next_status public.flight_status;
begin
  select * into current_flight
  from public.flights
  where id = p_flight_id
    and user_id = auth.uid();

  if not found then
    raise exception 'Vuelo no encontrado o sin permiso';
  end if;

  if current_flight.status not in ('pendiente_revision', 'esperando_pago') then
    raise exception 'Este vuelo ya no se puede editar';
  end if;

  if p_passengers is null or jsonb_typeof(p_passengers) <> 'array' or jsonb_array_length(p_passengers) = 0 then
    raise exception 'Agrega al menos un pasajero';
  end if;

  next_status := case
    when current_flight.status = 'esperando_pago' then 'pendiente_revision'::public.flight_status
    else current_flight.status
  end;

  update public.flights
  set
    flight_date = p_flight_date::date,
    flight_time = p_flight_time::time,
    passengers = p_passengers,
    fare_type = p_fare_type,
    total_amount = p_total_amount,
    extras = coalesce(p_extras, '{}'::jsonb),
    flight_image_path = coalesce(nullif(p_flight_image_path, ''), flight_image_path),
    status = next_status,
    user_cancel_reason = null,
    cancelled_at = null,
    cancelled_by = null
  where id = p_flight_id;

  insert into public.flight_messages (flight_id, sender_id, receiver_id, message, message_type)
  values (
    p_flight_id,
    auth.uid(),
    null,
    'El usuario actualizo los datos del vuelo. Administracion debe revisar la informacion actualizada.',
    'vuelo_editado'
  );

  insert into public.notifications (user_id, flight_id, title, body)
  select
    p.id,
    p_flight_id,
    'Vuelo actualizado por usuario',
    'Un usuario edito la informacion de un vuelo. Revisa los datos antes de continuar.'
  from public.profiles p
  where p.role = 'admin';

  insert into public.audit_logs (user_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(),
    'flight_user_edited',
    'flight',
    p_flight_id,
    jsonb_build_object('status_after_edit', next_status)
  );
end;
$$;

grant execute on function public.edit_user_flight(uuid, text, text, jsonb, text, numeric, jsonb, text) to authenticated;

-- Cancelacion segura por usuario: solo antes de que el pago haya sido subido/confirmado.
create or replace function public.cancel_user_flight(
  p_flight_id uuid,
  p_reason text default ''
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_flight public.flights%rowtype;
  clean_reason text;
begin
  select * into current_flight
  from public.flights
  where id = p_flight_id
    and user_id = auth.uid();

  if not found then
    raise exception 'Vuelo no encontrado o sin permiso';
  end if;

  if current_flight.status not in ('pendiente_revision', 'esperando_pago') then
    raise exception 'Este vuelo ya no se puede cancelar desde el panel de usuario';
  end if;

  clean_reason := left(coalesce(nullif(trim(p_reason), ''), 'Cancelado por el usuario.'), 500);

  update public.flights
  set
    status = 'cancelado',
    user_cancel_reason = clean_reason,
    cancelled_at = now(),
    cancelled_by = auth.uid()
  where id = p_flight_id;

  insert into public.flight_messages (flight_id, sender_id, receiver_id, message, message_type)
  values (
    p_flight_id,
    auth.uid(),
    null,
    'El usuario cancelo este vuelo. Motivo: ' || clean_reason,
    'vuelo_cancelado'
  );

  insert into public.notifications (user_id, flight_id, title, body)
  select
    p.id,
    p_flight_id,
    'Vuelo cancelado por usuario',
    'Un usuario cancelo un vuelo. Motivo: ' || clean_reason
  from public.profiles p
  where p.role = 'admin';

  insert into public.audit_logs (user_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(),
    'flight_user_cancelled',
    'flight',
    p_flight_id,
    jsonb_build_object('reason', clean_reason)
  );
end;
$$;

grant execute on function public.cancel_user_flight(uuid, text) to authenticated;

create index if not exists flights_status_date_idx on public.flights(status, flight_date);
create index if not exists flights_user_status_date_idx on public.flights(user_id, status, flight_date);
create index if not exists flights_created_at_idx on public.flights(created_at desc);
create index if not exists flights_cancelled_at_idx on public.flights(cancelled_at desc);
create index if not exists app_settings_updated_at_idx on public.app_settings(updated_at desc);

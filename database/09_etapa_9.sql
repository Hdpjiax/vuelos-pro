-- Etapa 9: vuelos redondos, datos completos de pasajeros y porcentaje/total a pagar por admin.
-- Ejecuta este archivo despues de database/08_etapa_8.sql.

alter table public.flights
  add column if not exists flight_type text not null default 'sencillo',
  add column if not exists return_flight_date date,
  add column if not exists return_flight_time time,
  add column if not exists payment_percentage numeric(5,2) not null default 100,
  add column if not exists amount_to_pay numeric(12,2) not null default 0;

update public.flights
set
  flight_type = coalesce(nullif(flight_type, ''), 'sencillo'),
  payment_percentage = coalesce(payment_percentage, 100),
  amount_to_pay = case
    when coalesce(amount_to_pay, 0) > 0 then amount_to_pay
    else total_amount
  end;

alter table public.flights
  drop constraint if exists flights_flight_type_check;

alter table public.flights
  add constraint flights_flight_type_check
  check (flight_type in ('sencillo', 'redondo'));

alter table public.flights
  drop constraint if exists flights_round_trip_return_required_check;

alter table public.flights
  add constraint flights_round_trip_return_required_check
  check (
    flight_type <> 'redondo'
    or (return_flight_date is not null and return_flight_time is not null)
  );

alter table public.flights
  drop constraint if exists flights_payment_percentage_range_check;

alter table public.flights
  add constraint flights_payment_percentage_range_check
  check (payment_percentage > 0 and payment_percentage <= 100);

create index if not exists flights_return_date_idx on public.flights(return_flight_date);
create index if not exists flights_payment_amount_idx on public.flights(amount_to_pay);
create index if not exists flights_type_idx on public.flights(flight_type);

-- Reemplaza la funcion de edicion para aceptar vuelos redondos y reiniciar calculo de pago.
create or replace function public.edit_user_flight(
  p_flight_id uuid,
  p_flight_type text,
  p_flight_date text,
  p_flight_time text,
  p_return_flight_date text,
  p_return_flight_time text,
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
  clean_flight_type text;
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

  clean_flight_type := case when p_flight_type = 'redondo' then 'redondo' else 'sencillo' end;

  if clean_flight_type = 'redondo' and (coalesce(nullif(p_return_flight_date, ''), '') = '' or coalesce(nullif(p_return_flight_time, ''), '') = '') then
    raise exception 'Para un vuelo redondo, agrega fecha y horario de regreso';
  end if;

  if p_passengers is null or jsonb_typeof(p_passengers) <> 'array' or jsonb_array_length(p_passengers) = 0 then
    raise exception 'Agrega al menos un pasajero';
  end if;

  if p_total_amount is null or p_total_amount <= 0 then
    raise exception 'El total del vuelo debe ser mayor a cero';
  end if;

  next_status := case
    when current_flight.status = 'esperando_pago' then 'pendiente_revision'::public.flight_status
    else current_flight.status
  end;

  update public.flights
  set
    flight_type = clean_flight_type,
    flight_date = p_flight_date::date,
    flight_time = p_flight_time::time,
    return_flight_date = case when clean_flight_type = 'redondo' then p_return_flight_date::date else null end,
    return_flight_time = case when clean_flight_type = 'redondo' then p_return_flight_time::time else null end,
    passengers = p_passengers,
    fare_type = p_fare_type,
    total_amount = p_total_amount,
    payment_percentage = 100,
    amount_to_pay = p_total_amount,
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
    'El usuario actualizo los datos del vuelo. Administracion debe revisar la informacion actualizada. Si ya se habia enviado cuenta bancaria, el porcentaje de pago se reinicio al 100%.',
    'vuelo_editado'
  );

  insert into public.notifications (user_id, flight_id, title, body)
  select
    p.id,
    p_flight_id,
    'Vuelo actualizado por usuario',
    'Un usuario edito la informacion de un vuelo. Revisa fechas, pasajeros, nacionalidades y total antes de continuar.'
  from public.profiles p
  where p.role = 'admin';

  insert into public.audit_logs (user_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(),
    'flight_user_edited',
    'flight',
    p_flight_id,
    jsonb_build_object('status_after_edit', next_status, 'flight_type', clean_flight_type, 'payment_percentage_reset', 100)
  );
end;
$$;

do $$
begin
  if to_regprocedure('public.edit_user_flight(uuid,text,text,jsonb,text,numeric,jsonb,text)') is not null then
    revoke execute on function public.edit_user_flight(uuid, text, text, jsonb, text, numeric, jsonb, text) from authenticated;
  end if;
end $$;

grant execute on function public.edit_user_flight(uuid, text, text, text, text, text, jsonb, text, numeric, jsonb, text) to authenticated;

-- Etapa 10: reportes operativos, folios internos y mejoras de control.
-- Ejecuta este archivo despues de database/09_etapa_9.sql.

create sequence if not exists public.flight_folio_seq;

alter table public.flights
  add column if not exists flight_folio text;

with numbered as (
  select id, row_number() over (order by created_at asc, id asc) as rn
  from public.flights
  where flight_folio is null or trim(flight_folio) = ''
)
update public.flights f
set flight_folio = 'VP-' || to_char(coalesce(f.created_at, now()), 'YYYY') || '-' || lpad(numbered.rn::text, 6, '0')
from numbered
where f.id = numbered.id;

select setval(
  'public.flight_folio_seq',
  greatest(
    coalesce((select max((substring(flight_folio from '([0-9]+)$'))::bigint) from public.flights), 0),
    coalesce((select count(*)::bigint from public.flights), 0),
    1
  ),
  true
);

create or replace function public.assign_flight_folio()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.flight_folio is null or trim(new.flight_folio) = '' then
    new.flight_folio := 'VP-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.flight_folio_seq')::text, 6, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists flights_assign_folio_before_insert on public.flights;
create trigger flights_assign_folio_before_insert
before insert on public.flights
for each row execute function public.assign_flight_folio();

create unique index if not exists flights_folio_unique_idx
on public.flights(flight_folio)
where flight_folio is not null;

create index if not exists flights_created_at_idx on public.flights(created_at);
create index if not exists flights_status_date_idx on public.flights(status, flight_date);
create index if not exists flights_amount_to_pay_idx on public.flights(amount_to_pay);

insert into public.audit_logs (user_id, action, entity_type, entity_id, metadata)
select
  null,
  'system_upgrade',
  'database',
  null,
  jsonb_build_object('stage', 10, 'feature', 'folios_reportes')
where exists (select 1 from public.flights limit 1);

-- Etapa 11: panel financiero, cortes, ganancias por vuelo, buscador global y centro de archivos.
-- Ejecuta este archivo despues de database/10_etapa_10.sql.

alter table public.flights
  add column if not exists provider_cost_amount numeric(12,2) not null default 0,
  add column if not exists admin_commission_amount numeric(12,2) not null default 0,
  add column if not exists profit_amount numeric(12,2) not null default 0,
  add column if not exists financial_status text not null default 'pendiente',
  add column if not exists financial_notes text,
  add column if not exists financial_updated_at timestamptz,
  add column if not exists financial_updated_by uuid references auth.users(id) on delete set null;

update public.flights
set
  provider_cost_amount = coalesce(provider_cost_amount, 0),
  admin_commission_amount = coalesce(admin_commission_amount, 0),
  profit_amount = round((coalesce(amount_to_pay, total_amount, 0) - coalesce(provider_cost_amount, 0) - coalesce(admin_commission_amount, 0))::numeric, 2),
  financial_status = coalesce(nullif(financial_status, ''), 'pendiente')
where true;

alter table public.flights
  drop constraint if exists flights_financial_status_check;

alter table public.flights
  add constraint flights_financial_status_check
  check (financial_status in ('pendiente', 'revisar', 'liquidado'));

create index if not exists flights_financial_status_idx on public.flights(financial_status);
create index if not exists flights_financial_updated_at_idx on public.flights(financial_updated_at);
create index if not exists flights_profit_amount_idx on public.flights(profit_amount);
create index if not exists flight_attachments_category_created_idx on public.flight_attachments(category, created_at desc);
create index if not exists flight_attachments_flight_category_idx on public.flight_attachments(flight_id, category);

insert into public.audit_logs (user_id, action, entity_type, entity_id, metadata)
values (
  null,
  'system_upgrade',
  'database',
  null,
  jsonb_build_object('stage', 11, 'feature', 'finanzas_busqueda_archivos')
);

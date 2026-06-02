create extension if not exists pgcrypto;

create type public.app_role as enum ('user', 'admin');

create type public.flight_status as enum (
  'pendiente_revision',
  'esperando_pago',
  'pago_subido',
  'pago_confirmado',
  'pendiente_qr',
  'qr_enviado',
  'completado',
  'cancelado'
);

create type public.attachment_category as enum (
  'vuelo',
  'comprobante_pago',
  'qr',
  'otro'
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  role public.app_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.flights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  flight_date date not null,
  flight_time time not null,
  passengers jsonb not null default '[]'::jsonb,
  fare_type text not null,
  total_amount numeric(12,2) not null default 0,
  extras jsonb not null default '{}'::jsonb,
  flight_image_path text,
  status public.flight_status not null default 'pendiente_revision',
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.flight_messages (
  id uuid primary key default gen_random_uuid(),
  flight_id uuid not null references public.flights(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid references public.profiles(id) on delete set null,
  message text not null,
  message_type text not null default 'texto',
  created_at timestamptz not null default now()
);

create table if not exists public.flight_attachments (
  id uuid primary key default gen_random_uuid(),
  flight_id uuid not null references public.flights(id) on delete cascade,
  uploaded_by uuid not null references public.profiles(id) on delete cascade,
  file_path text not null,
  file_name text not null,
  file_type text not null,
  category public.attachment_category not null default 'otro',
  created_at timestamptz not null default now()
);

create table if not exists public.bank_accounts (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles(id) on delete cascade,
  bank_name text not null,
  account_holder text not null,
  clabe text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  flight_id uuid references public.flights(id) on delete cascade,
  title text not null,
  body text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles(role);
create index if not exists flights_user_id_idx on public.flights(user_id);
create index if not exists flights_status_idx on public.flights(status);
create index if not exists flights_date_idx on public.flights(flight_date);
create index if not exists messages_flight_id_idx on public.flight_messages(flight_id);
create index if not exists attachments_flight_id_idx on public.flight_attachments(flight_id);
create index if not exists notifications_user_id_idx on public.notifications(user_id);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

drop trigger if exists flights_touch_updated_at on public.flights;
create trigger flights_touch_updated_at
before update on public.flights
for each row execute function public.touch_updated_at();

drop trigger if exists bank_accounts_touch_updated_at on public.bank_accounts;
create trigger bank_accounts_touch_updated_at
before update on public.bank_accounts
for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    'user'
  )
  on conflict (id) do update
  set email = excluded.email,
      full_name = excluded.full_name;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_admin(check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = check_user_id
      and role = 'admin'
  );
$$;

create or replace function public.can_access_flight(check_flight_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.flights
    where id = check_flight_id
      and (user_id = auth.uid() or public.is_admin())
  );
$$;

alter table public.profiles enable row level security;
alter table public.flights enable row level security;
alter table public.flight_messages enable row level security;
alter table public.flight_attachments enable row level security;
alter table public.bank_accounts enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists profiles_select_own_or_admin on public.profiles;
create policy profiles_select_own_or_admin
on public.profiles for select
to authenticated
using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_update_admin_only on public.profiles;
create policy profiles_update_admin_only
on public.profiles for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists flights_select_own_or_admin on public.flights;
create policy flights_select_own_or_admin
on public.flights for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists flights_insert_own_pending on public.flights;
create policy flights_insert_own_pending
on public.flights for insert
to authenticated
with check (user_id = auth.uid() and status = 'pendiente_revision');

drop policy if exists flights_update_admin_only on public.flights;
create policy flights_update_admin_only
on public.flights for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists flights_delete_admin_only on public.flights;
create policy flights_delete_admin_only
on public.flights for delete
to authenticated
using (public.is_admin());

drop policy if exists messages_select_by_flight_access on public.flight_messages;
create policy messages_select_by_flight_access
on public.flight_messages for select
to authenticated
using (public.can_access_flight(flight_id));

drop policy if exists messages_insert_by_flight_access on public.flight_messages;
create policy messages_insert_by_flight_access
on public.flight_messages for insert
to authenticated
with check (sender_id = auth.uid() and public.can_access_flight(flight_id));

drop policy if exists attachments_select_by_flight_access on public.flight_attachments;
create policy attachments_select_by_flight_access
on public.flight_attachments for select
to authenticated
using (public.can_access_flight(flight_id));

drop policy if exists attachments_insert_by_flight_access on public.flight_attachments;
create policy attachments_insert_by_flight_access
on public.flight_attachments for insert
to authenticated
with check (uploaded_by = auth.uid() and public.can_access_flight(flight_id));

drop policy if exists bank_accounts_admin_all on public.bank_accounts;
create policy bank_accounts_admin_all
on public.bank_accounts for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own
on public.notifications for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own
on public.notifications for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists notifications_insert_admin_only on public.notifications;
create policy notifications_insert_admin_only
on public.notifications for insert
to authenticated
with check (public.is_admin());

drop policy if exists audit_logs_select_admin_only on public.audit_logs;
create policy audit_logs_select_admin_only
on public.audit_logs for select
to authenticated
using (public.is_admin());

drop policy if exists audit_logs_insert_authenticated on public.audit_logs;
create policy audit_logs_insert_authenticated
on public.audit_logs for insert
to authenticated
with check (user_id = auth.uid() or public.is_admin());

insert into storage.buckets (id, name, public)
values ('flight-files', 'flight-files', false)
on conflict (id) do nothing;

drop policy if exists storage_select_flight_files on storage.objects;
create policy storage_select_flight_files
on storage.objects for select
to authenticated
using (
  bucket_id = 'flight-files'
  and (
    public.is_admin()
    or owner = auth.uid()
    or (storage.foldername(name))[1] = auth.uid()::text
  )
);

drop policy if exists storage_insert_flight_files on storage.objects;
create policy storage_insert_flight_files
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'flight-files'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists storage_update_flight_files on storage.objects;
create policy storage_update_flight_files
on storage.objects for update
to authenticated
using (
  bucket_id = 'flight-files'
  and (public.is_admin() or owner = auth.uid())
)
with check (
  bucket_id = 'flight-files'
  and (public.is_admin() or owner = auth.uid())
);

drop policy if exists storage_delete_flight_files on storage.objects;
create policy storage_delete_flight_files
on storage.objects for delete
to authenticated
using (
  bucket_id = 'flight-files'
  and (public.is_admin() or owner = auth.uid())
);

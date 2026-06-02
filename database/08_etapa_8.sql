-- Etapa 8: producto final, perfiles, recuperacion de contraseña y pulido responsive.
-- Ejecuta este archivo despues de database/07_etapa_7.sql.

alter table public.profiles
  add column if not exists phone text,
  add column if not exists company_name text;

-- Funcion segura para que cada usuario actualice solo sus datos editables.
-- No permite modificar role, email ni id desde el cliente.
create or replace function public.update_own_profile(
  p_full_name text,
  p_phone text default '',
  p_company_name text default ''
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_full_name text;
  clean_phone text;
  clean_company text;
begin
  if auth.uid() is null then
    raise exception 'Sesion requerida';
  end if;

  clean_full_name := left(trim(coalesce(p_full_name, '')), 120);
  clean_phone := left(trim(coalesce(p_phone, '')), 40);
  clean_company := left(trim(coalesce(p_company_name, '')), 120);

  if clean_full_name = '' then
    raise exception 'El nombre completo es obligatorio';
  end if;

  update public.profiles
  set
    full_name = clean_full_name,
    phone = nullif(clean_phone, ''),
    company_name = nullif(clean_company, '')
  where id = auth.uid();

  insert into public.audit_logs (user_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(),
    'profile_self_updated',
    'profile',
    auth.uid(),
    jsonb_build_object('profile_updated', true)
  );
end;
$$;

grant execute on function public.update_own_profile(text, text, text) to authenticated;

create index if not exists profiles_company_name_idx
on public.profiles(company_name);

create index if not exists profiles_phone_idx
on public.profiles(phone);

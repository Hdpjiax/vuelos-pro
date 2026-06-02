-- Etapa 7: preparación para producción, seguridad final y mantenimiento seguro.
-- Ejecuta este archivo despues de 01_schema.sql, 02_etapa_2.sql, 03_etapa_3.sql, 04_etapa_4.sql, 05_etapa_5.sql y 06_etapa_6.sql.

-- Configuración pública mínima para controlar si el registro de usuarios está abierto.
insert into public.app_settings (key, value)
values (
  'production',
  jsonb_build_object(
    'site_url', '',
    'support_escalation_email', '',
    'legal_notice', '',
    'public_registration_enabled', true,
    'max_upload_mb', 8,
    'cleanup_read_notifications_days', 45
  )
)
on conflict (key) do nothing;

-- La pantalla de registro necesita leer únicamente la configuración de producción.
-- No abre datos de vuelos, usuarios, pagos ni mensajes.
drop policy if exists app_settings_select_public_production on public.app_settings;
create policy app_settings_select_public_production
on public.app_settings for select
to anon, authenticated
using (key = 'production');

-- Mantiene la lectura autenticada de operaciones y producción, y evita exponer otros settings futuros.
drop policy if exists app_settings_select_authenticated on public.app_settings;
create policy app_settings_select_authenticated_safe
on public.app_settings for select
to authenticated
using (public.is_admin() or key in ('operations', 'production'));

-- Solo administración puede borrar registros de adjuntos.
-- La acción del panel también elimina el objeto en Storage antes de borrar este registro.
drop policy if exists attachments_delete_admin_only on public.flight_attachments;
create policy attachments_delete_admin_only
on public.flight_attachments for delete
to authenticated
using (public.is_admin());

-- Solo administración puede borrar notificaciones de forma directa.
-- La limpieza normal se hace mediante la función cleanup_read_notifications.
drop policy if exists notifications_delete_admin_only on public.notifications;
create policy notifications_delete_admin_only
on public.notifications for delete
to authenticated
using (public.is_admin());

-- Limpieza segura: elimina únicamente notificaciones ya leídas y antiguas.
-- No borra vuelos, mensajes, adjuntos ni auditoría.
create or replace function public.cleanup_read_notifications(p_older_than_days integer default 45)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_days integer;
  deleted_count integer := 0;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Solo administradores pueden ejecutar mantenimiento';
  end if;

  clean_days := greatest(7, least(coalesce(p_older_than_days, 45), 365));

  delete from public.notifications
  where read = true
    and created_at < now() - make_interval(days => clean_days);

  get diagnostics deleted_count = row_count;

  return deleted_count;
end;
$$;

grant execute on function public.cleanup_read_notifications(integer) to authenticated;

-- Índices adicionales para producción.
create index if not exists notifications_read_created_at_idx
on public.notifications(read, created_at desc);

create index if not exists flight_attachments_created_at_idx
on public.flight_attachments(created_at desc);

create index if not exists flight_attachments_category_created_at_idx
on public.flight_attachments(category, created_at desc);

create index if not exists profiles_email_idx
on public.profiles(email);

-- Mantiene realtime listo para paneles de producción y auditoría.
do $$
begin
  begin
    alter publication supabase_realtime add table public.app_settings;
  exception when duplicate_object then
    null;
  end;
end $$;

-- Etapa 4: centro de notificaciones, historial mejorado y panel de usuarios.
-- Ejecuta este archivo despues de database/01_schema.sql, 02_etapa_2.sql y 03_etapa_3.sql.

create index if not exists audit_logs_user_id_idx on public.audit_logs(user_id);
create index if not exists audit_logs_action_idx on public.audit_logs(action);
create index if not exists audit_logs_created_at_idx on public.audit_logs(created_at desc);
create index if not exists notifications_user_read_idx on public.notifications(user_id, read);
create index if not exists notifications_created_at_idx on public.notifications(created_at desc);
create index if not exists flight_messages_created_at_idx on public.flight_messages(created_at desc);

-- Mantiene realtime listo para mejoras de actividad, usuarios y auditoria.
do $$
begin
  begin
    alter publication supabase_realtime add table public.profiles;
  exception when duplicate_object then
    null;
  end;

  begin
    alter publication supabase_realtime add table public.audit_logs;
  exception when duplicate_object then
    null;
  end;
end $$;

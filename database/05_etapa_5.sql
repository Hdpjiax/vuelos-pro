-- Etapa 5: agrupacion de notificaciones, mensajes e historial.
-- Ejecuta este archivo despues de database/01_schema.sql, 02_etapa_2.sql, 03_etapa_3.sql y 04_etapa_4.sql.

-- Indices para que las vistas agrupadas por vuelo/usuario sean mas rapidas.
create index if not exists notifications_user_flight_created_idx
on public.notifications(user_id, flight_id, created_at desc);

create index if not exists notifications_user_read_flight_idx
on public.notifications(user_id, read, flight_id);

create index if not exists flight_messages_flight_created_idx
on public.flight_messages(flight_id, created_at desc);

create index if not exists flight_messages_sender_created_idx
on public.flight_messages(sender_id, created_at desc);

create index if not exists audit_logs_entity_created_idx
on public.audit_logs(entity_type, entity_id, created_at desc);

-- Mantiene realtime activo para los centros agrupados.
do $$
begin
  begin
    alter publication supabase_realtime add table public.notifications;
  exception when duplicate_object then
    null;
  end;

  begin
    alter publication supabase_realtime add table public.flight_messages;
  exception when duplicate_object then
    null;
  end;
end $$;

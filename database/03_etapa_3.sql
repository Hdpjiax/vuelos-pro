-- Etapa 3: cuenta bancaria, comprobantes de pago, QR adjuntos, mensajes por vuelo y realtime.
-- Ejecuta este archivo despues de database/01_schema.sql y database/02_etapa_2.sql.

-- Permite que el usuario cambie SU vuelo de esperando_pago a pago_subido al enviar comprobante.
drop policy if exists flights_user_upload_payment_update on public.flights;
create policy flights_user_upload_payment_update
on public.flights for update
to authenticated
using (user_id = auth.uid() and status = 'esperando_pago')
with check (user_id = auth.uid() and status = 'pago_subido');

-- Permite que usuarios vean los datos basicos de cuentas activas solo si ya tienen vuelos esperando pago.
-- La app principalmente envia los datos por mensaje, pero esta politica deja el flujo listo para futuras mejoras.
drop policy if exists bank_accounts_user_read_active_when_waiting_payment on public.bank_accounts;
create policy bank_accounts_user_read_active_when_waiting_payment
on public.bank_accounts for select
to authenticated
using (
  active = true
  and exists (
    select 1
    from public.flights f
    where f.user_id = auth.uid()
      and f.status in ('esperando_pago', 'pago_subido', 'pago_confirmado', 'pendiente_qr', 'qr_enviado', 'completado')
  )
);

-- Notifica a administradores cuando un usuario sube comprobante de pago.
create or replace function public.notify_admins_payment_uploaded()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  flight_owner uuid;
begin
  if new.category = 'comprobante_pago' then
    select user_id into flight_owner
    from public.flights
    where id = new.flight_id;

    insert into public.notifications (user_id, flight_id, title, body)
    select
      p.id,
      new.flight_id,
      'Comprobante de pago recibido',
      'Un usuario subio comprobante de pago para el vuelo ID: ' || new.flight_id::text
    from public.profiles p
    where p.role = 'admin';

    insert into public.audit_logs (user_id, action, entity_type, entity_id, metadata)
    values (
      flight_owner,
      'payment_proof_uploaded',
      'flight',
      new.flight_id,
      jsonb_build_object('attachment_id', new.id, 'file_name', new.file_name)
    );
  end if;

  return new;
end;
$$;

drop trigger if exists on_payment_proof_uploaded_notify_admins on public.flight_attachments;
create trigger on_payment_proof_uploaded_notify_admins
after insert on public.flight_attachments
for each row execute function public.notify_admins_payment_uploaded();

-- Realtime para conversaciones y adjuntos.
do $$
begin
  begin
    alter publication supabase_realtime add table public.flight_messages;
  exception when duplicate_object then
    null;
  end;

  begin
    alter publication supabase_realtime add table public.flight_attachments;
  exception when duplicate_object then
    null;
  end;
end $$;

-- Amplia acceso de lectura a archivos adjuntos del vuelo.
-- Esto permite que el usuario vea QR subidos por admin cuando el archivo esta registrado en flight_attachments.
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
    or exists (
      select 1
      from public.flight_attachments fa
      where fa.file_path = name
        and public.can_access_flight(fa.flight_id)
    )
  )
);

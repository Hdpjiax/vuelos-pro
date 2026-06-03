'use server';

import { createClient } from '@/lib/supabase/server';

export async function sendSupportMessageAction(fd: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autenticado' };

  const message = fd.get('message') as string;
  const user_id = fd.get('user_id') as string;
  if (!message?.trim()) return { error: 'Mensaje vacío' };

  // Insertar mensaje
  const { error } = await supabase.from('support_messages').insert({
    user_id,
    sender_id: user.id,
    message: message.trim(),
  });
  if (error) return { error: error.message };

  // Obtener nombre del usuario para la notificación
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', user_id)
    .single();

  const senderName = profile?.full_name || profile?.email || 'Un usuario';

  // Notificar a todos los admins
  const { data: admins } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'admin');

  if (admins?.length) {
    await supabase.from('notifications').insert(
      admins.map((admin) => ({
        user_id: admin.id,
        title: `💬 Mensaje de soporte`,
        body: `${senderName}: ${message.trim().slice(0, 80)}`,
        flight_id: null,
      }))
    );
  }

  return { ok: true };
}
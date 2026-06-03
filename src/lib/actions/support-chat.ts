'use server';

import { createClient } from '@/lib/supabase/server';
import { notifyAdmins, notifyUser } from '@/lib/flight-operations';

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

  // Obtener perfil del remitente
  const { data: senderProfile } = await supabase
    .from('profiles')
    .select('role, full_name, email')
    .eq('id', user.id)
    .single();

  const isAdmin = senderProfile?.role === 'admin';
  const senderName = senderProfile?.full_name || senderProfile?.email || 'Soporte';
  const preview = `${senderName}: ${message.trim().slice(0, 80)}`;

  if (isAdmin) {
    // Admin escribe → notificar al usuario dueño de la conversación
    await notifyUser(supabase, {
      user_id,
      flight_id: null,
      title: '💬 Respuesta de soporte',
      body: preview,
    });
  } else {
    // Usuario escribe → notificar a todos los admins
    await notifyAdmins(supabase, {
      flight_id: null,
      title: '💬 Mensaje de soporte',
      body: preview,
      excludeUserId: null,
    });
  }

  return { ok: true };
}
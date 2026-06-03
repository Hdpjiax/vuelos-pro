'use server';

import { createClient } from '@/lib/supabase/server';

export async function sendSupportMessageAction(fd: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autenticado' };

  const message = fd.get('message') as string;
  const user_id = fd.get('user_id') as string;

  if (!message?.trim()) return { error: 'Mensaje vacío' };

  const { error } = await supabase.from('support_messages').insert({
    user_id,
    sender_id: user.id,
    message: message.trim(),
  });

  return error ? { error: error.message } : { ok: true };
}
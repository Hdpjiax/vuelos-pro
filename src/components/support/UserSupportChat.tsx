'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Send, Headphones } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { sendSupportMessageAction } from '@/lib/actions/support-chat';

type Msg = {
  id: string;
  message: string;
  sender_id: string;
  created_at: string;
  profiles?: { full_name?: string | null; email?: string | null } | null;
};

export function UserSupportChat({ initial, userId }: { initial: Msg[]; userId: string }) {
  const [messages, setMessages] = useState<Msg[]>(initial);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const supabase = useMemo(() => createClient(), []);

  const mergeMessages = useCallback((incoming: Msg[]) => {
    setMessages((cur) => {
      const ids = new Set(cur.map((m) => m.id));
      const newOnes = incoming.filter((m) => !ids.has(m.id));
      return newOnes.length ? [...cur, ...newOnes] : cur;
    });
  }, []);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel(`user-support-page-${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'support_messages',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        mergeMessages([payload.new as Msg]);
      })
      .subscribe((status) => {
        console.log('[UserSupportChat] realtime status:', status);
      });
    return () => { supabase.removeChannel(channel); };
  }, [userId, supabase, mergeMessages]);

  // Polling fallback cada 4s
  useEffect(() => {
    const interval = setInterval(async () => {
      const latest = messages[messages.length - 1];
      const since = latest
        ? latest.created_at
        : new Date(Date.now() - 60_000).toISOString();

      const { data } = await supabase
        .from('support_messages')
        .select('id, message, sender_id, created_at, profiles:sender_id(full_name, email)')
        .eq('user_id', userId)
        .gt('created_at', since)
        .order('created_at', { ascending: true });

      if (data?.length) {
        const norm = data.map((m: any) => ({
          ...m,
          profiles: Array.isArray(m.profiles) ? (m.profiles[0] ?? null) : m.profiles,
        }));
        mergeMessages(norm);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [userId, supabase, messages, mergeMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setText('');

    const tempId = `temp-${Date.now()}`;
    setMessages((cur) => [...cur, {
      id: tempId,
      message: trimmed,
      sender_id: userId,
      created_at: new Date().toISOString(),
    }]);

    const fd = new FormData();
    fd.append('message', trimmed);
    fd.append('user_id', userId);
    await sendSupportMessageAction(fd);
    setSending(false);
  }

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white/90 shadow-xl shadow-slate-200/60 overflow-hidden">
      <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-5">
        <div className="rounded-2xl bg-sky-50 p-2.5 text-sky-700"><Headphones size={18} /></div>
        <div>
          <h3 className="text-lg font-black text-slate-950">Soporte general</h3>
          <p className="text-xs text-slate-400">Conversa directamente con el equipo de soporte</p>
        </div>
      </div>

      <div className="flex h-[380px] flex-col gap-2 overflow-y-auto px-5 py-4">
        {!messages.length ? (
          <div className="m-auto rounded-3xl border border-dashed border-slate-200 bg-slate-50/60 px-8 py-6 text-center">
            <Headphones size={28} className="mx-auto mb-3 text-slate-300" />
            <p className="font-black text-slate-500">Sin mensajes aún</p>
            <p className="mt-1 text-sm text-slate-400">Escribe tu consulta y te respondemos pronto</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.sender_id === userId;
            const time = new Date(msg.created_at).toLocaleString('es-MX', {
              hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short',
            });
            return (
              <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-3xl px-4 py-3 shadow-sm ${
                  isMine
                    ? 'rounded-br-md bg-sky-600 text-white'
                    : 'rounded-bl-md border border-slate-200 bg-white text-slate-900'
                }`}>
                  {!isMine && (
                    <p className="mb-1 text-[10px] font-black uppercase tracking-wide text-sky-700">
                      {msg.profiles?.full_name || 'Soporte'}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.message}</p>
                  <p className={`mt-1.5 text-right text-[10px] font-bold ${isMine ? 'text-sky-200' : 'text-slate-400'}`}>
                    {time}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="flex items-end gap-3 border-t border-slate-100 bg-white px-4 py-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e as any); }
          }}
          placeholder="Escribe tu mensaje..."
          rows={1}
          className="min-h-[44px] flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100"
          style={{ maxHeight: '120px' }}
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-600 text-white shadow-md transition hover:bg-sky-700 active:scale-95 disabled:opacity-40"
        >
          <Send size={17} />
        </button>
      </form>
    </section>
  );
}
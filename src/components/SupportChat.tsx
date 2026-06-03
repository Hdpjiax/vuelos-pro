'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Headphones, X, Send, MoreHorizontal, Phone, Mail, Minimize2, MessageCircle, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { sendSupportMessageAction } from '@/lib/actions/support-chat';

type Msg = {
    id: string;
    message: string;
    sender_id: string;
    created_at: string;
    profiles?: { full_name?: string | null; email?: string | null } | null;
};

const WHATSAPP_URL = `https://wa.me/524431318488?text=Hola,%20necesito%20ayuda`;
const EMAIL_URL = `mailto:garia350@gmail.com?subject=Soporte%20-%20VuelosPro`;

export function SupportChat({ userId, userName }: { userId: string; userName?: string }) {
    const [open, setOpen] = useState(false);
    const [minimized, setMinimized] = useState(false);
    const [showOptions, setShowOptions] = useState(false);
    const [messages, setMessages] = useState<Msg[]>([]);
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    const supabase = useMemo(() => createClient(), []);

    useEffect(() => {
        if (!open) return;
        setLoading(true);
        supabase
            .from('support_messages')
            .select('id, message, sender_id, created_at, profiles:sender_id(full_name, email)')
            .eq('user_id', userId)
            .order('created_at', { ascending: true })
            .limit(100)
            .then(({ data }: { data: Msg[] | null }) => {
                setMessages(data ?? []);
                setLoading(false);
            });
    }, [open, userId, supabase]);

    useEffect(() => {
        const channel = supabase
            .channel(`support-chat-${userId}`)
            .on('postgres_changes', {
                event: 'INSERT', schema: 'public', table: 'support_messages', filter: `user_id=eq.${userId}`,
            }, (payload: { new: Msg }) => {
                const msg = payload.new as Msg;
                setMessages((cur) => cur.find((m) => m.id === msg.id) ? cur : [...cur, msg]);
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [userId, supabase]);

    useEffect(() => {
        if (!minimized && open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, minimized, open]);

    useEffect(() => {
        if (!open || minimized) setShowOptions(false);
    }, [open, minimized]);

    async function handleSend(e: React.FormEvent) {
        e.preventDefault();
        const trimmed = text.trim();
        if (!trimmed || sending) return;
        setSending(true);
        setText('');

        const tempMsg: Msg = { id: `temp-${Date.now()}`, message: trimmed, sender_id: userId, created_at: new Date().toISOString() };
        setMessages((cur) => [...cur, tempMsg]);

        const fd = new FormData();
        fd.append('message', trimmed);
        fd.append('user_id', userId);
        await sendSupportMessageAction(fd);
        setSending(false);
    }

    useEffect(() => {
        function handleOpen() { setOpen(true); setMinimized(false); }
        window.addEventListener('open-support-chat', handleOpen);
        return () => window.removeEventListener('open-support-chat', handleOpen);
    }, []);

    return (
        <div className="support-help-shell hidden md:flex fixed flex-col items-start gap-3">
            {open && (
                <div className={`support-chat-panel relative flex flex-col rounded-[1.75rem] border border-sky-200/35 bg-gradient-to-br from-sky-950 via-cyan-950 to-slate-950 text-white shadow-2xl shadow-sky-950/35 transition-all duration-300 dark:border-cyan-300/20 dark:from-slate-950 dark:via-indigo-950 dark:to-fuchsia-950 ${minimized ? 'h-16 w-72 overflow-hidden' : 'h-[470px] w-[23rem] overflow-visible'}`}>
                    {showOptions && !minimized && (
                        <>
                            <div className="fixed inset-0 z-[80]" onClick={() => setShowOptions(false)} />
                            <div className="absolute right-4 top-14 z-[90] w-64 overflow-hidden rounded-2xl border border-cyan-300/20 bg-slate-950/95 shadow-2xl shadow-cyan-950/80 ring-1 ring-white/10 backdrop-blur-xl">
                                <p className="border-b border-white/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200/80">Contacto directo</p>
                                <button type="button" onClick={() => { window.open(WHATSAPP_URL, '_blank', 'noopener,noreferrer'); setShowOptions(false); }} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-emerald-400/10">
                                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-300"><Phone size={16} /></span>
                                    <span><span className="block text-sm font-black text-white">WhatsApp</span><span className="block text-xs font-semibold text-cyan-100/70">+52 443 131 8488</span></span>
                                </button>
                                <button type="button" onClick={() => { window.open(EMAIL_URL, '_blank', 'noopener,noreferrer'); setShowOptions(false); }} className="flex w-full items-center gap-3 border-t border-white/5 px-4 py-3 text-left hover:bg-cyan-400/10">
                                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-400/15 text-cyan-300"><Mail size={16} /></span>
                                    <span><span className="block text-sm font-black text-white">Correo</span><span className="block text-xs font-semibold text-cyan-100/70">garia350@gmail.com</span></span>
                                </button>
                            </div>
                        </>
                    )}

                    <div className="flex shrink-0 items-center justify-between rounded-t-[1.75rem] border-b border-white/10 bg-white/6 px-4 py-3 backdrop-blur-xl">
                        <div className="flex items-center gap-2">
                            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-violet-500 text-white shadow-lg shadow-cyan-950/30"><Headphones size={16} /></div>
                            <div>
                                <p className="text-sm font-black text-white">Soporte</p>
                                {!minimized && <p className="text-[10px] text-cyan-100/70">VuelosPro · Chat directo</p>}
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <button type="button" onClick={() => setShowOptions((v) => !v)} aria-label="Mostrar opciones de contacto" aria-expanded={showOptions} className="flex h-8 w-8 items-center justify-center rounded-xl text-cyan-200 transition hover:bg-white/10 hover:text-white"><MoreHorizontal size={17} /></button>
                            <button type="button" onClick={() => setMinimized((v) => !v)} className="flex h-8 w-8 items-center justify-center rounded-xl text-cyan-200 transition hover:bg-white/10 hover:text-white"><Minimize2 size={15} /></button>
                        </div>
                    </div>

                    {!minimized && (
                        <>
                            <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-4 py-3">
                                {loading && <p className="m-auto text-xs text-cyan-100/60">Cargando...</p>}
                                {!loading && !messages.length && (
                                    <div className="m-auto rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-center">
                                        <MessageCircle size={24} className="mx-auto mb-2 text-cyan-200/60" />
                                        <p className="text-xs font-bold text-cyan-100/75">¡Hola{userName ? ` ${userName.split(' ')[0]}` : ''}! ¿En qué podemos ayudarte?</p>
                                    </div>
                                )}
                                {messages.map((msg) => {
                                    const isMine = msg.sender_id === userId;
                                    const time = new Date(msg.created_at).toLocaleString('es-MX', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' });
                                    return (
                                        <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[80%] rounded-3xl px-3 py-2 shadow-lg ${isMine ? 'rounded-br-md bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-blue-950/20' : 'rounded-bl-md bg-white/12 text-cyan-50 shadow-black/10'}`}>
                                                {!isMine && <p className="mb-0.5 text-[10px] font-black uppercase tracking-wide text-cyan-300">{msg.profiles?.full_name || 'Soporte'}</p>}
                                                <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.message}</p>
                                                <p className={`mt-1 text-right text-[9px] font-bold ${isMine ? 'text-cyan-100' : 'text-cyan-200/60'}`}>{time}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={bottomRef} />
                            </div>

                            <form onSubmit={handleSend} className="flex shrink-0 items-end gap-2 rounded-b-[1.75rem] border-t border-white/10 bg-white/6 px-3 py-3 backdrop-blur-xl">
                                <textarea value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e as any); } }} placeholder="Escribe un mensaje..." rows={1} className="min-h-[38px] flex-1 resize-none rounded-2xl border border-white/10 bg-white/8 px-3 py-2 text-sm text-white placeholder:text-cyan-100/40 focus:border-cyan-300/40 focus:outline-none" style={{ maxHeight: '80px' }} />
                                <button type="submit" disabled={!text.trim() || sending} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-violet-500 text-white shadow-lg shadow-cyan-950/30 transition hover:scale-105 disabled:opacity-40"><Send size={15} /></button>
                            </form>
                        </>
                    )}
                </div>
            )}

            {!open && (
                <div className="support-help-label rounded-2xl border border-sky-200/70 bg-white/78 px-3 py-1.5 text-xs font-black text-slate-700 shadow-lg shadow-sky-100/70 backdrop-blur-xl dark:border-cyan-300/20 dark:bg-slate-950/80 dark:text-cyan-100 dark:shadow-black/40">
                    ¿Necesitas ayuda?
                </div>
            )}

            <button type="button" onClick={() => { setOpen((v) => !v); setMinimized(false); setShowOptions(false); }} className={`support-help-button flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-2xl transition hover:scale-105 ${open ? 'bg-gradient-to-br from-rose-500 to-orange-500 shadow-rose-500/25 dark:from-fuchsia-500 dark:to-rose-500' : 'bg-gradient-to-br from-cyan-400 via-blue-500 to-violet-500 shadow-sky-500/30 dark:from-cyan-400 dark:via-violet-500 dark:to-fuchsia-500'}`} aria-label={open ? 'Cerrar soporte' : 'Abrir soporte'}>
                {open ? <X size={21} /> : <><Sparkles size={12} className="absolute -mt-8 ml-8 opacity-90" /><Headphones size={22} /></>}
            </button>
        </div>
    );
}

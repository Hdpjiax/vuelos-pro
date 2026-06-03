'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Headphones, X, Send, MoreHorizontal, Phone, Mail, Minimize2, MessageCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { sendSupportMessageAction } from '@/lib/actions/support-chat';
type SupabaseRow = Msg & { [key: string]: unknown };
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

    // Cargar mensajes al abrir
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

    // Realtime — suscripción siempre activa (no solo cuando está abierto)
    useEffect(() => {
        const channel = supabase
            .channel(`support-chat-${userId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'support_messages',
                filter: `user_id=eq.${userId}`,
            }, (payload: { new: Msg }) => {
                const msg = payload.new as Msg;
                setMessages((cur) => cur.find((m) => m.id === msg.id) ? cur : [...cur, msg]);
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [userId, supabase]);

    // Scroll al fondo
    useEffect(() => {
        if (!minimized && open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, minimized, open]);

    async function handleSend(e: React.FormEvent) {
        e.preventDefault();
        const trimmed = text.trim();
        if (!trimmed || sending) return;
        setSending(true);
        setText('');

        // Optimistic: agrega el mensaje localmente de inmediato
        const tempMsg: Msg = {
            id: `temp-${Date.now()}`,
            message: trimmed,
            sender_id: userId,
            created_at: new Date().toISOString(),
        };
        setMessages((cur) => [...cur, tempMsg]);

        const fd = new FormData();
        fd.append('message', trimmed);
        fd.append('user_id', userId);
        await sendSupportMessageAction(fd);
        setSending(false);
    }
    // Escucha el evento del botón en la página de mensajes
    useEffect(() => {
        function handleOpen() { setOpen(true); setMinimized(false); }
        window.addEventListener('open-support-chat', handleOpen);
        return () => window.removeEventListener('open-support-chat', handleOpen);
    }, []);
    return (
        // hidden en móvil — en móvil se usan las opciones del menú del Sidebar
        <div className="hidden md:flex fixed bottom-6 right-6 z-50 flex-col items-end gap-2">
            {open && (
                <div className={`flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-sky-950 shadow-2xl transition-all duration-200 ${minimized ? 'h-14 w-72' : 'h-[480px] w-80 lg:w-96'
                    }`}>

                    {/* Header */}
                    <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
                        <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-600">
                                <Headphones size={15} className="text-white" />
                            </div>
                            <div>
                                <p className="text-sm font-black text-white">Soporte</p>
                                {!minimized && <p className="text-[10px] text-sky-300/70">VuelosPro · Chat directo</p>}
                            </div>
                        </div>

                        <div className="flex items-center gap-1">
                            {/* 3 puntitos */}
                            <div className="relative">
                                <button
                                    onClick={() => setShowOptions((v) => !v)}
                                    className="flex h-8 w-8 items-center justify-center rounded-xl text-sky-300 transition hover:bg-white/10"
                                >
                                    <MoreHorizontal size={17} />
                                </button>
                                {showOptions && (
                                    <>
                                        <div className="fixed inset-0 z-[60]" onClick={() => setShowOptions(false)} />
                                        <div className="absolute bottom-full right-0 z-[70] mb-2 w-56 overflow-hidden rounded-2xl border border-white/10 bg-sky-900 shadow-2xl">
                                            <p className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-sky-400/60">
                                                Otras opciones
                                            </p>
                                            <button
                                                onClick={() => { window.open(WHATSAPP_URL, '_blank'); setShowOptions(false); }}
                                                className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-white/10"
                                            >
                                                <Phone size={15} className="text-green-400" />
                                                <div>
                                                    <p className="text-sm font-semibold text-sky-100">WhatsApp</p>
                                                    <p className="text-xs text-sky-300/60">+52 443 131 8488</p>
                                                </div>
                                            </button>
                                            <button
                                                onClick={() => { window.open(EMAIL_URL, '_blank'); setShowOptions(false); }}
                                                className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-white/10"
                                            >
                                                <Mail size={15} className="text-blue-400" />
                                                <div>
                                                    <p className="text-sm font-semibold text-sky-100">Correo</p>
                                                    <p className="text-xs text-sky-300/60">garia350@gmail.com</p>
                                                </div>
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>

                            <button
                                onClick={() => setMinimized((v) => !v)}
                                className="flex h-8 w-8 items-center justify-center rounded-xl text-sky-300 transition hover:bg-white/10"
                            >
                                <Minimize2 size={15} />
                            </button>
                            <button
                                onClick={() => { setOpen(false); setMinimized(false); setShowOptions(false); }}
                                className="flex h-8 w-8 items-center justify-center rounded-xl text-sky-300 transition hover:bg-white/10"
                            >
                                <X size={15} />
                            </button>
                        </div>
                    </div>

                    {/* Mensajes + Input */}
                    {!minimized && (
                        <>
                            <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-4 py-3">
                                {loading && <p className="m-auto text-xs text-sky-300/60">Cargando...</p>}
                                {!loading && !messages.length && (
                                    <div className="m-auto rounded-2xl border border-white/10 px-5 py-4 text-center">
                                        <MessageCircle size={24} className="mx-auto mb-2 text-sky-400/50" />
                                        <p className="text-xs font-bold text-sky-300/70">
                                            ¡Hola{userName ? ` ${userName.split(' ')[0]}` : ''}! ¿En qué podemos ayudarte?
                                        </p>
                                    </div>
                                )}
                                {messages.map((msg) => {
                                    const isMine = msg.sender_id === userId;
                                    const time = new Date(msg.created_at).toLocaleString('es-MX', {
                                        hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short',
                                    });
                                    return (
                                        <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[80%] rounded-3xl px-3 py-2 ${isMine ? 'rounded-br-md bg-sky-600 text-white' : 'rounded-bl-md bg-white/10 text-sky-100'
                                                }`}>
                                                {!isMine && (
                                                    <p className="mb-0.5 text-[10px] font-black uppercase tracking-wide text-sky-400">
                                                        {msg.profiles?.full_name || 'Soporte'}
                                                    </p>
                                                )}
                                                <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.message}</p>
                                                <p className={`mt-1 text-right text-[9px] font-bold ${isMine ? 'text-sky-200' : 'text-sky-400/60'}`}>
                                                    {time}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={bottomRef} />
                            </div>

                            <form
                                onSubmit={handleSend}
                                className="flex shrink-0 items-end gap-2 border-t border-white/10 bg-sky-900/50 px-3 py-3"
                            >
                                <textarea
                                    value={text}
                                    onChange={(e) => setText(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e as any); }
                                    }}
                                    placeholder="Escribe un mensaje..."
                                    rows={1}
                                    className="min-h-[38px] flex-1 resize-none rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-sky-400/40 focus:border-sky-400/40 focus:outline-none"
                                    style={{ maxHeight: '80px' }}
                                />
                                <button
                                    type="submit"
                                    disabled={!text.trim() || sending}
                                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-sky-600 text-white transition hover:bg-sky-500 active:scale-95 disabled:opacity-40"
                                >
                                    <Send size={14} />
                                </button>
                            </form>
                        </>
                    )}
                </div>
            )}

            {/* Botón flotante */}
            <button
                onClick={() => { setOpen((v) => !v); setMinimized(false); }}
                className="flex items-center gap-2 rounded-2xl bg-sky-600 px-4 py-3 text-sm font-black text-white shadow-2xl shadow-sky-900/50 transition hover:bg-sky-500 active:scale-95"
            >
                {open ? <X size={17} /> : <Headphones size={17} />}
                {!open && <span>¿Necesitas ayuda?</span>}
            </button>
        </div>
    );
}
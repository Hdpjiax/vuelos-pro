"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { Send, Headphones } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { sendSupportMessageAction } from "@/lib/actions/support-chat";

type Msg = {
  id: string;
  message: string;
  sender_id: string;
  created_at: string;
  profiles?: { full_name?: string | null; email?: string | null } | null;
};

export function AdminSupportChat({
  messages: initial,
  userId,
  adminId,
  userName,
}: {
  messages: Msg[];
  userId: string;
  adminId: string;
  userName: string;
}) {
  const [messages, setMessages] = useState<Msg[]>(initial);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const supabase = useMemo(() => createClient(), []);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel(`admin-support-${userId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "support_messages",
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        const msg = payload.new as Msg;
        setMessages((cur) => cur.find((m) => m.id === msg.id) ? cur : [...cur, msg]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, supabase]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setText("");

    // Optimistic
    setMessages((cur) => [...cur, {
      id: `temp-${Date.now()}`,
      message: trimmed,
      sender_id: adminId,
      created_at: new Date().toISOString(),
    }]);

    const fd = new FormData();
    fd.append("message", trimmed);
    fd.append("user_id", userId); // el admin responde EN la conversación del usuario
    await sendSupportMessageAction(fd);
    setSending(false);
  }

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white/90 shadow-xl shadow-slate-200/60 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-5">
        <div className="rounded-2xl bg-sky-50 p-2.5 text-sky-700"><Headphones size={18} /></div>
        <div>
          <p className="text-sm font-black uppercase tracking-[0.2em] text-sky-700">Soporte general</p>
          <h3 className="text-xl font-black text-slate-950">Chat con {userName}</h3>
        </div>
      </div>

      {/* Mensajes */}
      <div className="flex h-[440px] flex-col gap-2 overflow-y-auto px-5 py-4">
        {!messages.length ? (
          <div className="m-auto rounded-3xl border border-dashed border-slate-200 bg-slate-50/60 px-8 py-6 text-center text-sm font-bold text-slate-400">
            Sin mensajes aún. Escribe para iniciar la conversación.
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.sender_id === adminId;
            const time = new Date(msg.created_at).toLocaleString("es-MX", {
              hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short",
            });
            return (
              <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[78%] rounded-3xl px-4 py-3 shadow-sm ${
                  isMine
                    ? "rounded-br-md bg-sky-600 text-white"
                    : "rounded-bl-md border border-slate-200 bg-white text-slate-900"
                }`}>
                  {!isMine && (
                    <p className="mb-1 text-[10px] font-black uppercase tracking-wide text-sky-700">
                      {msg.profiles?.full_name || userName}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.message}</p>
                  <p className={`mt-1.5 text-right text-[10px] font-bold ${isMine ? "text-sky-200" : "text-slate-400"}`}>
                    {time}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSend}
        className="flex items-end gap-3 border-t border-slate-100 bg-white px-4 py-4"
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(e as any); }
          }}
          placeholder={`Responder a ${userName}...`}
          rows={1}
          className="min-h-[44px] flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100"
          style={{ maxHeight: "120px" }}
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
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { sendChatMessageAction } from "@/lib/actions/chat";

type ChatMessage = {
  id: string;
  message: string;
  message_type?: string | null;
  created_at: string;
  sender_id: string;
  profiles?: {
    full_name?: string | null;
    email?: string | null;
  } | null;
};

const TYPE_LABELS: Record<string, string> = {
  estado: "Cambio de estado",
  cuenta_bancaria: "Cuenta bancaria",
  pago_confirmado: "Pago confirmado",
  qr_enviado: "QR enviado",
};

function isSystem(type?: string | null) {
  return !!type && type !== "chat";
}

export function FlightMessages({
  messages: initial,
  flightId,
  currentUserId,
}: {
  messages: ChatMessage[];
  flightId: string;
  currentUserId: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initial);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const supabase = useMemo(() => createClient(), []);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel(`flight-chat-${flightId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "flight_messages",
          filter: `flight_id=eq.${flightId}`,
        },
        (payload: { new: ChatMessage }) => {
          const msg = payload.new as ChatMessage;
          setMessages((cur) => {
            if (cur.find((m) => m.id === msg.id)) return cur;
            return [...cur, msg];
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase, flightId]);

  // Scroll al fondo cuando llegan mensajes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setSending(true);
    setText("");

    const fd = new FormData();
    fd.append("flight_id", flightId);
    fd.append("message", trimmed);
    await sendChatMessageAction(fd);
    setSending(false);
  }

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white/90 shadow-xl shadow-slate-200/60 backdrop-blur overflow-hidden">
      {/* Header */}
      <div className="border-b border-slate-100 px-6 py-5">
        <p className="text-sm font-black uppercase tracking-[0.24em] text-sky-700">Mensajes</p>
        <h3 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Conversación del vuelo</h3>
      </div>

      {/* Burbuja de mensajes */}
      <div className="flex h-[420px] flex-col gap-2 overflow-y-auto overscroll-contain px-5 py-4">
        {!messages.length ? (
          <div className="m-auto rounded-3xl border border-dashed border-slate-300 bg-white/70 px-8 py-6 text-center text-sm font-bold text-slate-400">
            Todavía no hay mensajes. Sé el primero en escribir.
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.sender_id === currentUserId;
            const system = isSystem(msg.message_type);
            const time = new Date(msg.created_at).toLocaleString("es-MX", {
              hour: "2-digit",
              minute: "2-digit",
              day: "2-digit",
              month: "short",
            });

            // Mensajes de sistema — centrados
            if (system) {
              return (
                <div key={msg.id} className="flex justify-center py-1">
                  <div className="max-w-[85%] rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-center">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-sky-600">
                      {TYPE_LABELS[msg.message_type!] ?? msg.message_type}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-600">{msg.message}</p>
                    <p className="mt-1.5 text-[10px] font-bold text-slate-400">{time}</p>
                  </div>
                </div>
              );
            }

            // Chat libre — burbuja derecha/izquierda
            return (
              <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[78%] rounded-3xl px-4 py-3 shadow-sm ${isMine
                      ? "rounded-br-md bg-sky-600 text-white"
                      : "rounded-bl-md border border-slate-200 bg-white text-slate-900"
                    }`}
                >
                  {!isMine && (
                    <p className="mb-1 text-[10px] font-black uppercase tracking-[0.12em] text-sky-700">
                      {msg.profiles?.full_name || msg.profiles?.email || "Sistema"}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap text-sm leading-[1.55]">{msg.message}</p>
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
          placeholder="Escribe un mensaje... (Enter para enviar)"
          rows={1}
          className="min-h-[44px] flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100"
          style={{ maxHeight: "120px" }}
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-600 text-white shadow-md transition hover:bg-sky-700 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Enviar mensaje"
        >
          <Send size={17} />
        </button>
      </form>
    </section>
  );
}
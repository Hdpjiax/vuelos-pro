"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, CreditCard, Landmark, Send, UserRound } from "lucide-react";
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

function getLineValue(message: string, label: string) {
  const line = message.split("\n").find((item) => item.toLowerCase().startsWith(`${label.toLowerCase()}:`));
  return line?.split(":").slice(1).join(":").trim() ?? "";
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <button
      type="button"
      onClick={copy}
      disabled={!value}
      className="flex items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-[11px] font-black text-white transition hover:-translate-y-0.5 hover:bg-white/18 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
      {copied ? "Copiado" : label}
    </button>
  );
}

function BankAccountMessage({ message, time }: { message: string; time: string }) {
  const holder = getLineValue(message, "Titular");
  const bank = getLineValue(message, "Banco");
  const clabe = getLineValue(message, "CLABE");
  const original = getLineValue(message, "Total original");
  const percentage = getLineValue(message, "Porcentaje autorizado");
  const discount = getLineValue(message, "Descuento aplicado");
  const total = getLineValue(message, "Total a depositar");
  const note = getLineValue(message, "Nota");

  return (
    <div className="flex justify-center py-2">
      <div className="bank-account-chat-card w-full max-w-2xl overflow-hidden rounded-[1.75rem] border border-amber-300/30 bg-gradient-to-br from-slate-950 via-violet-950 to-fuchsia-950 text-white shadow-2xl shadow-fuchsia-950/20">
        <div className="border-b border-white/10 bg-white/5 px-5 py-4 text-center">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-200">Cuenta bancaria</p>
          <h4 className="mt-1 text-xl font-black">Datos para realizar tu depósito</h4>
          <p className="mt-1 text-xs font-semibold text-sky-100/80">Copia los datos necesarios y sube tu comprobante al terminar el pago.</p>
        </div>

        <div className="grid gap-3 p-5 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/8 p-4 sm:col-span-2">
            <div className="mb-2 flex items-center gap-2 text-amber-200">
              <UserRound size={16} />
              <span className="text-[10px] font-black uppercase tracking-[0.16em]">Titular</span>
            </div>
            <p className="break-words text-lg font-black text-white">{holder || "No disponible"}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <CopyButton value={holder} label="Copiar titular" />
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/8 p-4">
            <div className="mb-2 flex items-center gap-2 text-cyan-200">
              <Landmark size={16} />
              <span className="text-[10px] font-black uppercase tracking-[0.16em]">Banco</span>
            </div>
            <p className="break-words text-base font-black text-white">{bank || "No disponible"}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <CopyButton value={bank} label="Copiar banco" />
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/8 p-4">
            <div className="mb-2 flex items-center gap-2 text-fuchsia-200">
              <CreditCard size={16} />
              <span className="text-[10px] font-black uppercase tracking-[0.16em]">CLABE</span>
            </div>
            <p className="break-all font-mono text-lg font-black tracking-wide text-white">{clabe || "No disponible"}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <CopyButton value={clabe} label="Copiar CLABE" />
            </div>
          </div>

          <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4 sm:col-span-2">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-200">Resumen de pago</p>
            <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <p className="font-semibold text-sky-100/85">Total original: <span className="font-black text-white">{original || "-"}</span></p>
              <p className="font-semibold text-sky-100/85">Porcentaje autorizado: <span className="font-black text-white">{percentage || "-"}</span></p>
              {discount ? <p className="font-semibold text-sky-100/85">Descuento aplicado: <span className="font-black text-white">{discount}</span></p> : null}
              <p className="font-semibold text-sky-100/85">Total a depositar: <span className="font-black text-amber-100">{total || "-"}</span></p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <CopyButton value={total} label="Copiar total" />
            </div>
          </div>

          {note ? (
            <div className="rounded-2xl border border-white/10 bg-white/8 p-4 sm:col-span-2">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-200">Nota</p>
              <p className="mt-1 text-sm font-semibold leading-6 text-sky-100">{note}</p>
            </div>
          ) : null}
        </div>

        <div className="border-t border-white/10 bg-white/5 px-5 py-3 text-center">
          <p className="text-xs font-bold text-sky-100/85">Después de pagar, sube tu comprobante desde el detalle del vuelo.</p>
          <p className="mt-1 text-[10px] font-black text-amber-200">{time}</p>
        </div>
      </div>
    </div>
  );
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

            if (msg.message_type === "cuenta_bancaria") {
              return <BankAccountMessage key={msg.id} message={msg.message} time={time} />;
            }

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

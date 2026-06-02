type FlightMessage = {
  id: string;
  message: string;
  message_type?: string | null;
  created_at: string;
  profiles?: {
    full_name?: string | null;
    email?: string | null;
  } | null;
};

export function FlightMessages({ messages }: { messages: FlightMessage[] }) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/60 backdrop-blur">
      <div className="mb-5">
        <p className="text-sm font-black uppercase tracking-[0.24em] text-sky-700">Mensajes</p>
        <h3 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Conversación del vuelo</h3>
        <p className="mt-2 text-sm text-slate-500">Cada mensaje queda relacionado con el ID del vuelo.</p>
      </div>

      {!messages.length ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 px-6 py-8 text-center text-sm font-bold text-slate-500">
          Todavía no hay mensajes para este vuelo.
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((message) => (
            <article key={message.id} className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <p className="font-black text-slate-900">
                  {message.profiles?.full_name || message.profiles?.email || "Sistema"}
                </p>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                  {new Date(message.created_at).toLocaleString("es-MX")}
                </p>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{message.message}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

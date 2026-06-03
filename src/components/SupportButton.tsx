'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Headphones, MessageCircle, Mail, Phone } from 'lucide-react';

const WHATSAPP_URL = `https://wa.me/524431318488?text=Hola,%20necesito%20ayuda%20con%20mi%20reserva`;
const EMAIL_URL = `mailto:garia350@gmail.com?subject=Soporte%20-%20VuelosPro`;

function SupportPanel({ role, onClose }: { role: 'admin' | 'user'; onClose?: () => void }) {
  const router = useRouter();
  const chatPath = role === 'admin' ? '/admin/mensajes' : '/user/mensajes';

  const options = [
    {
      icon: <Phone size={17} />,
      label: 'WhatsApp',
      sublabel: '+52 443 131 8488',
      onClick: () => window.open(WHATSAPP_URL, '_blank'),
      color: 'text-green-400',
    },
    {
      icon: <Mail size={17} />,
      label: 'Correo',
      sublabel: 'garia350@gmail.com',
      onClick: () => window.open(EMAIL_URL, '_blank'),
      color: 'text-blue-400',
    },
    {
      icon: <MessageCircle size={17} />,
      label: 'Chat en la app',
      sublabel: 'Respuesta rápida',
      onClick: () => { router.push(chatPath); onClose?.(); },
      color: 'text-purple-400',
    },
  ];

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-white/10 bg-sky-900 shadow-xl">
      <p className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-sky-300/60">
        Soporte
      </p>
      {options.map((opt) => (
        <button
          key={opt.label}
          onClick={opt.onClick}
          className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/10"
        >
          <span className={opt.color}>{opt.icon}</span>
          <div>
            <p className="text-sm font-semibold text-sky-100">{opt.label}</p>
            <p className="text-xs text-sky-300/60">{opt.sublabel}</p>
          </div>
        </button>
      ))}
    </div>
  );
}

// ── Para móvil: se usa inline dentro del menú desplegable del Sidebar
export { SupportPanel };

// ── Para escritorio: botón flotante fijo en el lado izquierdo
export function SupportFloating({ role }: { role: 'admin' | 'user' }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed left-0 top-1/2 z-50 -translate-y-1/2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-r-2xl bg-sky-600 px-3 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-sky-700 active:scale-95"
      >
        <Headphones size={17} />
        <span className="whitespace-nowrap">¿Necesitas ayuda?</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-full top-0 z-50 ml-2 w-64">
            <SupportPanel role={role} onClose={() => setOpen(false)} />
          </div>
        </>
      )}
    </div>
  );
}
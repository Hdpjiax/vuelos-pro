'use client';

import { useState } from 'react';
import { Headphones, MessageCircle, Mail, Phone, X, ChevronDown } from 'lucide-react';

const WHATSAPP_NUMBER = '524431318488';
const SUPPORT_EMAIL = 'garia350@gmail.com';
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=Hola,%20necesito%20ayuda%20con%20mi%20reserva`;
const EMAIL_URL = `mailto:${SUPPORT_EMAIL}?subject=Soporte%20-%20Vuelos%20Pro`;

interface SupportButtonProps {
    onOpenChat: () => void; // función para abrir el chat interno
}

export function SupportButton({ onOpenChat }: SupportButtonProps) {
    const [open, setOpen] = useState(false);

    const options = [
        {
            icon: <Phone size={18} />,
            label: 'WhatsApp',
            sublabel: '+52 443 131 8488',
            onClick: () => window.open(WHATSAPP_URL, '_blank'),
            color: 'text-green-600',
            bg: 'hover:bg-green-50',
        },
        {
            icon: <Mail size={18} />,
            label: 'Correo',
            sublabel: SUPPORT_EMAIL,
            onClick: () => window.open(EMAIL_URL, '_blank'),
            color: 'text-blue-600',
            bg: 'hover:bg-blue-50',
        },
        {
            icon: <MessageCircle size={18} />,
            label: 'Chat en la app',
            sublabel: 'Respuesta rápida',
            onClick: () => { onOpenChat(); setOpen(false); },
            color: 'text-purple-600',
            bg: 'hover:bg-purple-50',
        },
    ];

    return (
        <>
            {/* ── MÓVIL: botón en la barra de navegación superior ── */}
            <div className="md:hidden">
                <button
                    onClick={() => setOpen(!open)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-blue-600 text-white text-sm font-medium shadow"
                >
                    <Headphones size={15} />
                    Soporte
                    <ChevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown móvil */}
                {open && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                        <div className="absolute right-4 top-14 z-50 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                            <p className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                ¿Cómo podemos ayudarte?
                            </p>
                            {options.map((opt) => (
                                <button
                                    key={opt.label}
                                    onClick={opt.onClick}
                                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${opt.bg}`}
                                >
                                    <span className={opt.color}>{opt.icon}</span>
                                    <div>
                                        <p className="text-sm font-medium text-gray-800">{opt.label}</p>
                                        <p className="text-xs text-gray-400">{opt.sublabel}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* ── ESCRITORIO / TABLET: flotante fijo a la izquierda ── */}
            <div className="hidden md:flex fixed left-0 top-1/2 -translate-y-1/2 z-50 flex-col items-start">
                {/* Botón principal */}
                <button
                    onClick={() => setOpen(!open)}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-3 rounded-r-2xl shadow-lg transition-all group"
                    style={{ writingMode: 'horizontal-tb' }}
                >
                    {open
                        ? <X size={18} />
                        : <Headphones size={18} />
                    }
                    <span className="text-sm font-medium whitespace-nowrap">
                        {open ? 'Cerrar' : '¿Necesitas ayuda?'}
                    </span>
                </button>

                {/* Panel de opciones */}
                {open && (
                    <div className="ml-1 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                        <p className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            Contáctanos
                        </p>
                        {options.map((opt) => (
                            <button
                                key={opt.label}
                                onClick={opt.onClick}
                                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${opt.bg}`}
                            >
                                <span className={opt.color}>{opt.icon}</span>
                                <div>
                                    <p className="text-sm font-medium text-gray-800">{opt.label}</p>
                                    <p className="text-xs text-gray-400">{opt.sublabel}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}
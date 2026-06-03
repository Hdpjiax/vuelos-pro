
'use client';

import { Plus } from 'lucide-react';

export function OpenSupportChatButton() {
    return (
        <button
            onClick={() => window.dispatchEvent(new CustomEvent('open-support-chat'))}
            className="flex items-center gap-2 rounded-2xl bg-sky-600 px-4 py-2.5 text-sm font-black text-white shadow transition hover:bg-sky-700 active:scale-95"
        >
            <Plus size={15} />
            Nueva conversación
        </button>
    );
}
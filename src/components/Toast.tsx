'use client';

/**
 * Toast — global feedback overlay.
 * Renders at the bottom of the screen above all other content.
 * Driven entirely by useToastStore.
 *
 * Place this once in the root layout or the main PhaserGame wrapper.
 */

import { useToastStore } from '@/store/useToastStore';
import type { Toast as TToast } from '@/store/useToastStore';

const ICONS: Record<TToast['type'], string> = {
    info:    'ℹ️',
    success: '✅',
    error:   '❌',
    warning: '⚠️',
};

const BG: Record<TToast['type'], string> = {
    info:    'bg-zinc-900/95 border-white/10',
    success: 'bg-emerald-900/95 border-emerald-500/30',
    error:   'bg-red-900/95 border-red-500/30',
    warning: 'bg-amber-900/95 border-amber-500/30',
};

export function ToastContainer() {
    const { toasts, dismissToast } = useToastStore();

    if (toasts.length === 0) return null;

    return (
        <div className="fixed bottom-24 inset-x-0 z-[500] flex flex-col items-center gap-2 px-4
                        pointer-events-none">
            {toasts.map(toast => (
                <div
                    key={toast.id}
                    onClick={() => dismissToast(toast.id)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl border
                                shadow-2xl max-w-xs w-full pointer-events-auto cursor-pointer
                                animate-toast-in backdrop-blur-md
                                ${BG[toast.type]}`}
                >
                    <span className="text-base flex-shrink-0">{ICONS[toast.type]}</span>
                    <p className="text-white text-sm font-medium flex-1 leading-snug">
                        {toast.message}
                    </p>
                    <button
                        onClick={(e) => { e.stopPropagation(); dismissToast(toast.id); }}
                        className="text-white/40 hover:text-white/80 flex-shrink-0 text-lg leading-none"
                        aria-label="Dismiss"
                    >
                        ×
                    </button>
                </div>
            ))}
        </div>
    );
}

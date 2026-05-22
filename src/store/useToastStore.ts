/**
 * useToastStore — lightweight global feedback system.
 *
 * Any component can call showToast() to give user feedback when they click
 * something disabled, locked, or "coming soon". Toasts auto-dismiss after 3s.
 * Max 3 toasts shown simultaneously (oldest removed first).
 */
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export type ToastType = 'info' | 'success' | 'error' | 'warning';

export interface Toast {
    id:      string;
    message: string;
    type:    ToastType;
}

interface ToastState {
    toasts: Toast[];
    showToast:   (message: string, type?: ToastType) => void;
    dismissToast:(id: string) => void;
}

export const useToastStore = create<ToastState>()(
    devtools(
        (set) => ({
            toasts: [],

            showToast: (message, type = 'info') => {
                const id = `toast_${Date.now()}_${Math.random()}`;
                set(
                    (s) => ({
                        // Keep max 3 toasts — drop oldest if over limit
                        toasts: [...s.toasts.slice(-2), { id, message, type }],
                    }),
                    false,
                    'showToast'
                );
                setTimeout(() => {
                    useToastStore.getState().dismissToast(id);
                }, 3200);
            },

            dismissToast: (id) =>
                set(
                    (s) => ({ toasts: s.toasts.filter(t => t.id !== id) }),
                    false,
                    'dismissToast'
                ),
        }),
        { name: 'ToastStore' }
    )
);

/** Convenience function — import and call from anywhere. */
export const showToast = (message: string, type: ToastType = 'info') =>
    useToastStore.getState().showToast(message, type);

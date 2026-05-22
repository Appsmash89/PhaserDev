/**
 * useSetsStore — SSOT for the coloring sets catalog.
 *
 * Gallery, any future "featured sets" UI, and admin components all read
 * from this single store. No component fetches independently.
 *
 * Rule 3: full idle/loading/success/error lifecycle.
 * Rule 4: deleteSet() provides blast-radius logic — also clears selectedSet
 *         in useGameStore if the deleted set is currently active.
 */
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { ColorSet } from './useGameStore';

type FetchStatus = 'idle' | 'loading' | 'success' | 'error';

interface SetsState {
    sets:        ColorSet[];
    fetchStatus: FetchStatus;
    fetchError:  string | null;

    /** Fetch all sets. Idempotent — won't re-fetch if already loaded. */
    fetchSets:   () => Promise<void>;

    /** Force re-fetch (call after upload or delete). */
    refetchSets: () => Promise<void>;

    /**
     * Remove a set by ID. Also nullifies selectedSet in useGameStore
     * if the deleted set is currently active (blast-radius Rule 4).
     */
    deleteSet:   (id: string) => Promise<void>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────────────────────

export const useSetsStore = create<SetsState>()(
    devtools(
        (set, get) => ({
            sets:        [],
            fetchStatus: 'idle',
            fetchError:  null,

            fetchSets: async () => {
                if (get().fetchStatus === 'success' || get().fetchStatus === 'loading') return;
                return get().refetchSets();
            },

            refetchSets: async () => {
                set({ fetchStatus: 'loading', fetchError: null }, false, 'refetchSets/loading');
                try {
                    const res = await fetch('/api/sets');
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    const data: ColorSet[] = await res.json();
                    set({ sets: data, fetchStatus: 'success' }, false, 'refetchSets/success');
                } catch (e) {
                    set(
                        { fetchStatus: 'error', fetchError: String(e) },
                        false,
                        'refetchSets/error'
                    );
                }
            },

            deleteSet: async (id) => {
                // Optimistic removal
                set(
                    (s) => ({ sets: s.sets.filter((set) => set.id !== id) }),
                    false,
                    'deleteSet/optimistic'
                );

                // Blast-radius: if the deleted set is currently playing, end the session
                const { useGameStore } = await import('./useGameStore');
                const gameState = useGameStore.getState();
                if (gameState.selectedSet?.id === id) {
                    gameState.endSession();
                }

                try {
                    const res = await fetch(`/api/sets/${id}`, { method: 'DELETE' });
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                } catch {
                    // Rollback optimistic removal on failure
                    get().refetchSets();
                }
            },
        }),
        { name: 'SetsStore' }
    )
);

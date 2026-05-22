/**
 * useSetsStore — SSOT for the coloring sets catalog.
 * genres: derived from the sets list, no separate fetch needed.
 */
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { ColorSet } from './useGameStore';

type FetchStatus = 'idle' | 'loading' | 'success' | 'error';

interface SetsState {
    sets:        ColorSet[];
    fetchStatus: FetchStatus;
    fetchError:  string | null;
    /** Derived: unique genre list (with "All" prepended). */
    genres:      string[];

    fetchSets:   () => Promise<void>;
    refetchSets: () => Promise<void>;
    /** Remove a set. Also ends the game session if the set is currently active. */
    deleteSet:   (id: string) => Promise<void>;
}

function deriveGenres(sets: ColorSet[]): string[] {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const s of sets) {
        if (s.genre && !seen.has(s.genre)) {
            seen.add(s.genre);
            list.push(s.genre);
        }
    }
    return ['All', ...list.sort()];
}

export const useSetsStore = create<SetsState>()(
    devtools(
        (set, get) => ({
            sets:        [],
            fetchStatus: 'idle',
            fetchError:  null,
            genres:      ['All'],

            fetchSets: async () => {
                if (get().fetchStatus === 'success' || get().fetchStatus === 'loading') return;
                return get().refetchSets();
            },

            refetchSets: async () => {
                set({ fetchStatus: 'loading', fetchError: null }, false, 'refetchSets/loading');
                try {
                    const res  = await fetch('/api/sets');
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    const data: ColorSet[] = await res.json();
                    set({
                        sets: data,
                        genres: deriveGenres(data),
                        fetchStatus: 'success',
                    }, false, 'refetchSets/success');
                } catch (e) {
                    set({ fetchStatus: 'error', fetchError: String(e) }, false, 'refetchSets/error');
                }
            },

            deleteSet: async (id) => {
                set(
                    (s) => {
                        const sets = s.sets.filter(set => set.id !== id);
                        return { sets, genres: deriveGenres(sets) };
                    },
                    false,
                    'deleteSet/optimistic'
                );

                const { useGameStore } = await import('./useGameStore');
                if (useGameStore.getState().selectedSet?.id === id) {
                    useGameStore.getState().endSession();
                }

                try {
                    const res = await fetch(`/api/sets/${id}`, { method: 'DELETE' });
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                } catch {
                    get().refetchSets();
                }
            },
        }),
        { name: 'SetsStore' }
    )
);

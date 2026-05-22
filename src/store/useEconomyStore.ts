/**
 * useEconomyStore — SSOT for Firebase auth state + user economy ledger.
 *
 * All async mutations (purchase, earn) live HERE as typed actions.
 * Components call actions; they never inline fetch() calls.
 *
 * Rule 2: No component may call _setUid/_setEconomy/_setAuthReady directly
 *         — they are only invoked by FirebaseProvider (the designated system actor).
 *
 * Rule 3: Every async action tracks idle/loading/success/error.
 *
 * Rule 4: Firestore onSnapshot teardown is managed by FirebaseProvider,
 *         which passes the unsubscribe function as a cleanup return.
 */
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { getIdToken } from '@/lib/firebase/client';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'error';
export type ActionStatus = 'idle' | 'loading' | 'success' | 'error';

export interface EconomyData {
    credits:       number;
    unlockedSets:  string[];
    hasRemovedAds: boolean;
}

export type EarnActionType = 'watch_ad' | 'click_affiliate' | 'daily_bonus';

interface EconomyState extends EconomyData {
    // ── Auth ────────────────────────────────────────────────────────────
    uid:        string | null;
    authStatus: AuthStatus;
    authError:  string | null;

    // ── Purchase ────────────────────────────────────────────────────────
    purchaseStatus:  ActionStatus;
    purchaseError:   string | null;
    purchasingSetId: string | null;  // which set is mid-purchase

    // ── Earn ────────────────────────────────────────────────────────────
    earnStatus:  ActionStatus;
    earnError:   string | null;

    // ── Derived helpers ─────────────────────────────────────────────────
    isSetUnlocked: (setId: string, creditCost: number) => boolean;
    canAfford:     (cost: number) => boolean;

    // ── Async actions (public API for components) ───────────────────────
    /**
     * Purchase a set. Deducts credits server-side and unlocks the set.
     * On success, returns true so Gallery can proceed to game.
     */
    purchase: (setId: string) => Promise<boolean>;

    /**
     * Award credits for a completed action (ad watch, affiliate click).
     * Server validates the actionType and awards the canonical amount.
     */
    earn: (actionType: EarnActionType) => Promise<void>;

    // ── Internal setters — ONLY called by FirebaseProvider ──────────────
    /** @internal */ _setUid:       (uid: string)              => void;
    /** @internal */ _setEconomy:   (data: Partial<EconomyData>) => void;
    /** @internal */ _setAuthStatus:(status: AuthStatus, error?: string) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────────────────────

export const useEconomyStore = create<EconomyState>()(
    devtools(
        (set, get) => ({
            // Auth
            uid:        null,
            authStatus: 'idle',
            authError:  null,

            // Economy
            credits:       0,
            unlockedSets:  [],
            hasRemovedAds: false,

            // Action statuses
            purchaseStatus:  'idle',
            purchaseError:   null,
            purchasingSetId: null,
            earnStatus:      'idle',
            earnError:       null,

            // ── Derived helpers ──────────────────────────────────────────
            isSetUnlocked: (setId, creditCost) => {
                if (creditCost === 0) return true;
                return get().unlockedSets.includes(setId);
            },
            canAfford: (cost) => get().credits >= cost,

            // ── purchase action ──────────────────────────────────────────
            purchase: async (setId) => {
                set(
                    { purchaseStatus: 'loading', purchaseError: null, purchasingSetId: setId },
                    false,
                    'purchase/loading'
                );
                try {
                    const token = await getIdToken();
                    const res   = await fetch('/api/economy/purchase', {
                        method:  'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                        body:    JSON.stringify({ setId }),
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
                    set(
                        { purchaseStatus: 'success', purchasingSetId: null },
                        false,
                        'purchase/success'
                    );
                    // onSnapshot will update credits/unlockedSets automatically
                    return true;
                } catch (e) {
                    set(
                        { purchaseStatus: 'error', purchaseError: String(e), purchasingSetId: null },
                        false,
                        'purchase/error'
                    );
                    return false;
                }
            },

            // ── earn action ──────────────────────────────────────────────
            earn: async (actionType) => {
                set(
                    { earnStatus: 'loading', earnError: null },
                    false,
                    'earn/loading'
                );
                try {
                    const token = await getIdToken();
                    const res   = await fetch('/api/economy/earn', {
                        method:  'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                        body:    JSON.stringify({ actionType }),
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
                    set({ earnStatus: 'success' }, false, 'earn/success');
                    // Brief success state, then reset to idle
                    setTimeout(() => {
                        useEconomyStore.setState({ earnStatus: 'idle' }, false, 'earn/reset');
                    }, 3000);
                } catch (e) {
                    set(
                        { earnStatus: 'error', earnError: String(e) },
                        false,
                        'earn/error'
                    );
                }
            },

            // ── Internal setters (FirebaseProvider ONLY) ─────────────────
            _setUid: (uid) =>
                set({ uid }, false, '_setUid'),

            _setEconomy: (data) =>
                set((s) => ({ ...s, ...data }), false, '_setEconomy'),

            _setAuthStatus: (authStatus, error) =>
                set({ authStatus, authError: error ?? null }, false, '_setAuthStatus'),
        }),
        { name: 'EconomyStore' }
    )
);

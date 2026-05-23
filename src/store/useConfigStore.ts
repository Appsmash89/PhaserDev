/**
 * useConfigStore — SSOT for admin-configurable runtime parameters.
 *
 * Separated from useGameStore because config is server-fetched data,
 * not game session state. Different consumers, different update cadence.
 *
 * Implements Rule 3 fully: isLoading / isSuccess / isError for the fetch.
 */
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface AppConfig {
    revealThreshold:          number;   // 0.0–1.0
    brushMin:                 number;   // px
    brushMax:                 number;   // px
    brushDefault:             number;   // px
    audioVolume:              number;   // 0.0–1.0
    lineArtFadeDuration:      number;   // ms
    coloredFadeDuration:      number;   // ms
    glitterEnabled:           boolean;
    glitterDuration:          number;   // ms
    // ── History replay gate ─────────────────────────────────────────────
    historyTaskEnabled:       boolean;  // master toggle
    historyTaskType:          'watch_ad' | 'click_affiliate' | 'spend_credits';
    historyTaskCreditCost:    number;   // only used when type=spend_credits
    historyTaskAffiliateUrl:  string;   // only used when type=click_affiliate
}

export const DEFAULT_CONFIG: AppConfig = {
    revealThreshold:          0.75,
    brushMin:                 10,
    brushMax:                 80,
    brushDefault:             40,
    audioVolume:              0.85,
    lineArtFadeDuration:      700,
    coloredFadeDuration:      900,
    glitterEnabled:           true,
    glitterDuration:          1100,
    // ── History task defaults ────────────────────────────────────────────
    historyTaskEnabled:       false,
    historyTaskType:          'watch_ad',
    historyTaskCreditCost:    30,
    historyTaskAffiliateUrl:  'https://www.canva.com',
};

type FetchStatus = 'idle' | 'loading' | 'success' | 'error';

interface ConfigState {
    config:      AppConfig;
    fetchStatus: FetchStatus;
    fetchError:  string | null;

    /** Fetch config from /api/config. Idempotent — only fetches once per session. */
    fetchConfig: () => Promise<void>;

    /** Optimistically update config (used by DevTools after successful save). */
    updateConfig: (patch: Partial<AppConfig>) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────────────────────

export const useConfigStore = create<ConfigState>()(
    devtools(
        (set, get) => ({
            config:      { ...DEFAULT_CONFIG },
            fetchStatus: 'idle',
            fetchError:  null,

            fetchConfig: async () => {
                // Already fetched — do not re-fetch
                if (get().fetchStatus === 'success' || get().fetchStatus === 'loading') return;

                set({ fetchStatus: 'loading', fetchError: null }, false, 'fetchConfig/loading');
                try {
                    const res  = await fetch('/api/config');
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    const data: AppConfig = await res.json();
                    set({ config: data, fetchStatus: 'success' }, false, 'fetchConfig/success');
                } catch (e) {
                    set(
                        { fetchStatus: 'error', fetchError: String(e) },
                        false,
                        'fetchConfig/error'
                    );
                    // Fallback: keep DEFAULT_CONFIG already in state
                }
            },

            updateConfig: (patch) =>
                set(
                    (s) => ({ config: { ...s.config, ...patch } }),
                    false,
                    'updateConfig'
                ),
        }),
        { name: 'ConfigStore' }
    )
);

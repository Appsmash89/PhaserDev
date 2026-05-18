import { create } from 'zustand';

export interface EconomyData {
    credits:       number;
    unlockedSets:  string[];
    hasRemovedAds: boolean;
}

interface EconomyStore extends EconomyData {
    uid:        string | null;
    isAuthReady: boolean;

    // Internal setters (called by FirebaseProvider)
    _setUid:      (uid: string) => void;
    _setEconomy:  (data: Partial<EconomyData>) => void;
    _setAuthReady:(ready: boolean) => void;

    // Helpers used by Gallery / UI
    isSetUnlocked: (setId: string, creditCost: number) => boolean;
    canAfford:     (cost: number) => boolean;
}

export const useEconomyStore = create<EconomyStore>((set, get) => ({
    uid:          null,
    isAuthReady:  false,
    credits:      0,
    unlockedSets: [],
    hasRemovedAds: false,

    _setUid:       (uid)  => set({ uid }),
    _setAuthReady: (ready) => set({ isAuthReady: ready }),
    _setEconomy:   (data) => set(prev => ({ ...prev, ...data })),

    isSetUnlocked: (setId, creditCost) => {
        if (creditCost === 0) return true;
        return get().unlockedSets.includes(setId);
    },

    canAfford: (cost) => get().credits >= cost,
}));

'use client';

import { useEffect } from 'react';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, setDoc }              from 'firebase/firestore';
import { auth, db, FIREBASE_CONFIGURED }        from '@/lib/firebase/client';
import { useEconomyStore }                       from '@/store/useEconomyStore';

const DEV_ECONOMY = { credits: 999, unlockedSets: [] as string[], hasRemovedAds: false };

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
    const { _setUid, _setEconomy, _setAuthReady } = useEconomyStore();

    useEffect(() => {
        // ── Dev mode: no Firebase config ─────────────────────────────
        if (!FIREBASE_CONFIGURED || !auth || !db) {
            _setUid('dev-uid');
            _setEconomy(DEV_ECONOMY);
            _setAuthReady(true);
            return;
        }

        // ── Production: Anonymous Auth + Firestore onSnapshot ─────────
        let firestoreUnsub: (() => void) | null = null;

        const authUnsub = onAuthStateChanged(auth, async (user) => {
            if (user) {
                _setUid(user.uid);
                const userRef = doc(db!, 'users', user.uid);

                firestoreUnsub = onSnapshot(userRef, async (snap) => {
                    if (snap.exists()) {
                        const d = snap.data();
                        _setEconomy({
                            credits:       d.credits       ?? 0,
                            unlockedSets:  d.unlockedSets  ?? [],
                            hasRemovedAds: d.hasRemovedAds ?? false,
                        });
                    } else {
                        // First launch: create user document via server
                        const token = await user.getIdToken();
                        fetch('/api/economy/init', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                        }).catch(() => {});
                    }
                });

                _setAuthReady(true);
            } else {
                // Not signed in yet — sign in anonymously
                try { await signInAnonymously(auth!); }
                catch { _setAuthReady(true); } // still unblock UI on failure
            }
        });

        return () => {
            authUnsub();
            firestoreUnsub?.();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return <>{children}</>;
}

'use client';

/**
 * FirebaseProvider — the SOLE authorized actor that calls internal
 * economy store setters (_setUid, _setEconomy, _setAuthStatus).
 *
 * This component is the designated "system actor" for all Firebase Auth
 * and Firestore subscription lifecycle management.
 *
 * Rule 4: All subscriptions (onAuthStateChanged, onSnapshot) are explicitly
 *         torn down in the useEffect cleanup return.
 */

import { useEffect } from 'react';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot }                       from 'firebase/firestore';
import { auth, db, FIREBASE_CONFIGURED }         from '@/lib/firebase/client';
import { useEconomyStore }                       from '@/store/useEconomyStore';
import { useConfigStore }                        from '@/store/useConfigStore';

/** Dev-mode economy — used when Firebase env vars are absent. */
const DEV_ECONOMY = {
    credits:       999,
    unlockedSets:  [] as string[],
    hasRemovedAds: false,
};

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
    const { _setUid, _setEconomy, _setAuthStatus } = useEconomyStore();
    const { fetchConfig }                           = useConfigStore();

    useEffect(() => {
        // Fetch admin config on mount (idempotent)
        fetchConfig();

        // ── Dev mode — no Firebase credentials ───────────────────────
        if (!FIREBASE_CONFIGURED || !auth || !db) {
            _setUid('dev-uid');
            _setEconomy(DEV_ECONOMY);
            _setAuthStatus('authenticated');
            return;
        }

        // ── Production — Anonymous Auth + Firestore real-time sync ────
        _setAuthStatus('loading');
        let firestoreUnsub: (() => void) | null = null;

        const authUnsub = onAuthStateChanged(auth, async (user) => {
            if (user) {
                _setUid(user.uid);

                const userRef = doc(db!, 'users', user.uid);

                firestoreUnsub = onSnapshot(
                    userRef,
                    (snap) => {
                        if (snap.exists()) {
                            const d = snap.data();
                            _setEconomy({
                                credits:       d.credits       ?? 0,
                                unlockedSets:  d.unlockedSets  ?? [],
                                hasRemovedAds: d.hasRemovedAds ?? false,
                            });
                            _setAuthStatus('authenticated');
                        } else {
                            // First launch: create user doc via server route
                            user.getIdToken().then((token) =>
                                fetch('/api/economy/init', {
                                    method: 'POST',
                                    headers: { Authorization: `Bearer ${token}` },
                                }).catch(() => {})
                            );
                        }
                    },
                    (error) => {
                        // Firestore snapshot error — still mark auth as done to unblock UI
                        console.error('[FirebaseProvider] onSnapshot error:', error);
                        _setAuthStatus('error', error.message);
                    }
                );

                _setAuthStatus('authenticated');
            } else {
                // Not signed in — sign in anonymously
                try {
                    await signInAnonymously(auth!);
                } catch (error) {
                    const msg = error instanceof Error ? error.message : String(error);
                    console.error('[FirebaseProvider] Anonymous auth failed:', msg);
                    // Unblock UI even if auth failed — user gets a degraded experience
                    _setAuthStatus('error', msg);
                }
            }
        });

        // ── Rule 4: Explicit teardown ─────────────────────────────────
        return () => {
            authUnsub();
            firestoreUnsub?.();
        };

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Intentionally empty — runs once on mount

    return <>{children}</>;
}

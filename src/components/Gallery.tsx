'use client';

import { useState, useEffect } from 'react';
import { useGameStore, ColorSet } from '@/store/useGameStore';
import { useEconomyStore }         from '@/store/useEconomyStore';
import { getIdToken }              from '@/lib/firebase/client';
import { MonetizationModal }       from './MonetizationModal';

export default function Gallery() {
    const { setGameState, setSelectedSet }       = useGameStore();
    const { credits, isSetUnlocked, canAfford }  = useEconomyStore();
    const [sets, setSets]                        = useState<ColorSet[]>([]);
    const [loading, setLoading]                  = useState(true);
    const [purchasing, setPurchasing]            = useState<string | null>(null);
    const [modalOpen, setModalOpen]              = useState(false);
    const [lockedSet, setLockedSet]              = useState<ColorSet | null>(null);

    useEffect(() => {
        fetch('/api/sets')
            .then(r => r.json())
            .then((data: ColorSet[]) => { setSets(data); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    // ── Gateway Flow ──────────────────────────────────────────────────────────
    const handleSelect = async (set: ColorSet) => {
        const cost = set.creditCost ?? 0;

        // Case 1: Free or already unlocked → proceed
        if (isSetUnlocked(set.id, cost)) {
            setSelectedSet(set);
            setGameState('PLAYING');
            return;
        }

        // Case 2: Locked but can afford → purchase then proceed
        if (canAfford(cost)) {
            setPurchasing(set.id);
            try {
                const token = await getIdToken();
                const res   = await fetch('/api/economy/purchase', {
                    method:  'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body:    JSON.stringify({ setId: set.id }),
                });
                if (res.ok) {
                    setSelectedSet(set);
                    setGameState('PLAYING');
                }
            } catch { /* ignore */ } finally { setPurchasing(null); }
            return;
        }

        // Case 3: Locked, insufficient funds → show Offer Wall
        setLockedSet(set);
        setModalOpen(true);
    };

    return (
        <div className="absolute inset-0 bg-white flex flex-col overflow-hidden">

            {/* Monetization Modal (Offer Wall) */}
            <MonetizationModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                lockedSetName={lockedSet?.name}
                creditCost={lockedSet?.creditCost}
            />

            {/* ── Header ──────────────────────────────────────────────────── */}
            <div className="w-full pt-10 pb-5 text-center flex-shrink-0 px-6">
                <div className="inline-flex items-center gap-2 bg-zinc-900 text-white text-xs font-bold
                                px-4 py-1.5 rounded-full mb-4 tracking-wide uppercase">
                    <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11"
                         viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77
                                 l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                    Studio Color
                </div>
                <h1 className="text-4xl font-extrabold text-zinc-900 tracking-tight leading-tight mb-2">
                    Choose a Page
                </h1>
                <p className="text-sm text-zinc-400 font-medium">
                    Swipe your finger to reveal the magic ✨
                </p>
                {/* Credits balance */}
                <div className="inline-flex items-center gap-1.5 mt-3 bg-violet-50 border border-violet-100
                                px-3 py-1 rounded-full">
                    <span className="text-violet-500 text-sm">💎</span>
                    <span className="text-violet-700 font-bold text-sm">{credits}</span>
                    <span className="text-violet-400 text-xs">credits</span>
                </div>
            </div>

            {/* ── Grid ────────────────────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto hide-scrollbar px-5 pb-8">
                {loading ? (
                    <div className="grid grid-cols-2 gap-4">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="aspect-square rounded-3xl bg-zinc-100 animate-pulse" />
                        ))}
                    </div>
                ) : sets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4
                                    text-zinc-300 py-20">
                        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"
                             viewBox="0 0 24 24" fill="none" stroke="currentColor"
                             strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2"/>
                            <path d="m9 9 6 6M15 9l-6 6"/>
                        </svg>
                        <p className="text-base font-medium text-zinc-400 text-center">
                            No coloring pages yet.<br/>Ask the admin to add some!
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-4">
                        {sets.map(set => {
                            const cost     = set.creditCost ?? 0;
                            const unlocked = isSetUnlocked(set.id, cost);
                            const busy     = purchasing === set.id;

                            return (
                                <button
                                    key={set.id}
                                    onClick={() => handleSelect(set)}
                                    disabled={busy}
                                    className="group relative aspect-square rounded-3xl overflow-hidden
                                               bg-zinc-100 shadow-sm hover:shadow-xl
                                               transition-all duration-300 active:scale-95
                                               border border-zinc-100 disabled:opacity-70"
                                >
                                    {/* Colored art preview */}
                                    <img src={set.coloredArtUrl ?? undefined} alt={set.name}
                                         className={`absolute inset-0 w-full h-full object-cover
                                                     transition-transform duration-500 group-hover:scale-105
                                                     ${!unlocked ? 'blur-sm scale-105' : ''}`} />

                                    {/* Line art hint overlay */}
                                    {unlocked && (
                                        <img src={set.lineArtUrl ?? undefined} alt="" aria-hidden="true"
                                             className="absolute inset-0 w-full h-full object-cover
                                                        opacity-30 mix-blend-multiply
                                                        transition-opacity duration-300 group-hover:opacity-0" />
                                    )}

                                    {/* Lock overlay for paid/unaffordable sets */}
                                    {!unlocked && (
                                        <div className="absolute inset-0 bg-black/40 flex flex-col
                                                        items-center justify-center gap-1.5">
                                            <span className="text-3xl">🔒</span>
                                            <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold
                                                            ${canAfford(cost)
                                                              ? 'bg-violet-500 text-white'
                                                              : 'bg-zinc-800/80 text-zinc-300'}`}>
                                                💎 {cost}
                                            </div>
                                        </div>
                                    )}

                                    {/* Busy spinner */}
                                    {busy && (
                                        <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                                            <svg className="animate-spin h-8 w-8 text-violet-500"
                                                 fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10"
                                                        stroke="currentColor" strokeWidth="4"/>
                                                <path className="opacity-75" fill="currentColor"
                                                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                                            </svg>
                                        </div>
                                    )}

                                    {/* Name bar */}
                                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t
                                                    from-black/60 via-black/20 to-transparent
                                                    p-3 translate-y-full group-hover:translate-y-0
                                                    transition-transform duration-300">
                                        <p className="text-white text-sm font-semibold truncate">
                                            {set.name}
                                        </p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

'use client';

/**
 * Gallery — discover tab + bottom navigation.
 *
 * Changes in this version:
 * - Paint-once: free sets (creditCost=0) that have been completed are removed from the feed
 * - Weighted feed sort: newest-first with a daily jitter so the feed feels alive
 * - History button (wireframe clock, B&W) in header — opens HistoryModal
 * - Purchased/unlocked indicator: outline SVG padlock-open icon at top-left of card
 * - Lock overlay uses wireframe SVG lock (no emoji) to not leak attention
 * - All history emoticons are black-and-white wireframe SVG
 */

import { useEffect, useState, useMemo } from 'react';
import { useSetsStore }      from '@/store/useSetsStore';
import { useEconomyStore }   from '@/store/useEconomyStore';
import { useGameStore }      from '@/store/useGameStore';
import { showToast }         from '@/store/useToastStore';
import { MonetizationModal } from './MonetizationModal';
import CreditWallet          from './CreditWallet';
import HistoryModal          from './HistoryModal';
import type { ColorSet }     from '@/store/useGameStore';

// ── Genre emoji map ────────────────────────────────────────────────────────
const GENRE_EMOJI: Record<string, string> = {
    'All':          '✨',
    'Portraits':    '👤',
    'Animals':      '🦋',
    'Nature':       '🌿',
    'Fantasy':      '🌟',
    'Architecture': '🏛️',
    'Abstract':     '🎨',
    'Space':        '🚀',
    'General':      '🖼️',
};
function genreEmoji(g: string) { return GENRE_EMOJI[g] ?? '🎭'; }

// ── Feed ordering ──────────────────────────────────────────────────────────
// Seeded random — stable within a session, changes per day
function seededRandom(seed: string): number {
    let h = 0;
    for (let i = 0; i < seed.length; i++) {
        h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
    }
    return (h >>> 0) / 0xFFFFFFFF;
}

/**
 * Sorts sets newest-first, with ±48h jitter that rotates daily.
 * Gives latest uploads the highest weight while keeping the feed feeling
 * alive (not a rigid timestamp sort).
 */
function weightedFeedSort(sets: ColorSet[], daySeed: string): ColorSet[] {
    const now = Date.now();
    return [...sets]
        .map(s => {
            const ageHours = (now - new Date(s.createdAt).getTime()) / 3_600_000;
            const jitter   = seededRandom(s.id + daySeed) * 48; // up to ±48h noise
            return { s, score: ageHours + jitter };
        })
        .sort((a, b) => a.score - b.score) // ascending = newest first
        .map(x => x.s);
}

// ── SVG icons (wireframe, black) ───────────────────────────────────────────
const IconLock = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
);

const IconUnlocked = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
        <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
    </svg>
);

const IconHistory = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="1 4 1 10 7 10"/>
        <path d="M3.51 15a9 9 0 1 0 .49-4.5"/>
        <polyline points="12 7 12 12 16 14"/>
    </svg>
);

// ─────────────────────────────────────────────────────────────────────────────

export default function Gallery() {
    const { sets, genres, fetchStatus, fetchError, fetchSets } = useSetsStore();
    const { credits, isSetUnlocked, canAfford, purchase,
            purchaseStatus, purchasingSetId, unlockedSets }    = useEconomyStore();
    const { startSession, activeTab, setActiveTab,
            completedSetIds }                                   = useGameStore();

    // ── Ephemeral UI state ──────────────────────────────────────────────
    const [selectedGenre, setSelectedGenre] = useState<string>('All');
    const [modalOpen,     setModalOpen]     = useState(false);
    const [lockedSet,     setLockedSet]     = useState<ColorSet | null>(null);
    const [showHistory,   setShowHistory]   = useState(false);

    // ── Hydrate catalog ─────────────────────────────────────────────────
    useEffect(() => { fetchSets(); }, [fetchSets]);

    // ── Daily seed for feed ordering ────────────────────────────────────
    const daySeed = useMemo(() => new Date().toDateString(), []);

    // ── Paint-once: consumed = free set that has been completed ─────────
    // Free sets that appear in completedSetIds are removed from the main feed.
    // Paid/unlocked sets always stay in the feed (user paid for them).
    const isConsumed = useMemo(() => {
        const consumedIds = new Set(
            sets
                .filter(s => s.creditCost === 0
                            && !unlockedSets.includes(s.id)
                            && completedSetIds.includes(s.id))
                .map(s => s.id)
        );
        return (id: string) => consumedIds.has(id);
    }, [sets, completedSetIds, unlockedSets]);

    // ── Derived: filtered + sorted feed ────────────────────────────────
    const visibleSets = useMemo(() => {
        const genreFiltered = selectedGenre === 'All'
            ? sets
            : sets.filter(s => s.genre === selectedGenre);
        const feedSets = genreFiltered.filter(s => !isConsumed(s.id));
        return weightedFeedSort(feedSets, daySeed);
    }, [sets, selectedGenre, isConsumed, daySeed]);

    // ── Gateway flow ────────────────────────────────────────────────────
    const handleSelect = async (set: ColorSet) => {
        const cost = set.creditCost ?? 0;

        if (isSetUnlocked(set.id, cost)) {
            startSession(set);
            return;
        }
        if (canAfford(cost)) {
            const ok = await purchase(set.id);
            if (ok) {
                showToast(`${set.name} unlocked! 🎉`, 'success');
                startSession(set);
            } else {
                showToast('Purchase failed. Please try again.', 'error');
            }
            return;
        }
        // Insufficient credits → offer wall
        setLockedSet(set);
        setModalOpen(true);
        showToast('Watch an ad to earn credits 💎', 'info');
    };

    const isLoading = fetchStatus === 'loading' || fetchStatus === 'idle';

    return (
        <div className="absolute inset-0 bg-[#faf9f7] flex flex-col">

            {/* ── Monetization Modal ─────────────────────────────────── */}
            <MonetizationModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                lockedSetName={lockedSet?.name}
                creditCost={lockedSet?.creditCost}
            />

            {/* ── History Modal ──────────────────────────────────────── */}
            {showHistory && (
                <HistoryModal
                    onClose={() => setShowHistory(false)}
                    onStartSession={startSession}
                />
            )}

            {/* ══════════════════════════════════════════════════════════
                  Discover tab content
               ════════════════════════════════════════════════════════ */}
            {activeTab === 'gallery' && (
                <>
                    {/* ── Header ────────────────────────────────────── */}
                    <div className="flex-shrink-0 pt-10 px-5 pb-3">
                        <div className="flex items-center justify-between mb-1">
                            <div>
                                <h1 className="text-2xl font-black text-zinc-900 tracking-tight">
                                    Discover
                                </h1>
                                <p className="text-xs text-zinc-400 font-medium">
                                    Pick a page to reveal the magic
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                {/* History button — wireframe clock, B&W */}
                                <button
                                    onClick={() => setShowHistory(true)}
                                    className="w-9 h-9 rounded-full flex items-center justify-center
                                               text-zinc-400 bg-transparent
                                               hover:bg-zinc-100 hover:text-zinc-700
                                               active:scale-90 active:bg-zinc-200
                                               transition-all duration-150
                                               focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400"
                                    aria-label="Completed sets history"
                                >
                                    <IconHistory />
                                </button>
                                {/* Credit pill */}
                                <button
                                    onClick={() => setActiveTab('wallet')}
                                    className="flex items-center gap-1.5 bg-violet-50 border border-violet-100
                                               px-3 py-2 rounded-full active:scale-95 transition-transform
                                               hover:bg-violet-100
                                               focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400"
                                >
                                    <span className="text-sm">💎</span>
                                    <span className="text-violet-700 font-bold text-sm">{credits}</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* ── Genre tabs ────────────────────────────────── */}
                    <div className="flex-shrink-0 px-4 pb-3">
                        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
                            {genres.map(genre => {
                                const active = selectedGenre === genre;
                                return (
                                    <button
                                        key={genre}
                                        onClick={() => setSelectedGenre(genre)}
                                        className={`flex items-center gap-1.5 flex-shrink-0 px-4 py-2
                                                    rounded-full text-sm font-semibold
                                                    transition-all duration-200 active:scale-95
                                                    focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400
                                                    ${active
                                                      ? 'bg-zinc-900 text-white shadow-md'
                                                      : 'bg-white text-zinc-500 border border-zinc-100 hover:border-zinc-200 hover:text-zinc-700'}`}
                                    >
                                        <span>{genreEmoji(genre)}</span>
                                        <span>{genre}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* ── Set feed (2-col, weighted by upload date) ──── */}
                    <div className="flex-1 overflow-y-auto hide-scrollbar px-4 pb-4">

                        {/* Loading */}
                        {isLoading && (
                            <div className="grid grid-cols-2 gap-3">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="aspect-[3/4] rounded-3xl bg-zinc-100 animate-pulse" />
                                ))}
                            </div>
                        )}

                        {/* Error */}
                        {fetchStatus === 'error' && (
                            <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                                <p className="text-4xl">😕</p>
                                <p className="text-zinc-600 font-semibold text-sm">Couldn't load sets</p>
                                <p className="text-zinc-400 text-xs max-w-[180px]">{fetchError}</p>
                                <button
                                    onClick={() => useSetsStore.getState().refetchSets()}
                                    className="mt-2 px-5 py-2 bg-zinc-900 text-white text-xs
                                               font-bold rounded-xl active:scale-95 transition-transform"
                                >
                                    Try Again
                                </button>
                            </div>
                        )}

                        {/* Empty */}
                        {fetchStatus === 'success' && visibleSets.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                                <p className="text-5xl">🎭</p>
                                <p className="text-zinc-600 font-semibold">
                                    No {selectedGenre !== 'All' ? selectedGenre : ''} sets available
                                </p>
                                <p className="text-zinc-400 text-xs">
                                    {selectedGenre !== 'All'
                                        ? 'Try a different genre, or check History for completed sets'
                                        : 'All caught up! Check your History for completed sets'}
                                </p>
                                {selectedGenre !== 'All' && (
                                    <button
                                        onClick={() => setSelectedGenre('All')}
                                        className="mt-1 text-violet-600 text-sm font-semibold"
                                    >
                                        Show All
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Feed grid */}
                        {fetchStatus === 'success' && visibleSets.length > 0 && (
                            <div className="grid grid-cols-2 gap-3">
                                {visibleSets.map(set => {
                                    const cost     = set.creditCost ?? 0;
                                    const unlocked = isSetUnlocked(set.id, cost);
                                    const purchased= cost > 0 && unlockedSets.includes(set.id);
                                    const busy     = purchaseStatus === 'loading' && purchasingSetId === set.id;
                                    const completed= completedSetIds.includes(set.id);

                                    return (
                                        <button
                                            key={set.id}
                                            onClick={() => handleSelect(set)}
                                            disabled={busy}
                                            className="group relative aspect-[3/4] rounded-3xl overflow-hidden
                                                       bg-zinc-100 shadow-sm
                                                       transition-all duration-200
                                                       hover:-translate-y-0.5 hover:shadow-lg
                                                       active:scale-[0.96] active:shadow-sm active:translate-y-0
                                                       focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400
                                                       disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-sm"
                                        >
                                            {/* Colored art */}
                                            {set.coloredArtUrl && (
                                                <img
                                                    src={set.coloredArtUrl}
                                                    alt={set.name}
                                                    className={`absolute inset-0 w-full h-full object-cover
                                                                transition-transform duration-500 group-hover:scale-[1.03]
                                                                ${!unlocked ? 'blur-sm scale-105' : ''}`}
                                                />
                                            )}

                                            {/* Subtle line-art overlay on unlocked, not-yet-completed sets */}
                                            {unlocked && set.lineArtUrl && !completed && (
                                                <img src={set.lineArtUrl} alt="" aria-hidden="true"
                                                     className="absolute inset-0 w-full h-full object-cover
                                                                opacity-25 mix-blend-multiply" />
                                            )}

                                            {/* Lock overlay — wireframe SVG, no emoji */}
                                            {!unlocked && (
                                                <div className="absolute inset-0 bg-black/45 flex flex-col
                                                                items-center justify-center gap-2">
                                                    <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm
                                                                    flex items-center justify-center text-white">
                                                        <IconLock />
                                                    </div>
                                                    <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold
                                                                    ${canAfford(cost)
                                                                      ? 'bg-violet-500 text-white'
                                                                      : 'bg-zinc-800/70 backdrop-blur-sm text-zinc-300'}`}>
                                                        💎 {cost}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Purchased indicator — wireframe unlock icon, top-left */}
                                            {purchased && (
                                                <div className="absolute top-2 left-2 z-10 w-6 h-6 rounded-full
                                                                bg-white/80 backdrop-blur-sm
                                                                flex items-center justify-center text-zinc-700">
                                                    <IconUnlocked />
                                                </div>
                                            )}

                                            {/* Completed badge */}
                                            {completed && (
                                                <div className="absolute top-3 left-3 bg-white/90 text-zinc-700
                                                                text-[10px] font-black px-2 py-0.5 rounded-full
                                                                flex items-center gap-1 border border-zinc-200">
                                                    ✓ Done
                                                </div>
                                            )}

                                            {/* New badge */}
                                            {!completed && (() => {
                                                const isNew = Date.now() - new Date(set.createdAt).getTime() < 3 * 24 * 60 * 60 * 1000;
                                                return isNew && (
                                                    <div className="absolute top-3 right-3 bg-amber-400 text-zinc-900
                                                                    text-[10px] font-black px-2 py-0.5 rounded-full">
                                                        NEW
                                                    </div>
                                                );
                                            })()}

                                            {/* Purchase spinner */}
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

                                            {/* Name + genre strip */}
                                            <div className="absolute bottom-0 inset-x-0
                                                            bg-gradient-to-t from-black/60 via-black/20 to-transparent
                                                            px-3 pt-8 pb-3">
                                                <p className="text-white font-bold text-xs leading-tight truncate">
                                                    {set.name}
                                                </p>
                                                {set.genre && (
                                                    <p className="text-white/60 text-[10px] mt-0.5">{set.genre}</p>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* ══════════════════════════════════════════════════════════
                  Credits / Wallet tab
               ════════════════════════════════════════════════════════ */}
            {activeTab === 'wallet' && (
                <div className="flex flex-col h-full">
                    <div className="flex-shrink-0 pt-10 px-5 pb-3">
                        <h1 className="text-2xl font-black text-zinc-900 tracking-tight mb-0.5">
                            Credits
                        </h1>
                        <p className="text-xs text-zinc-400 font-medium">
                            Earn and spend your balance
                        </p>
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <CreditWallet />
                    </div>
                </div>
            )}

            {/* ── Bottom tab bar ─────────────────────────────────────── */}
            <div className="flex-shrink-0 border-t border-zinc-100 bg-white/90 backdrop-blur-md
                            flex items-center justify-around px-6 py-2 pb-safe">
                <button
                    onClick={() => setActiveTab('gallery')}
                    className={`flex flex-col items-center gap-0.5 px-6 py-2 rounded-2xl transition-all
                                focus-visible:outline focus-visible:outline-2 focus-visible:outline-zinc-400
                                ${activeTab === 'gallery'
                                  ? 'text-zinc-900'
                                  : 'text-zinc-400 hover:text-zinc-600 active:scale-95'}`}
                >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="7" height="7" rx="1"/>
                        <rect x="14" y="3" width="7" height="7" rx="1"/>
                        <rect x="3" y="14" width="7" height="7" rx="1"/>
                        <rect x="14" y="14" width="7" height="7" rx="1"/>
                    </svg>
                    <span className="text-[10px] font-semibold">Discover</span>
                </button>
                <button
                    onClick={() => setActiveTab('wallet')}
                    className={`flex flex-col items-center gap-0.5 px-6 py-2 rounded-2xl transition-all
                                focus-visible:outline focus-visible:outline-2 focus-visible:outline-zinc-400
                                ${activeTab === 'wallet'
                                  ? 'text-zinc-900'
                                  : 'text-zinc-400 hover:text-zinc-600 active:scale-95'}`}
                >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                        <line x1="1" y1="10" x2="23" y2="10"/>
                    </svg>
                    <span className="text-[10px] font-semibold">Credits</span>
                </button>
            </div>
        </div>
    );
}

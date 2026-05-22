'use client';

/**
 * Gallery — discover tab + bottom navigation.
 *
 * Layout:
 *   ┌─────────────────┐
 *   │   Header        │  app branding + credit balance
 *   │   Genre tabs    │  horizontal scroll: All / Portraits / Fantasy …
 *   │   Set grid      │  2-col, filtered by selected genre
 *   ├─────────────────┤
 *   │  🎨   💎        │  bottom tab bar: Discover | Credits
 *   └─────────────────┘
 *
 * Local state (Rule 1 — ephemeral UI only):
 *   - selectedGenre: which genre tab is active (local filter)
 *   - modalOpen, lockedSet: controls the MonetizationModal
 */

import { useEffect, useState }  from 'react';
import { useSetsStore }         from '@/store/useSetsStore';
import { useEconomyStore }      from '@/store/useEconomyStore';
import { useGameStore }         from '@/store/useGameStore';
import { showToast }            from '@/store/useToastStore';
import { MonetizationModal }    from './MonetizationModal';
import CreditWallet             from './CreditWallet';
import type { ColorSet }        from '@/store/useGameStore';

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

export default function Gallery() {
    const { sets, genres, fetchStatus, fetchError, fetchSets } = useSetsStore();
    const { credits, isSetUnlocked, canAfford, purchase,
            purchaseStatus, purchasingSetId }                  = useEconomyStore();
    const { startSession, activeTab, setActiveTab,
            completedSetIds }                                  = useGameStore();

    // ── Ephemeral UI state ──────────────────────────────────────────────
    const [selectedGenre, setSelectedGenre] = useState<string>('All');
    const [modalOpen, setModalOpen]         = useState(false);
    const [lockedSet, setLockedSet]         = useState<ColorSet | null>(null);

    // ── Hydrate catalog ─────────────────────────────────────────────────
    useEffect(() => { fetchSets(); }, [fetchSets]);

    // ── Derived: filtered sets ──────────────────────────────────────────
    const visibleSets = selectedGenre === 'All'
        ? sets
        : sets.filter(s => s.genre === selectedGenre);

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
                                    Discover 🎨
                                </h1>
                                <p className="text-xs text-zinc-400 font-medium">
                                    Pick a page to reveal the magic
                                </p>
                            </div>
                            {/* Credit pill */}
                            <button
                                onClick={() => setActiveTab('wallet')}
                                className="flex items-center gap-1.5 bg-violet-50 border border-violet-100
                                           px-3 py-2 rounded-full active:scale-95 transition-transform"
                            >
                                <span className="text-sm">💎</span>
                                <span className="text-violet-700 font-bold text-sm">{credits}</span>
                            </button>
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
                                                    ${active
                                                      ? 'bg-zinc-900 text-white shadow-md'
                                                      : 'bg-white text-zinc-500 border border-zinc-100 hover:border-zinc-200'}`}
                                    >
                                        <span>{genreEmoji(genre)}</span>
                                        <span>{genre}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* ── Set grid ──────────────────────────────────── */}
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
                                    No {selectedGenre !== 'All' ? selectedGenre : ''} sets yet
                                </p>
                                <p className="text-zinc-400 text-xs">
                                    {selectedGenre !== 'All'
                                        ? 'Try a different genre tab'
                                        : 'Check back soon!'}
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

                        {/* Grid */}
                        {fetchStatus === 'success' && visibleSets.length > 0 && (
                            <div className="grid grid-cols-2 gap-3">
                                {visibleSets.map(set => {
                                    const cost     = set.creditCost ?? 0;
                                    const unlocked = isSetUnlocked(set.id, cost);
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
                                                       active:scale-[0.96] active:shadow-lg
                                                       disabled:opacity-70"
                                        >
                                            {/* Colored art */}
                                            {set.coloredArtUrl && (
                                                <img
                                                    src={set.coloredArtUrl}
                                                    alt={set.name}
                                                    className={`absolute inset-0 w-full h-full object-cover
                                                                transition-transform duration-500 group-active:scale-105
                                                                ${!unlocked ? 'blur-sm scale-105' : ''}`}
                                                />
                                            )}

                                            {/* Subtle line-art overlay on unlocked sets */}
                                            {unlocked && set.lineArtUrl && !completed && (
                                                <img src={set.lineArtUrl} alt="" aria-hidden="true"
                                                     className="absolute inset-0 w-full h-full object-cover
                                                                opacity-25 mix-blend-multiply" />
                                            )}

                                            {/* Lock overlay */}
                                            {!unlocked && (
                                                <div className="absolute inset-0 bg-black/45 flex flex-col
                                                                items-center justify-center gap-2">
                                                    <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-sm
                                                                    flex items-center justify-center text-2xl">
                                                        🔒
                                                    </div>
                                                    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold
                                                                    ${canAfford(cost)
                                                                      ? 'bg-violet-500 text-white'
                                                                      : 'bg-zinc-800/70 backdrop-blur-sm text-zinc-300'}`}>
                                                        💎 {cost} credits
                                                    </div>
                                                </div>
                                            )}

                                            {/* Completed badge */}
                                            {completed && (
                                                <div className="absolute top-3 left-3 bg-emerald-500 text-white
                                                                text-[10px] font-black px-2 py-0.5 rounded-full
                                                                flex items-center gap-1">
                                                    ✓ Done
                                                </div>
                                            )}

                                            {/* New badge (added within last 3 days) */}
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
                                                            bg-gradient-to-t from-black/70 via-black/30 to-transparent
                                                            p-3 pt-6">
                                                <p className="text-white text-sm font-bold truncate leading-tight">
                                                    {set.name}
                                                </p>
                                                <p className="text-white/60 text-[10px] font-medium">
                                                    {genreEmoji(set.genre)} {set.genre}
                                                </p>
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
                  Credits / Wallet tab content
               ════════════════════════════════════════════════════════ */}
            {activeTab === 'wallet' && (
                <>
                    <div className="flex-shrink-0 pt-10 px-5 pb-3">
                        <h1 className="text-2xl font-black text-zinc-900 tracking-tight">
                            Credits 💎
                        </h1>
                        <p className="text-xs text-zinc-400 font-medium">
                            Earn, spend, and manage your balance
                        </p>
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <CreditWallet />
                    </div>
                </>
            )}

            {/* ══════════════════════════════════════════════════════════
                  Bottom tab bar — always visible
               ════════════════════════════════════════════════════════ */}
            <div className="flex-shrink-0 bg-white border-t border-zinc-100
                            flex items-stretch safe-area-inset-bottom
                            shadow-[0_-4px_24px_-8px_rgba(0,0,0,0.06)]">
                <button
                    onClick={() => setActiveTab('gallery')}
                    className={`flex-1 flex flex-col items-center justify-center py-3 gap-1
                                transition-colors duration-150
                                ${activeTab === 'gallery' ? 'text-zinc-900' : 'text-zinc-400'}`}
                >
                    <span className="text-xl leading-none">🎨</span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider
                                      ${activeTab === 'gallery' ? 'text-zinc-800' : 'text-zinc-400'}`}>
                        Discover
                    </span>
                    {activeTab === 'gallery' && (
                        <span className="absolute bottom-0 w-8 h-0.5 bg-zinc-900 rounded-full" />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('wallet')}
                    className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 relative
                                transition-colors duration-150
                                ${activeTab === 'wallet' ? 'text-violet-600' : 'text-zinc-400'}`}
                >
                    <span className="text-xl leading-none">💎</span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider
                                      ${activeTab === 'wallet' ? 'text-violet-600' : 'text-zinc-400'}`}>
                        Credits
                    </span>
                    {activeTab === 'wallet' && (
                        <span className="absolute bottom-0 w-8 h-0.5 bg-violet-500 rounded-full" />
                    )}
                </button>
            </div>
        </div>
    );
}

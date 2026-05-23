'use client';

/**
 * HistoryModal — overlay showing all previously completed sets.
 *
 * Behaviour:
 * - Free sets that have been consumed (completedSetIds + creditCost=0):
 *     → Tapping shows replay gate (configured by admin historyTask* config)
 *     → If historyTaskEnabled=false, replays freely
 * - Purchased/unlocked sets that have been completed:
 *     → Tapping starts session immediately (user paid for it)
 *
 * Design (Stitch directives):
 * - M2: All interactive elements have explicit states
 * - M3: Skeleton loading, empty state, inline task progress
 * - M4: Replay gate bottom sheet — just "Replay" + options, no verbose copy
 */

import { useState }        from 'react';
import { useSetsStore }    from '@/store/useSetsStore';
import { useEconomyStore } from '@/store/useEconomyStore';
import { useGameStore }    from '@/store/useGameStore';
import { useConfigStore }  from '@/store/useConfigStore';
import { showToast }       from '@/store/useToastStore';
import type { ColorSet }   from '@/store/useGameStore';

// ── Inline spinner ─────────────────────────────────────────────────────────
function Spinner({ size = 16 }: { size?: number }) {
    return (
        <svg className="animate-spin" width={size} height={size} fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
    );
}

// ── Replay Gate — bottom sheet ─────────────────────────────────────────────
interface ReplayGateProps {
    set: ColorSet;
    onClose: () => void;
    onReplayed: () => void;
}

function ReplayGate({ set, onClose, onReplayed }: ReplayGateProps) {
    const { config }                          = useConfigStore();
    const { earn, purchase, credits, canAfford } = useEconomyStore();
    const { startSession }                    = useGameStore();

    const [busy, setBusy] = useState(false);

    const taskEnabled = (config as any).historyTaskEnabled ?? false;
    const taskType    = (config as any).historyTaskType    ?? 'watch_ad';
    const taskCost    = (config as any).historyTaskCreditCost ?? 30;
    const taskUrl     = (config as any).historyTaskAffiliateUrl ?? 'https://www.canva.com';

    const handleFreeReplay = () => {
        onClose();
        startSession(set);
        onReplayed();
    };

    const handleWatchAd = async () => {
        setBusy(true);
        try {
            await earn('watch_ad');
            showToast('Ad complete! Enjoy replaying 🎨', 'success');
            onClose();
            startSession(set);
            onReplayed();
        } finally { setBusy(false); }
    };

    const handleAffiliate = async () => {
        window.open(taskUrl, '_blank', 'noopener,noreferrer');
        setBusy(true);
        try {
            await earn('click_affiliate');
            showToast('Thanks! Enjoy replaying 🎨', 'success');
            onClose();
            startSession(set);
            onReplayed();
        } finally { setBusy(false); }
    };

    const handleSpendCredits = async () => {
        if (!canAfford(taskCost)) {
            showToast(`Not enough credits (need ${taskCost})`, 'error');
            return;
        }
        setBusy(true);
        try {
            const ok = await purchase(set.id + '_replay');
            if (ok) {
                showToast('Unlocked! Enjoy replaying 🎨', 'success');
                onClose();
                startSession(set);
                onReplayed();
            }
        } finally { setBusy(false); }
    };

    return (
        <>
            {/* Scrim */}
            <div className="absolute inset-0 z-[70] bg-black/40 backdrop-blur-sm"
                 onClick={onClose} aria-label="Close" />

            {/* Bottom sheet */}
            <div className="absolute bottom-0 inset-x-0 z-[80] bg-white rounded-t-[2rem]
                            px-6 pb-10 pt-4 shadow-[0_-8px_40px_-8px_rgba(0,0,0,0.25)]
                            animate-slide-up">
                {/* Handle */}
                <div className="w-10 h-1 bg-zinc-200 rounded-full mx-auto mb-5" />

                {/* Thumbnail + name */}
                <div className="flex items-center gap-3 mb-6">
                    {set.coloredArtUrl && (
                        <img src={set.coloredArtUrl} alt={set.name}
                             className="w-14 h-14 rounded-2xl object-cover border border-zinc-100" />
                    )}
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-0.5">
                            Replay
                        </p>
                        <p className="font-black text-zinc-900 text-base leading-tight">{set.name}</p>
                    </div>
                </div>

                <div className="flex flex-col gap-3">
                    {/* If task gate is disabled — free replay */}
                    {!taskEnabled && (
                        <button
                            onClick={handleFreeReplay}
                            className="w-full py-4 bg-zinc-900 text-white font-bold text-base rounded-2xl
                                       hover:bg-zinc-800 active:scale-[0.97] active:bg-zinc-950
                                       focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900
                                       transition-all duration-150"
                        >
                            Paint Again
                        </button>
                    )}

                    {/* If task gate is enabled — show configured option */}
                    {taskEnabled && taskType === 'watch_ad' && (
                        <button
                            onClick={handleWatchAd}
                            disabled={busy}
                            className="w-full py-4 bg-zinc-900 text-white font-bold text-base rounded-2xl
                                       flex items-center justify-center gap-2
                                       hover:bg-zinc-800 active:scale-[0.97]
                                       disabled:opacity-60 disabled:cursor-not-allowed
                                       focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900
                                       transition-all duration-150"
                        >
                            {busy ? <Spinner size={18} /> : (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                                     stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polygon points="23 7 16 12 23 17 23 7"/>
                                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                                </svg>
                            )}
                            {busy ? 'Loading…' : 'Watch short ad to replay'}
                        </button>
                    )}

                    {taskEnabled && taskType === 'click_affiliate' && (
                        <button
                            onClick={handleAffiliate}
                            disabled={busy}
                            className="w-full py-4 bg-zinc-900 text-white font-bold text-base rounded-2xl
                                       flex items-center justify-center gap-2
                                       hover:bg-zinc-800 active:scale-[0.97]
                                       disabled:opacity-60 disabled:cursor-not-allowed
                                       focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900
                                       transition-all duration-150"
                        >
                            {busy ? <Spinner size={18} /> : (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                                     stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                                </svg>
                            )}
                            {busy ? 'Processing…' : 'Visit partner link to replay'}
                        </button>
                    )}

                    {taskEnabled && taskType === 'spend_credits' && (
                        <button
                            onClick={handleSpendCredits}
                            disabled={busy || !canAfford(taskCost)}
                            className="w-full py-4 bg-zinc-900 text-white font-bold text-base rounded-2xl
                                       flex items-center justify-center gap-2
                                       hover:bg-zinc-800 active:scale-[0.97]
                                       disabled:opacity-60 disabled:cursor-not-allowed
                                       focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900
                                       transition-all duration-150"
                        >
                            {busy ? <Spinner size={18} /> : (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                                     stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10"/>
                                    <line x1="12" y1="8" x2="12" y2="16"/>
                                    <line x1="8" y1="12" x2="16" y2="12"/>
                                </svg>
                            )}
                            {busy ? 'Processing…' : `Spend ${taskCost} credits to replay`}
                        </button>
                    )}

                    {/* Insufficient credits note */}
                    {taskEnabled && taskType === 'spend_credits' && !canAfford(taskCost) && (
                        <p className="text-center text-xs text-zinc-400">
                            You have {credits} credits — need {taskCost}
                        </p>
                    )}

                    {/* Cancel */}
                    <button
                        onClick={onClose}
                        className="w-full py-4 bg-zinc-100 text-zinc-600 font-semibold text-base rounded-2xl
                                   hover:bg-zinc-200 active:scale-[0.97] active:bg-zinc-300
                                   focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400
                                   transition-all duration-150"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </>
    );
}

// ── HistoryModal ───────────────────────────────────────────────────────────

interface Props {
    onClose: () => void;
    onStartSession: (set: ColorSet) => void;
}

export default function HistoryModal({ onClose, onStartSession }: Props) {
    const { sets }                      = useSetsStore();
    const { completedSetIds }           = useGameStore();
    const { unlockedSets, isSetUnlocked } = useEconomyStore();

    const [gateSet, setGateSet] = useState<ColorSet | null>(null);

    // Build ordered history: completed sets, newest-completion first
    const historyItems = completedSetIds
        .slice()
        .reverse()
        .map(id => sets.find(s => s.id === id))
        .filter((s): s is ColorSet => s !== undefined);

    const handleTap = (set: ColorSet) => {
        const isPaid = set.creditCost > 0 && unlockedSets.includes(set.id);
        if (isPaid) {
            // Paid/unlocked — replay freely
            onClose();
            onStartSession(set);
            return;
        }
        // Free consumed set — show replay gate
        setGateSet(set);
    };

    return (
        <div className="absolute inset-0 z-[60] flex flex-col bg-[#faf9f7]">

            {/* Replay gate sheet */}
            {gateSet && (
                <ReplayGate
                    set={gateSet}
                    onClose={() => setGateSet(null)}
                    onReplayed={onClose}
                />
            )}

            {/* Header */}
            <div className="flex-shrink-0 pt-10 px-5 pb-4 flex items-center gap-3
                            border-b border-zinc-100">
                <button
                    onClick={onClose}
                    className="p-2 -ml-1 rounded-full text-zinc-400
                               hover:text-zinc-900 hover:bg-zinc-100
                               active:scale-90 active:bg-zinc-200
                               focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400
                               transition-all duration-150"
                    aria-label="Close history"
                >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                         stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m15 18-6-6 6-6"/>
                    </svg>
                </button>
                <div>
                    <h2 className="text-xl font-black text-zinc-900 tracking-tight leading-tight">
                        History
                    </h2>
                    <p className="text-xs text-zinc-400">
                        {historyItems.length} completed {historyItems.length === 1 ? 'set' : 'sets'}
                    </p>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto hide-scrollbar px-4 py-4">
                {historyItems.length === 0 ? (
                    // M3: Empty state
                    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none"
                             stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="1 4 1 10 7 10"/>
                            <path d="M3.51 15a9 9 0 1 0 .49-4.5"/>
                            <polyline points="12 7 12 12 16 14"/>
                        </svg>
                        <div>
                            <p className="font-bold text-zinc-500 text-base">No completed sets yet</p>
                            <p className="text-zinc-400 text-xs mt-1">
                                Completed sets will appear here
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-3 gap-2.5">
                        {historyItems.map(set => {
                            const isPaid = set.creditCost > 0 && unlockedSets.includes(set.id);
                            return (
                                <button
                                    key={set.id}
                                    onClick={() => handleTap(set)}
                                    className="relative aspect-square rounded-2xl overflow-hidden
                                               bg-zinc-100 shadow-sm
                                               hover:-translate-y-0.5 hover:shadow-md
                                               active:scale-[0.95]
                                               focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400
                                               transition-all duration-200"
                                >
                                    {set.coloredArtUrl ? (
                                        <img src={set.coloredArtUrl} alt={set.name}
                                             className="absolute inset-0 w-full h-full object-cover" />
                                    ) : (
                                        <div className="absolute inset-0 bg-zinc-200 flex items-center justify-center">
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                                                 stroke="#9ca3af" strokeWidth="1.5">
                                                <rect x="3" y="3" width="18" height="18" rx="2"/>
                                                <circle cx="8.5" cy="8.5" r="1.5"/>
                                                <polyline points="21 15 16 10 5 21"/>
                                            </svg>
                                        </div>
                                    )}

                                    {/* Replay affordance overlay */}
                                    <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors duration-200
                                                    flex items-center justify-center">
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200
                                                        w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm
                                                        flex items-center justify-center">
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                                                 stroke="#111827" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <polygon points="5 3 19 12 5 21 5 3"/>
                                            </svg>
                                        </div>
                                    </div>

                                    {/* Paid indicator */}
                                    {isPaid && (
                                        <div className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full
                                                        bg-white/80 backdrop-blur-sm
                                                        flex items-center justify-center text-zinc-700">
                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
                                                 stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <rect x="3" y="11" width="18" height="11" rx="2"/>
                                                <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
                                            </svg>
                                        </div>
                                    )}

                                    {/* Set name at bottom */}
                                    <div className="absolute bottom-0 inset-x-0
                                                    bg-gradient-to-t from-black/60 to-transparent
                                                    px-2 pt-4 pb-1.5">
                                        <p className="text-white font-bold text-[9px] truncate leading-tight">
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

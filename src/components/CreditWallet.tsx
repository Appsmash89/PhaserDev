'use client';

/**
 * CreditWallet — full credits/economy screen (second tab in Gallery).
 *
 * UX Principles Applied:
 *
 * M2 — Affordances:
 *   - Each earn button has: Default / Hover / Active / Loading / Disabled states
 *   - Loading state is PER-BUTTON (not a global lock) — shows spinner inline
 *     so the user knows exactly which action is in progress
 *   - Disabled buttons show cursor-not-allowed + explicit tooltip via toast
 *
 * M3 — System Status:
 *   - Success/error feedback appears inline, adjacent to the originating button
 *   - Balance card animates credit increase after earn
 *   - Ad countdown shows real time progress, "done" state + claim CTA
 *
 * M4 — Defensive Design:
 *   - Ad overlay has no accidental dismiss — user must explicitly claim reward
 *   - Premium IAP placeholder is clearly labelled "Coming Soon" so user
 *     understands it's not yet purchasable (tombstone state)
 */

import { useState, useEffect } from 'react';
import { useEconomyStore } from '@/store/useEconomyStore';
import { showToast }       from '@/store/useToastStore';
import type { EarnActionType } from '@/store/useEconomyStore';

// ── Ad Countdown ──────────────────────────────────────────────────────────────

function AdOverlay({ onComplete }: { onComplete: () => void }) {
    const [remaining, setRemaining] = useState(15);
    const [done, setDone]           = useState(false);

    useEffect(() => {
        const iv = setInterval(() => {
            setRemaining(prev => {
                if (prev <= 1) { clearInterval(iv); setDone(true); return 0; }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(iv);
    }, []);

    const pct = ((15 - remaining) / 15) * 100;

    return (
        <div className="fixed inset-0 z-[300] bg-zinc-950 flex flex-col items-center justify-center gap-6 p-8">
            {/* M3: Progress shown throughout — user is never left wondering how long */}
            <div className="w-full max-w-sm aspect-video bg-zinc-900 rounded-2xl border border-zinc-800
                            flex items-center justify-center">
                <div className="text-center">
                    <p className="text-4xl mb-3">🎬</p>
                    <p className="text-zinc-400 text-sm font-semibold">Your ad is playing…</p>
                    <p className="text-zinc-600 text-xs mt-1">Thank you for supporting Studio Color</p>
                </div>
            </div>
            <div className="w-full max-w-sm">
                <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-violet-500 rounded-full transition-all duration-1000 ease-linear"
                         style={{ width: `${pct}%` }} />
                </div>
                <p className="text-zinc-500 text-xs text-center mt-2">
                    {done
                        ? '✅ +50 Credits ready to claim!'
                        : remaining > 0
                            ? `${remaining}s remaining`
                            : 'Almost done…'}
                </p>
            </div>
            {/* M4: Claim button only appears when ad is done — no accidental early exit */}
            {done && (
                <button
                    onClick={onComplete}
                    className="px-8 py-4 bg-violet-600 text-white font-bold text-base rounded-2xl
                               hover:bg-violet-500
                               active:scale-95 active:bg-violet-700
                               focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300
                               transition-all duration-150"
                >
                    Claim +50 Credits 🎉
                </button>
            )}
        </div>
    );
}

// ── Earn options config ───────────────────────────────────────────────────────

const EARN_OPTIONS: {
    id:       EarnActionType;
    emoji:    string;
    title:    string;
    subtitle: string;
    reward:   number;
    url?:     string;
}[] = [
    { id: 'watch_ad',        emoji: '🎬', title: 'Watch a Short Ad',     subtitle: '15 seconds · Unskippable',  reward: 50 },
    { id: 'click_affiliate', emoji: '🔗', title: 'Explore Creative Tools', subtitle: 'Opens in new tab',          reward: 10, url: 'https://www.canva.com' },
];

// ── Inline Spinner ────────────────────────────────────────────────────────────

function Spinner() {
    return (
        <svg className="animate-spin h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
    );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function CreditWallet() {
    const {
        credits, earn, earnStatus, earnError,
        hasRemovedAds, unlockedSets,
    } = useEconomyStore();

    // M2/M3: Track WHICH specific action is loading (not just "something is loading")
    const [activeAction, setActiveAction] = useState<EarnActionType | null>(null);
    const [showAd,       setShowAd]       = useState(false);
    // M3: Track inline success flash per button
    const [lastSuccess,  setLastSuccess]  = useState<EarnActionType | null>(null);

    const isAnyLoading = earnStatus === 'loading';

    const handleEarn = async (opt: typeof EARN_OPTIONS[0]) => {
        if (isAnyLoading) {
            showToast('One action at a time — please wait ⏳', 'warning');
            return;
        }
        if (opt.id === 'watch_ad') { setShowAd(true); return; }
        if (opt.url) window.open(opt.url, '_blank', 'noopener,noreferrer');

        setActiveAction(opt.id);
        await earn(opt.id);
        setActiveAction(null);
        // M3: inline success signal near the originating button
        setLastSuccess(opt.id);
        setTimeout(() => setLastSuccess(null), 3000);
    };

    const handleDailyBonus = async () => {
        if (isAnyLoading) { showToast('One action at a time — please wait ⏳', 'warning'); return; }
        setActiveAction('daily_bonus');
        await earn('daily_bonus');
        setActiveAction(null);
        setLastSuccess('daily_bonus');
        setTimeout(() => setLastSuccess(null), 3000);
    };

    const handleAdComplete = async () => {
        setShowAd(false);
        setActiveAction('watch_ad');
        await earn('watch_ad');
        setActiveAction(null);
        setLastSuccess('watch_ad');
        setTimeout(() => setLastSuccess(null), 3000);
    };

    return (
        <>
            {showAd && <AdOverlay onComplete={handleAdComplete} />}

            <div className="flex flex-col h-full overflow-y-auto hide-scrollbar pb-8">

                {/* ── Balance Card ─────────────────────────────────────── */}
                <div className="mx-4 mt-4 rounded-3xl overflow-hidden bg-zinc-900 text-white shadow-xl">
                    <div className="px-6 pt-6 pb-4">
                        <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-1">
                            Your Balance
                        </p>
                        <div className="flex items-end gap-2">
                            {/* M3: Credits number updates visually when earned */}
                            <span key={credits} className="text-5xl font-black tracking-tighter animate-credit-pop">
                                {credits}
                            </span>
                            <span className="text-zinc-400 text-lg font-semibold pb-1">credits</span>
                        </div>
                        <div className="mt-3 flex gap-3">
                            <div className="flex-1 bg-zinc-800 rounded-xl p-3 text-center">
                                <p className="text-lg font-black">{unlockedSets.length}</p>
                                <p className="text-[11px] text-zinc-500 uppercase tracking-wider">Unlocked</p>
                            </div>
                            <div className="flex-1 bg-zinc-800 rounded-xl p-3 text-center">
                                <p className="text-lg font-black">{hasRemovedAds ? 'Yes' : 'No'}</p>
                                <p className="text-[11px] text-zinc-500 uppercase tracking-wider">Ad-free</p>
                            </div>
                        </div>
                    </div>
                    <div className="h-1 bg-gradient-to-r from-violet-500 via-rose-400 to-amber-400" />
                </div>

                {/* M3: Global earn error — only shown for errors without a specific button context */}
                {earnStatus === 'error' && !activeAction && (
                    <div className="mx-4 mt-3 py-3 px-4 bg-red-50 border border-red-200
                                    rounded-2xl text-red-600 text-sm flex items-center gap-2">
                        <span>❌</span>
                        <span>{earnError ?? 'Something went wrong. Please try again.'}</span>
                    </div>
                )}

                {/* ── Daily Bonus ─────────────────────────────────────── */}
                <div className="px-4 mt-5">
                    <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2 px-1">
                        Daily Reward
                    </p>
                    <div className="bg-gradient-to-r from-amber-50 to-rose-50 border border-amber-100
                                    rounded-2xl p-4 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-2xl flex-shrink-0">
                            🌅
                        </div>
                        <div className="flex-1">
                            <p className="font-bold text-zinc-800 text-sm">Daily Login Bonus</p>
                            <p className="text-xs text-zinc-500">+25 credits every day</p>
                        </div>
                        {/* M3: Inline result right on the button */}
                        {lastSuccess === 'daily_bonus'
                            ? (
                                <span className="text-emerald-600 font-black text-sm animate-toast-in">
                                    +25 ✓
                                </span>
                            )
                            : (
                                /* M2: All 5 states: default / hover / active / loading / disabled */
                                <button
                                    onClick={handleDailyBonus}
                                    disabled={isAnyLoading}
                                    aria-busy={activeAction === 'daily_bonus'}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-amber-400 text-zinc-900 text-xs font-black rounded-xl
                                               hover:bg-amber-300
                                               active:scale-95 active:bg-amber-500
                                               disabled:opacity-50 disabled:cursor-not-allowed
                                               focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500
                                               transition-all duration-150"
                                >
                                    {activeAction === 'daily_bonus' ? <Spinner /> : null}
                                    {activeAction === 'daily_bonus' ? 'Claiming…' : 'Claim'}
                                </button>
                            )
                        }
                    </div>
                </div>

                {/* ── Earn More ───────────────────────────────────────── */}
                <div className="px-4 mt-5">
                    <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2 px-1">
                        Earn More Credits
                    </p>
                    <div className="flex flex-col gap-3">
                        {EARN_OPTIONS.map(opt => {
                            const isThisLoading = activeAction === opt.id;
                            const isThisSuccess = lastSuccess === opt.id;
                            const isDisabled    = isAnyLoading && !isThisLoading;

                            return (
                                <button
                                    key={opt.id}
                                    onClick={() => handleEarn(opt)}
                                    disabled={isAnyLoading}
                                    aria-busy={isThisLoading}
                                    className={`flex items-center gap-4 rounded-2xl p-4 text-left
                                                transition-all duration-150
                                                focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400
                                                ${isThisSuccess
                                                    ? 'bg-emerald-50 border border-emerald-200 shadow-sm'
                                                    : isThisLoading
                                                        ? 'bg-violet-50 border border-violet-200 shadow-sm'
                                                        : isDisabled
                                                            ? 'bg-white border border-zinc-100 shadow-sm opacity-50 cursor-not-allowed'
                                                            : 'bg-white border border-zinc-100 shadow-sm hover:shadow-md hover:border-zinc-200 active:scale-[0.98] active:shadow-sm cursor-pointer'
                                                }`}
                                >
                                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0
                                                     transition-colors duration-150
                                                     ${isThisSuccess ? 'bg-emerald-100' : isThisLoading ? 'bg-violet-100' : 'bg-violet-50'}`}>
                                        {isThisLoading ? <Spinner /> : isThisSuccess ? '✅' : opt.emoji}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-bold text-zinc-800 text-sm">
                                            {isThisSuccess ? 'Credits added!' : opt.title}
                                        </p>
                                        <p className="text-xs text-zinc-400">
                                            {isThisLoading ? 'Processing…' : isThisSuccess ? 'Check your balance above' : opt.subtitle}
                                        </p>
                                    </div>
                                    {/* M3: Reward amount — shown in all non-loading states */}
                                    {!isThisLoading && (
                                        <div className="text-right flex-shrink-0">
                                            <span className={`font-black text-base ${isThisSuccess ? 'text-emerald-600' : 'text-violet-600'}`}>
                                                +{opt.reward}
                                            </span>
                                            <p className="text-[10px] text-zinc-400">credits</p>
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* ── Premium — clearly tombstoned ─────────────────────── */}
                <div className="px-4 mt-5">
                    <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2 px-1">
                        Premium
                    </p>
                    {/* M4: Tombstone UI — button shows "Coming Soon", tapping explains why */}
                    <button
                        onClick={() => showToast('Google Play Billing is coming soon! 🚀', 'info')}
                        aria-disabled="true"
                        className="w-full flex items-center gap-4 bg-zinc-900 rounded-2xl p-4 text-left
                                   hover:bg-zinc-800
                                   active:scale-[0.98]
                                   focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-600
                                   transition-all duration-150 shadow-xl"
                    >
                        <div className="w-11 h-11 rounded-xl bg-amber-500/20 flex items-center justify-center text-xl flex-shrink-0">
                            ⭐
                        </div>
                        <div className="flex-1">
                            <p className="font-bold text-white text-sm">Remove Ads + 1000 Credits</p>
                            <p className="text-xs text-zinc-500">One-time purchase via Google Play</p>
                        </div>
                        <span className="text-amber-400 text-[10px] font-bold uppercase tracking-wider
                                         border border-amber-400/40 px-2 py-0.5 rounded-full flex-shrink-0">
                            Soon
                        </span>
                    </button>
                </div>

                {/* ── How credits work ─────────────────────────────────── */}
                <div className="px-4 mt-6">
                    <div className="bg-violet-50 border border-violet-100 rounded-2xl p-4">
                        <p className="text-xs font-bold text-violet-700 mb-2">💡 How Credits Work</p>
                        <ul className="text-xs text-violet-600 space-y-1 leading-relaxed">
                            <li>• Earn credits by watching ads or completing offers</li>
                            <li>• Spend credits to unlock premium coloring sets</li>
                            <li>• Free sets are always available — no credits needed</li>
                            <li>• Credits don't expire</li>
                        </ul>
                    </div>
                </div>
            </div>
        </>
    );
}

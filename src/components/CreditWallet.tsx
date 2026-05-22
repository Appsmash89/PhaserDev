'use client';

/**
 * CreditWallet — full credits/economy screen (second tab in Gallery).
 *
 * Shows: balance, daily bonus placeholder, earn options, purchase history placeholder.
 * All async actions go through useEconomyStore (SSOT).
 */

import { useState, useEffect } from 'react';
import { useEconomyStore } from '@/store/useEconomyStore';
import { showToast }       from '@/store/useToastStore';
import type { EarnActionType } from '@/store/useEconomyStore';

// ── Ad Countdown ──────────────────────────────────────────────────────────────

function AdOverlay({ onComplete }: { onComplete: () => void }) {
    const [remaining, setRemaining] = useState(15);
    const [done, setDone]           = useState(false);

    // Rule 4: interval torn down in cleanup
    useEffect(() => {
        const iv = setInterval(() => {
            setRemaining(prev => {
                if (prev <= 1) {
                    clearInterval(iv);
                    setDone(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(iv);
    }, []);

    const pct = ((15 - remaining) / 15) * 100;

    return (
        <div className="fixed inset-0 z-[300] bg-zinc-950 flex flex-col items-center justify-center gap-6 p-8">
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
                    {done ? '✅ +50 Credits earned!' : remaining > 0 ? `Skip in ${remaining}s` : 'Loading reward…'}
                </p>
            </div>
            {done && (
                <button onClick={onComplete}
                        className="px-8 py-3 bg-violet-600 text-white font-bold rounded-2xl
                                   active:scale-95 transition-transform">
                    Claim Reward 🎉
                </button>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Earn options
// ─────────────────────────────────────────────────────────────────────────────

const EARN_OPTIONS: {
    id:         EarnActionType;
    emoji:      string;
    title:      string;
    subtitle:   string;
    reward:     number;
    url?:       string;
}[] = [
    {
        id: 'watch_ad', emoji: '🎬',
        title:    'Watch a Short Ad',
        subtitle: '15 seconds · Unskippable',
        reward:   50,
    },
    {
        id: 'click_affiliate', emoji: '🔗',
        title:    'Explore Creative Tools',
        subtitle: 'Opens in new tab',
        reward:   10,
        url:      'https://www.canva.com',
    },
    {
        id: 'daily_bonus', emoji: '🌅',
        title:    'Daily Login Bonus',
        subtitle: 'Come back every day',
        reward:   25,
    },
];

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function CreditWallet() {
    const {
        credits, earn, earnStatus, earnError,
        hasRemovedAds, unlockedSets,
    } = useEconomyStore();

    const [showAd, setShowAd] = useState(false);

    const handleEarn = async (opt: typeof EARN_OPTIONS[0]) => {
        if (earnStatus === 'loading') {
            showToast('Please wait for the current action to finish…', 'warning');
            return;
        }
        if (opt.id === 'watch_ad') {
            setShowAd(true);
            return;
        }
        if (opt.url) {
            window.open(opt.url, '_blank', 'noopener,noreferrer');
        }
        await earn(opt.id);
    };

    const handleAdComplete = async () => {
        setShowAd(false);
        await earn('watch_ad');
    };

    return (
        <>
            {showAd && <AdOverlay onComplete={handleAdComplete} />}

            <div className="flex flex-col h-full overflow-y-auto hide-scrollbar pb-8">

                {/* ── Balance Card ─────────────────────────────────────── */}
                <div className="mx-4 mt-4 rounded-3xl overflow-hidden
                                bg-zinc-900 text-white shadow-xl">
                    <div className="px-6 pt-6 pb-4">
                        <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-1">
                            Your Balance
                        </p>
                        <div className="flex items-end gap-2">
                            <span className="text-5xl font-black tracking-tighter">{credits}</span>
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

                    {/* Gradient strip */}
                    <div className="h-1 bg-gradient-to-r from-violet-500 via-rose-400 to-amber-400" />
                </div>

                {/* ── Earn Status Banner ──────────────────────────────── */}
                {earnStatus === 'success' && (
                    <div className="mx-4 mt-3 py-3 px-4 bg-emerald-50 border border-emerald-200
                                    rounded-2xl flex items-center gap-2">
                        <span className="text-emerald-600 font-black text-lg">+</span>
                        <p className="text-emerald-700 font-semibold text-sm">Credits added to your balance!</p>
                    </div>
                )}
                {earnStatus === 'error' && (
                    <div className="mx-4 mt-3 py-3 px-4 bg-red-50 border border-red-200
                                    rounded-2xl text-red-600 text-sm">
                        {earnError ?? 'Something went wrong. Please try again.'}
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
                        <button
                            onClick={() => handleEarn(EARN_OPTIONS.find(o => o.id === 'daily_bonus')!)}
                            disabled={earnStatus === 'loading'}
                            className="px-4 py-2 bg-amber-400 text-zinc-900 text-xs font-black rounded-xl
                                       active:scale-95 transition-transform disabled:opacity-60"
                        >
                            Claim
                        </button>
                    </div>
                </div>

                {/* ── Earn More ───────────────────────────────────────── */}
                <div className="px-4 mt-5">
                    <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2 px-1">
                        Earn More Credits
                    </p>
                    <div className="flex flex-col gap-3">
                        {EARN_OPTIONS.filter(o => o.id !== 'daily_bonus').map(opt => (
                            <button
                                key={opt.id}
                                onClick={() => handleEarn(opt)}
                                disabled={earnStatus === 'loading'}
                                className="flex items-center gap-4 bg-white border border-zinc-100
                                           rounded-2xl p-4 shadow-sm text-left
                                           active:scale-[0.98] transition-all disabled:opacity-60
                                           hover:shadow-md hover:border-zinc-200"
                            >
                                <div className="w-11 h-11 rounded-xl bg-violet-50 flex items-center
                                                justify-center text-xl flex-shrink-0">
                                    {opt.emoji}
                                </div>
                                <div className="flex-1">
                                    <p className="font-bold text-zinc-800 text-sm">{opt.title}</p>
                                    <p className="text-xs text-zinc-400">{opt.subtitle}</p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <span className="text-violet-600 font-black text-base">+{opt.reward}</span>
                                    <p className="text-[10px] text-zinc-400">credits</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── Premium ─────────────────────────────────────────── */}
                <div className="px-4 mt-5">
                    <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2 px-1">
                        Premium
                    </p>
                    <button
                        onClick={() => showToast('Google Play Billing coming soon! 🚀', 'info')}
                        className="w-full flex items-center gap-4 bg-zinc-900 rounded-2xl p-4 text-left
                                   active:scale-[0.98] transition-transform shadow-xl"
                    >
                        <div className="w-11 h-11 rounded-xl bg-amber-500/20 flex items-center justify-center text-xl flex-shrink-0">
                            ⭐
                        </div>
                        <div className="flex-1">
                            <p className="font-bold text-white text-sm">Remove Ads + 1000 Credits</p>
                            <p className="text-xs text-zinc-500">One-time purchase via Google Play</p>
                        </div>
                        <span className="text-amber-400 text-[10px] font-bold uppercase tracking-wider border border-amber-400/40
                                         px-2 py-0.5 rounded-full flex-shrink-0">
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

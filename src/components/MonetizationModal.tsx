'use client';

import { useState, useEffect, useRef } from 'react';
import { getIdToken } from '@/lib/firebase/client';
import { useEconomyStore } from '@/store/useEconomyStore';

interface Offer {
    label: string;
    url: string;
    credits: number;
}

const PARTNER_OFFERS: Offer[] = [
    { label: 'Explore Creative Tools', url: 'https://www.canva.com', credits: 10 },
    { label: 'Discover Art Supplies',  url: 'https://www.amazon.in', credits: 10 },
];

interface Props {
    open:    boolean;
    onClose: () => void;
    /** Set the user was trying to open */
    lockedSetName?: string;
    creditCost?: number;
}

// ── Rewarded Ad Countdown Overlay ────────────────────────────────────────────
function AdOverlay({ onComplete }: { onComplete: () => void }) {
    const [remaining, setRemaining] = useState(15);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        intervalRef.current = setInterval(() => {
            setRemaining(prev => {
                if (prev <= 1) {
                    clearInterval(intervalRef.current!);
                    setTimeout(onComplete, 300);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(intervalRef.current!);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const pct = ((15 - remaining) / 15) * 100;

    return (
        <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center gap-6 p-8">
            {/* Simulated ad placeholder */}
            <div className="w-full max-w-sm aspect-video bg-zinc-800 rounded-2xl border border-zinc-700
                            flex items-center justify-center">
                <div className="text-center">
                    <p className="text-zinc-500 text-sm font-semibold">Advertisement</p>
                    <p className="text-zinc-700 text-xs mt-1">Your reward is loading…</p>
                </div>
            </div>

            {/* Progress bar */}
            <div className="w-full max-w-sm">
                <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-violet-500 rounded-full transition-all duration-1000 ease-linear"
                         style={{ width: `${pct}%` }} />
                </div>
                <p className="text-zinc-500 text-xs text-center mt-2">
                    {remaining > 0 ? `Reward in ${remaining}s` : '✅ +50 Credits!'}
                </p>
            </div>
        </div>
    );
}

// ── Main Monetization Modal ───────────────────────────────────────────────────
export function MonetizationModal({ open, onClose, lockedSetName, creditCost }: Props) {
    const { credits } = useEconomyStore();
    const [showAd, setShowAd]         = useState(false);
    const [earning, setEarning]       = useState(false);
    const [earnMsg, setEarnMsg]       = useState<string | null>(null);

    if (!open) return null;

    const callEarn = async (actionType: string, label: string) => {
        setEarning(true);
        try {
            const token = await getIdToken();
            const res   = await fetch('/api/economy/earn', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body:    JSON.stringify({ actionType }),
            });
            const data = await res.json();
            if (res.ok) {
                setEarnMsg(`✅ ${label} — Credits added!`);
                setTimeout(() => setEarnMsg(null), 2500);
            } else {
                setEarnMsg(`❌ ${data.error ?? 'Error'}`);
            }
        } catch {
            setEarnMsg('❌ Network error');
        } finally {
            setEarning(false);
        }
    };

    const handleAdComplete = async () => {
        setShowAd(false);
        await callEarn('watch_ad', '+50 Credits');
    };

    const handlePartnerOffer = async (offer: Offer) => {
        window.open(offer.url, '_blank', 'noopener,noreferrer');
        await callEarn('click_affiliate', `+${offer.credits} Credits`);
    };

    return (
        <>
            {showAd && <AdOverlay onComplete={handleAdComplete} />}

            {/* Backdrop */}
            <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
                 onClick={onClose}>
                <div className="w-full max-w-sm bg-zinc-950 border border-white/10 rounded-3xl
                                overflow-hidden shadow-2xl"
                     onClick={e => e.stopPropagation()}>

                    {/* Header */}
                    <div className="px-6 pt-6 pb-4 border-b border-white/5">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="font-black text-white text-lg">💎 Get Credits</h2>
                                {lockedSetName && creditCost && (
                                    <p className="text-xs text-zinc-500 mt-0.5">
                                        <span className="text-amber-400 font-semibold">{creditCost} credits</span>
                                        {' '}needed to unlock <span className="text-zinc-300">{lockedSetName}</span>
                                    </p>
                                )}
                            </div>
                            <div className="text-right">
                                <p className="text-2xl font-black text-violet-400">{credits}</p>
                                <p className="text-[10px] text-zinc-600 uppercase tracking-widest">Your balance</p>
                            </div>
                        </div>
                    </div>

                    {/* Earn message */}
                    {earnMsg && (
                        <div className="mx-4 mt-3 py-2 px-3 bg-emerald-900/30 border border-emerald-700/30 rounded-xl
                                        text-emerald-400 text-xs font-semibold text-center">
                            {earnMsg}
                        </div>
                    )}

                    <div className="p-4 flex flex-col gap-3">

                        {/* ── Watch Ad ─────────────────────────────── */}
                        <button
                            onClick={() => setShowAd(true)}
                            disabled={earning}
                            className="w-full flex items-center gap-4 bg-violet-600/15 border border-violet-500/30
                                       rounded-2xl p-4 hover:bg-violet-600/25 transition-all active:scale-[0.98]
                                       disabled:opacity-50">
                            <div className="w-10 h-10 rounded-xl bg-violet-600/20 flex items-center justify-center text-xl flex-shrink-0">
                                🎬
                            </div>
                            <div className="flex-1 text-left">
                                <p className="font-bold text-white text-sm">Watch a Short Ad</p>
                                <p className="text-xs text-zinc-500">15 seconds • Unskippable</p>
                            </div>
                            <span className="text-violet-400 font-black text-sm">+50</span>
                        </button>

                        {/* ── Partner Offers ────────────────────────── */}
                        <div className="bg-zinc-900/60 border border-white/5 rounded-2xl p-3 flex flex-col gap-2">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 px-1">
                                Partner Offers
                            </p>
                            {PARTNER_OFFERS.map(offer => (
                                <button key={offer.url}
                                        onClick={() => handlePartnerOffer(offer)}
                                        disabled={earning}
                                        className="flex items-center gap-3 p-2.5 rounded-xl
                                                   hover:bg-white/5 transition-all active:scale-[0.98]
                                                   disabled:opacity-50 text-left">
                                    <span className="text-lg">🔗</span>
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-white">{offer.label}</p>
                                        <p className="text-[11px] text-zinc-500">Opens new tab</p>
                                    </div>
                                    <span className="text-amber-400 font-black text-sm">+{offer.credits}</span>
                                </button>
                            ))}
                        </div>

                        {/* ── Premium (placeholder) ─────────────────── */}
                        <button className="w-full flex items-center gap-4 bg-amber-900/10 border border-amber-700/20
                                           rounded-2xl p-4 opacity-75 cursor-not-allowed">
                            <div className="w-10 h-10 rounded-xl bg-amber-600/15 flex items-center justify-center text-xl flex-shrink-0">
                                ⭐
                            </div>
                            <div className="flex-1 text-left">
                                <p className="font-bold text-white text-sm">Remove Ads + 1000 Credits</p>
                                <p className="text-xs text-zinc-500">Coming soon • Google Play Billing</p>
                            </div>
                            <span className="text-amber-500 text-[10px] font-bold uppercase tracking-wider">Soon</span>
                        </button>
                    </div>

                    {/* Footer close */}
                    <div className="px-4 pb-5">
                        <button onClick={onClose}
                                className="w-full py-3 text-zinc-500 text-sm font-semibold
                                           hover:text-zinc-300 transition-colors">
                            Maybe Later
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}

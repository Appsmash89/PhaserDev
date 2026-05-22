'use client';

/**
 * WelcomeScreen — branded splash screen shown at every app launch.
 *
 * Design: clean white/cream, floating art previews, elegant typography.
 * On "Start Exploring" → dispatches dismissWelcome() → GALLERY phase.
 */

import { useEffect, useState } from 'react';
import { useGameStore }  from '@/store/useGameStore';
import { useSetsStore }  from '@/store/useSetsStore';

export default function WelcomeScreen() {
    const { dismissWelcome } = useGameStore();
    const { sets, fetchSets } = useSetsStore();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        fetchSets();
    }, [fetchSets]);

    // Grab up to 3 preview images
    const previews = sets
        .filter(s => s.coloredArtUrl)
        .slice(0, 3);

    return (
        <div className="absolute inset-0 bg-[#faf9f7] flex flex-col overflow-hidden select-none">

            {/* ── Soft background texture ──────────────────────────────── */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 right-0 w-80 h-80 rounded-full
                                bg-violet-100/60 blur-[80px] translate-x-1/3 -translate-y-1/3" />
                <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full
                                bg-amber-100/60 blur-[60px] -translate-x-1/3 translate-y-1/3" />
                <div className="absolute top-1/2 left-1/2 w-48 h-48 rounded-full
                                bg-rose-100/40 blur-[50px] -translate-x-1/2 -translate-y-1/2" />
            </div>

            {/* ── Floating art previews ─────────────────────────────────── */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {previews[0] && (
                    <div className={`absolute top-[8%] right-[-8%] w-40 h-52 rounded-3xl overflow-hidden
                                    shadow-2xl rotate-6
                                    transition-all duration-1000
                                    ${mounted ? 'opacity-40 translate-y-0' : 'opacity-0 translate-y-8'}`}
                         style={{ transitionDelay: '200ms' }}>
                        <img src={previews[0].coloredArtUrl!} alt="" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-white/60" />
                    </div>
                )}
                {previews[1] && (
                    <div className={`absolute top-[18%] left-[-10%] w-36 h-44 rounded-3xl overflow-hidden
                                    shadow-xl -rotate-8
                                    transition-all duration-1000
                                    ${mounted ? 'opacity-30 translate-y-0' : 'opacity-0 translate-y-8'}`}
                         style={{ transitionDelay: '350ms' }}>
                        <img src={previews[1].coloredArtUrl!} alt="" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-white/70" />
                    </div>
                )}
                {previews[2] && (
                    <div className={`absolute bottom-[22%] right-[-5%] w-32 h-40 rounded-3xl overflow-hidden
                                    shadow-xl rotate-3
                                    transition-all duration-1000
                                    ${mounted ? 'opacity-25 translate-y-0' : 'opacity-0 translate-y-8'}`}
                         style={{ transitionDelay: '500ms' }}>
                        <img src={previews[2].coloredArtUrl!} alt="" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-white/80" />
                    </div>
                )}
                {/* Fallback decorative card if no sets loaded yet */}
                {previews.length === 0 && (
                    <div className="absolute top-[10%] right-[-8%] w-40 h-52 rounded-3xl
                                    bg-gradient-to-br from-violet-100 to-rose-100 rotate-6 opacity-40 shadow-xl" />
                )}
            </div>

            {/* ── Main content ─────────────────────────────────────────── */}
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-8 text-center">

                {/* Logo */}
                <div className={`transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
                    <div className="w-20 h-20 rounded-[28px] bg-zinc-900 flex items-center justify-center
                                    mb-8 mx-auto shadow-[0_8px_32px_-8px_rgba(0,0,0,0.3)]">
                        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36"
                             viewBox="0 0 24 24" fill="none" stroke="white"
                             strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08"/>
                            <path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z"/>
                        </svg>
                    </div>

                    <h1 className="text-5xl font-black text-zinc-900 tracking-tighter leading-none mb-3">
                        Studio<br/>Color
                    </h1>

                    <p className="text-zinc-400 text-base font-medium tracking-wide mb-12">
                        Reveal the art within ✨
                    </p>
                </div>

                {/* Feature pills */}
                <div className={`flex flex-wrap gap-2 justify-center mb-12
                                 transition-all duration-700 delay-200
                                 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                    {[
                        { emoji: '🎨', text: 'Brush to reveal' },
                        { emoji: '✨', text: 'Magic transitions' },
                        { emoji: '💎', text: 'Unlock new art' },
                    ].map(({ emoji, text }) => (
                        <div key={text} className="flex items-center gap-1.5 bg-white border border-zinc-100
                                                    px-3 py-1.5 rounded-full shadow-sm">
                            <span className="text-sm">{emoji}</span>
                            <span className="text-xs font-semibold text-zinc-500">{text}</span>
                        </div>
                    ))}
                </div>

                {/* CTA */}
                <div className={`w-full transition-all duration-700 delay-300
                                 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                    <button
                        onClick={dismissWelcome}
                        className="w-full py-4 bg-zinc-900 text-white font-bold text-base rounded-2xl
                                   shadow-[0_4px_24px_-4px_rgba(0,0,0,0.4)]
                                   active:scale-[0.97] transition-transform duration-100
                                   hover:bg-zinc-800"
                    >
                        Start Exploring 🚀
                    </button>
                    <p className="text-zinc-300 text-xs mt-3 font-medium">
                        Free to start · No sign-up required
                    </p>
                </div>
            </div>

            {/* ── Bottom branding ───────────────────────────────────────── */}
            <div className={`relative z-10 pb-8 text-center
                             transition-all duration-700 delay-400
                             ${mounted ? 'opacity-100' : 'opacity-0'}`}>
                <p className="text-[10px] text-zinc-300 uppercase tracking-widest font-semibold">
                    By Studio Color · v1.0
                </p>
            </div>
        </div>
    );
}

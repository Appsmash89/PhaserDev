'use client';

/**
 * PhaserGame — Phaser engine container + reveal UI orchestrator.
 *
 * Key behaviors:
 * - #game-container is NEVER unmounted (would destroy WebGL context permanently)
 * - Video is positioned at EXACT imageDisplayRect from store → pixel-perfect
 *   seamless transition from coloring image to reveal video
 * - set.videoMuted controls whether video plays with audio after reveal
 *
 * Local state (Rule 1 — ephemeral UI only):
 *   showBrushPicker, videoReady
 */

import { forwardRef, useLayoutEffect, useRef, useState, useEffect, useCallback } from 'react';
import { StartGame }       from '@/game/game';
import { EventBus }        from '@/game/EventBus';
import { useGameStore }    from '@/store/useGameStore';
import { useConfigStore }  from '@/store/useConfigStore';
import { showToast }       from '@/store/useToastStore';
import Gallery             from './Gallery';
import WelcomeScreen       from './WelcomeScreen';
import { ToastContainer }  from './Toast';

export interface IRefPhaserGame { game: Phaser.Game | null; }

export const PhaserGame = forwardRef<IRefPhaserGame>(function PhaserGame(_, ref) {
    const gameContainerRef = useRef<HTMLDivElement>(null);
    const gameInstanceRef  = useRef<Phaser.Game | null>(null);
    const audioRef         = useRef<HTMLAudioElement>(null);
    const videoRef         = useRef<HTMLVideoElement>(null);
    const canvasFadeTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ── Store reads ───────────────────────────────────────────────────────
    const {
        gamePhase, selectedSet, brushSize, setBrushSize,
        isAssetLoading, revealPhase, revealPct, showGlitter,
        imageDisplayRect,
        onRevealThreshold, onRevealComplete, setRevealPct,
        dismissGlitter, endSession,
    } = useGameStore();

    const { config: appConfig } = useConfigStore();

    // ── Ephemeral UI (Rule 1) ──────────────────────────────────────────────
    const [showBrushPicker, setShowBrushPicker] = useState(false);
    const [videoReady,      setVideoReady]      = useState(false);

    // ── Derived ────────────────────────────────────────────────────────────
    const isPlaying    = gamePhase === 'PLAYING';
    const isComplete   = gamePhase === 'COMPLETE';
    const canvasHidden = isComplete || revealPhase === 'FADING' || revealPhase === 'COMPLETE';
    const canvasFading = revealPhase === 'THRESHOLD';
    const pct          = Math.round(revealPct * 100);
    const thresholdPct = Math.round(appConfig.revealThreshold * 100);

    // Video CSS rect: exactly matches the Phaser colored-image position
    const videoStyle = imageDisplayRect
        ? {
            position:   'absolute' as const,
            left:       `${imageDisplayRect.xPct * 100}%`,
            top:        `${imageDisplayRect.yPct * 100}%`,
            width:      `${imageDisplayRect.wPct * 100}%`,
            height:     `${imageDisplayRect.hPct * 100}%`,
            objectFit:  'contain' as const,
            background: 'transparent',
          }
        : {
            position:   'absolute' as const,
            inset:      '0',
            objectFit:  'contain' as const,
          };

    // ── Boot Phaser once — NEVER re-create ────────────────────────────────
    useLayoutEffect(() => {
        if (gameContainerRef.current && !gameInstanceRef.current) {
            const game = StartGame(gameContainerRef.current.id);
            gameInstanceRef.current = game;
            if (ref) typeof ref === 'function' ? ref({ game }) : (ref.current = { game });
        }
    }, [ref]);

    // ── Sync brush size → Phaser ──────────────────────────────────────────
    useLayoutEffect(() => {
        EventBus.emit('ui-brush-size', brushSize);
    }, [brushSize]);

    // ── Initialise brush from config ──────────────────────────────────────
    useEffect(() => {
        if (appConfig.brushDefault !== brushSize) setBrushSize(appConfig.brushDefault);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [appConfig.brushDefault]);

    // ── Restart scene on new set ──────────────────────────────────────────
    const prevSetIdRef = useRef<string | null>(null);
    useLayoutEffect(() => {
        if (!gameInstanceRef.current || !isPlaying || !selectedSet) return;
        if (prevSetIdRef.current === selectedSet.id) return;
        prevSetIdRef.current = selectedSet.id;
        setVideoReady(false);
        setShowBrushPicker(false);
        if (canvasFadeTimer.current) clearTimeout(canvasFadeTimer.current);
        gameInstanceRef.current.scene.start('MainGame');
    }, [selectedSet, isPlaying]);

    // ── Pre-load video silently at frame 0 ───────────────────────────────
    // Always muted during preload; un-mute respects set.videoMuted at reveal.
    useEffect(() => {
        const v = videoRef.current;
        if (!v || !selectedSet?.videoUrl || !isPlaying) return;
        v.muted = true;
        v.src   = selectedSet.videoUrl;
        v.load();
        const prime = () => {
            const onFrame = () => { v.pause(); v.removeEventListener('timeupdate', onFrame); setVideoReady(true); };
            v.addEventListener('timeupdate', onFrame, { once: true });
            v.play().catch(() => setVideoReady(true));
        };
        if (v.readyState >= 2) { prime(); }
        else { v.addEventListener('canplay', prime, { once: true }); }
        return () => { v.removeEventListener('canplay', prime); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedSet?.videoUrl, isPlaying]);

    // ── EventBus → Store bridge ───────────────────────────────────────────
    useEffect(() => {
        const onProgress  = (p: number) => setRevealPct(p);

        const onThreshold = () => {
            onRevealThreshold();
            setTimeout(dismissGlitter, appConfig.glitterDuration + 300);

            // Audio
            if (audioRef.current) {
                audioRef.current.volume = appConfig.audioVolume;
                audioRef.current.play().catch(() => {});
            }

            // Video — respect per-set mute setting
            const v = videoRef.current;
            if (v) {
                // If admin marked this set as muted, keep it muted
                const keepMuted = selectedSet?.videoMuted ?? false;
                v.muted = keepMuted;
                v.currentTime = 0;
                v.play().catch(() => {
                    // Autoplay blocked — fallback to muted
                    v.muted = true;
                    v.play().catch(() => {});
                });
            }

            const fadeDelay = Math.max(0, appConfig.lineArtFadeDuration * 0.4);
            canvasFadeTimer.current = setTimeout(() => {
                useGameStore.setState({ revealPhase: 'FADING' });
                canvasFadeTimer.current = setTimeout(() => {
                    onRevealComplete();
                    showToast('Reveal complete! 🎉', 'success');
                }, appConfig.coloredFadeDuration + 100);
            }, fadeDelay);
        };

        const onComplete = () => {
            setTimeout(onRevealComplete, appConfig.coloredFadeDuration + 200);
        };

        EventBus.on('reveal-progress',  onProgress);
        EventBus.on('reveal-threshold', onThreshold);
        EventBus.on('reveal-complete',  onComplete);
        return () => {
            EventBus.off('reveal-progress',  onProgress);
            EventBus.off('reveal-threshold', onThreshold);
            EventBus.off('reveal-complete',  onComplete);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [appConfig, selectedSet?.videoMuted]);

    // ── Back handler ──────────────────────────────────────────────────────
    const handleBack = useCallback(() => {
        if (canvasFadeTimer.current) clearTimeout(canvasFadeTimer.current);
        prevSetIdRef.current = null;
        audioRef.current?.pause();
        if (audioRef.current) audioRef.current.currentTime = 0;
        const v = videoRef.current;
        if (v) { v.pause(); v.muted = true; v.currentTime = 0; v.src = ''; }
        setShowBrushPicker(false);
        setVideoReady(false);
        endSession();
    }, [endSession]);

    return (
        <div className="absolute inset-0 bg-white">

            {/* Welcome screen */}
            {gamePhase === 'WELCOME' && <WelcomeScreen />}

            {/* Gallery */}
            {gamePhase === 'GALLERY' && <Gallery />}

            {/* Global toasts — visible in all phases */}
            <ToastContainer />

            {/* Audio — always in DOM */}
            <audio ref={audioRef} preload="none" />

            {/* ────────────────────────────────────────────────────────────
                 VIDEO — z-10, positioned EXACTLY at imageDisplayRect
                 so it overlaps the Phaser image pixel-perfectly.
                 Background is transparent/white to blend with canvas bg.
               ──────────────────────────────────────────────────────── */}
            <div
                className="absolute inset-0 z-10"
                style={{ visibility: (isPlaying || isComplete) ? 'visible' : 'hidden', background: 'white' }}
            >
                <video
                    ref={videoRef}
                    style={videoStyle}
                    playsInline
                    loop
                    muted
                    preload="none"
                    onClick={() => {
                        const v = videoRef.current;
                        if (!v || !canvasHidden) return;
                        v.paused ? v.play() : v.pause();
                    }}
                />
            </div>

            {/* ────────────────────────────────────────────────────────────
                 PHASER — z-20, NEVER unmounted
                 Hidden via CSS opacity only; removing from DOM destroys WebGL
               ──────────────────────────────────────────────────────── */}
            <div
                id="game-container"
                ref={gameContainerRef}
                className="absolute inset-0 z-20 overflow-hidden bg-white w-full h-full"
                style={{
                    opacity:       (!isPlaying || canvasHidden) ? 0 : 1,
                    pointerEvents: (!isPlaying || canvasFading || canvasHidden) ? 'none' : 'auto',
                    transition:    canvasFading
                        ? `opacity ${appConfig.coloredFadeDuration}ms ease-in-out`
                        : 'opacity 0ms',
                }}
            />

            {/* Glitter — z-30 */}
            {showGlitter && appConfig.glitterEnabled && (
                <div className="absolute inset-0 z-30 overflow-hidden pointer-events-none"
                     style={{ '--glitter-dur': `${appConfig.glitterDuration}ms` } as React.CSSProperties}>
                    <div className="absolute inset-0 glitter-sweep-active"
                         style={{ background: 'linear-gradient(90deg,transparent 0%,rgba(255,235,130,.10) 25%,rgba(255,255,255,.38) 50%,rgba(255,235,130,.10) 75%,transparent 100%)' }} />
                    <div className="absolute inset-0 glitter-sweep-active"
                         style={{ background: 'linear-gradient(90deg,transparent 35%,rgba(255,255,255,.55) 50%,transparent 65%)', animationDelay: '80ms' }} />
                </div>
            )}

            {/* Back button over video after reveal — z-50 */}
            {canvasHidden && (isPlaying || isComplete) && (
                <button
                    onClick={handleBack}
                    className="absolute top-4 right-4 z-50 w-9 h-9 rounded-full
                               bg-black/20 backdrop-blur-sm text-white
                               flex items-center justify-center
                               hover:bg-black/35 transition-all active:scale-90"
                    aria-label="Back to gallery">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18"
                         viewBox="0 0 24 24" fill="none" stroke="currentColor"
                         strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 6 6 18M6 6l12 12"/>
                    </svg>
                </button>
            )}

            {/* Editor UI — z-40 */}
            {isPlaying && !canvasHidden && (
                <div className="absolute inset-0 z-40 pointer-events-none font-sans">

                    {/* Loading spinner */}
                    {isAssetLoading && (
                        <div className="absolute inset-0 bg-white/85 backdrop-blur-sm z-50
                                        flex items-center justify-center pointer-events-auto">
                            <div className="flex flex-col items-center gap-4">
                                <svg className="animate-spin h-12 w-12 text-zinc-900"
                                     fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10"
                                            stroke="currentColor" strokeWidth="4"/>
                                    <path className="opacity-75" fill="currentColor"
                                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                                </svg>
                                <p className="text-zinc-500 font-semibold animate-pulse text-sm">
                                    Preparing magic canvas…
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Top bar */}
                    <div className="absolute top-0 left-0 right-0 pointer-events-auto">
                        <div className="w-full h-14 bg-white/90 backdrop-blur-md border-b border-zinc-100
                                        flex items-center justify-between px-4
                                        shadow-[0_1px_8px_-2px_rgba(0,0,0,0.05)]">
                            <button onClick={handleBack}
                                    className="p-3 rounded-full bg-zinc-50 text-zinc-400
                                               hover:text-zinc-900 hover:bg-zinc-100 transition-all active:scale-90"
                                    aria-label="Back">
                                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22"
                                     viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                     strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="m15 18-6-6 6-6"/>
                                </svg>
                            </button>
                            <span className="font-extrabold text-zinc-900 tracking-tight text-base truncate px-2">
                                {selectedSet?.name ?? 'My Artwork'}
                            </span>
                            <span className="text-xs font-semibold text-zinc-400 min-w-[36px] text-right">
                                {pct}%
                            </span>
                        </div>
                        {/* Hairline progress strip */}
                        <div className="w-full h-[3px] bg-zinc-100">
                            <div className="h-full transition-all duration-500 ease-out"
                                 style={{
                                     width: `${pct}%`,
                                     background: pct >= thresholdPct
                                         ? 'rgba(251,191,36,0.55)'
                                         : 'rgba(167,139,250,0.45)',
                                 }} />
                        </div>
                    </div>

                    {/* Click-outside backdrop for brush picker */}
                    {showBrushPicker && (
                        <div className="absolute inset-0 z-[15] pointer-events-auto"
                             onClick={() => setShowBrushPicker(false)} aria-hidden="true" />
                    )}

                    {/* Brush toggle — bottom right */}
                    <div className="absolute bottom-8 right-5 z-[20] pointer-events-auto flex flex-col items-end gap-3">
                        {showBrushPicker && (
                            <div className="bg-white/95 backdrop-blur-md shadow-2xl rounded-2xl
                                            px-5 py-4 flex flex-col gap-3 w-52 border border-zinc-100"
                                 onClick={e => e.stopPropagation()}>
                                <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 text-center">
                                    Brush Size
                                </p>
                                <input type="range"
                                       min={appConfig.brushMin} max={appConfig.brushMax} value={brushSize}
                                       onChange={e => setBrushSize(parseInt(e.target.value))}
                                       className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-zinc-900" />
                                <div className="flex items-center justify-between px-0.5">
                                    <div className="w-3 h-3 rounded-full bg-zinc-300" />
                                    <span className="text-xs font-semibold text-zinc-500">{brushSize}px</span>
                                    <div className="w-6 h-6 rounded-full bg-zinc-300" />
                                </div>
                            </div>
                        )}
                        <button
                            onClick={() => setShowBrushPicker(p => !p)}
                            className={`w-14 h-14 rounded-full shadow-xl flex items-center justify-center
                                        transition-all duration-200 active:scale-90
                                        ${showBrushPicker
                                          ? 'bg-zinc-900 text-white'
                                          : 'bg-white text-zinc-600 shadow-[0_4px_16px_-4px_rgba(0,0,0,0.2)]'}`}
                            aria-label="Brush size">
                            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22"
                                 viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                 strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08"/>
                                <path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z"/>
                            </svg>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
});

export default PhaserGame;

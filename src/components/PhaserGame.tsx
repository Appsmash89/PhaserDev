'use client';

import { forwardRef, useLayoutEffect, useRef, useState, useEffect, useCallback } from 'react';
import { StartGame } from '@/game/game';
import { EventBus } from '@/game/EventBus';
import { useGameStore } from '@/store/useGameStore';
import Gallery from './Gallery';

export interface IRefPhaserGame { game: Phaser.Game | null; }

export const PhaserGame = forwardRef<IRefPhaserGame>(function PhaserGame(_, ref) {
    const gameContainerRef = useRef<HTMLDivElement>(null);
    const gameInstanceRef  = useRef<Phaser.Game | null>(null);
    const audioRef         = useRef<HTMLAudioElement>(null);
    const videoRef         = useRef<HTMLVideoElement>(null);
    const canvasFadeTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);

    const {
        gameState, setGameState, selectedSet,
        brushSize, setBrushSize,
        isAssetLoading, appConfig, setAppConfig,
    } = useGameStore();

    const [revealPct, setRevealPct]             = useState(0);
    const [canvasFading, setCanvasFading]       = useState(false);
    // NOTE: canvasHidden hides via CSS only — we NEVER unmount #game-container.
    // Unmounting destroys Phaser's WebGL canvas permanently.
    const [canvasHidden, setCanvasHidden]       = useState(false);
    const [showGlitter, setShowGlitter]         = useState(false);
    const [showBrushPicker, setShowBrushPicker] = useState(false);
    const [videoReady, setVideoReady]           = useState(false);

    // ── Fetch config on mount ─────────────────────────────────────────
    useEffect(() => {
        fetch('/api/config')
            .then(r => r.json())
            .then(cfg => { setAppConfig(cfg); setBrushSize(cfg.brushDefault); })
            .catch(() => {});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Boot Phaser once, NEVER destroy on re-render ──────────────────
    useLayoutEffect(() => {
        if (gameContainerRef.current && !gameInstanceRef.current) {
            const game = StartGame(gameContainerRef.current.id);
            gameInstanceRef.current = game;
            if (ref) typeof ref === 'function' ? ref({ game }) : (ref.current = { game });
            // Do NOT return a cleanup that destroys — game lives for the app lifetime
        }
    }, [ref]);

    // ── Sync brush size to Phaser ─────────────────────────────────────
    useLayoutEffect(() => {
        if (gameInstanceRef.current) EventBus.emit('ui-brush-size', brushSize);
    }, [brushSize]);

    // ── Reset & restart scene when set changes ────────────────────────
    // prevSetIdRef tracks the LAST started set. Reset to null on back so same set can restart.
    const prevSetIdRef = useRef<string | null>(null);
    useLayoutEffect(() => {
        if (gameInstanceRef.current && gameState === 'PLAYING' && selectedSet) {
            if (prevSetIdRef.current !== selectedSet.id) {
                prevSetIdRef.current = selectedSet.id;
                setRevealPct(0);
                setCanvasFading(false);
                setCanvasHidden(false);
                setShowGlitter(false);
                setShowBrushPicker(false);
                setVideoReady(false);
                if (canvasFadeTimer.current) clearTimeout(canvasFadeTimer.current);
                gameInstanceRef.current.scene.start('MainGame');
            }
        }
    }, [selectedSet, gameState]);

    // ── Pre-load video at first frame (muted) ────────────────────────
    useEffect(() => {
        const v = videoRef.current;
        if (!v || !selectedSet?.videoUrl || gameState !== 'PLAYING') return;

        v.muted = true;
        v.src = selectedSet.videoUrl;
        v.load();

        const primeVideo = () => {
            const onFirstFrame = () => {
                v.pause();
                v.removeEventListener('timeupdate', onFirstFrame);
                setVideoReady(true);
            };
            v.addEventListener('timeupdate', onFirstFrame, { once: true });
            v.play().catch(() => setVideoReady(true));
        };

        if (v.readyState >= 2) {
            primeVideo();
        } else {
            v.addEventListener('canplay', primeVideo, { once: true });
        }

        return () => { v.removeEventListener('canplay', primeVideo); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedSet?.videoUrl, gameState]);

    // ── EventBus listeners ────────────────────────────────────────────
    useEffect(() => {
        const onProgress = (pct: number) => setRevealPct(pct);

        const onThreshold = () => {
            const { audioVolume, lineArtFadeDuration, coloredFadeDuration, glitterEnabled, glitterDuration }
                = useGameStore.getState().appConfig;

            // 1. Play audio
            if (audioRef.current) {
                audioRef.current.volume = audioVolume;
                audioRef.current.play().catch(() => {});
            }

            // 2. Un-mute + play video (already at frame 0)
            const v = videoRef.current;
            if (v) {
                v.muted = false;
                v.currentTime = 0;
                v.play().catch(() => { v.muted = true; v.play().catch(() => {}); });
            }

            // 3. Glitter
            if (glitterEnabled) {
                setShowGlitter(true);
                setTimeout(() => setShowGlitter(false), glitterDuration + 300);
            }

            // 4. Start canvas CSS fade
            const canvasFadeDelay = Math.max(0, lineArtFadeDuration * 0.4);
            canvasFadeTimer.current = setTimeout(() => {
                setCanvasFading(true);
                canvasFadeTimer.current = setTimeout(() => {
                    setCanvasHidden(true); // CSS-only hide — canvas stays in DOM!
                }, coloredFadeDuration + 100);
            }, canvasFadeDelay);
        };

        const onComplete = () => {
            const { coloredFadeDuration } = useGameStore.getState().appConfig;
            setTimeout(() => setCanvasHidden(true), coloredFadeDuration + 200);
        };

        EventBus.on('reveal-progress', onProgress);
        EventBus.on('reveal-threshold', onThreshold);
        EventBus.on('reveal-complete',  onComplete);
        return () => {
            EventBus.off('reveal-progress', onProgress);
            EventBus.off('reveal-threshold', onThreshold);
            EventBus.off('reveal-complete',  onComplete);
        };
    }, []);

    const handleBack = useCallback(() => {
        // ── Reset ALL transition state ────────────────────────────────
        setRevealPct(0);
        setCanvasFading(false);
        setCanvasHidden(false);
        setShowGlitter(false);
        setShowBrushPicker(false);
        setVideoReady(false);
        if (canvasFadeTimer.current) clearTimeout(canvasFadeTimer.current);

        // ── CRITICAL: reset prevSetIdRef so same set can be opened again ──
        prevSetIdRef.current = null;

        // ── Stop media ───────────────────────────────────────────────
        audioRef.current?.pause();
        if (audioRef.current) audioRef.current.currentTime = 0;
        const v = videoRef.current;
        if (v) { v.pause(); v.muted = true; v.currentTime = 0; v.src = ''; }

        setGameState('GALLERY');
    }, [setGameState]);

    const pct          = Math.round(revealPct * 100);
    const thresholdPct = Math.round(appConfig.revealThreshold * 100);
    const isPlaying    = gameState === 'PLAYING';

    return (
        <div className="absolute inset-0 bg-white">

            {/* ── Gallery ──────────────────────────────────────────── */}
            {gameState === 'GALLERY' && <Gallery />}

            {/* ── Audio (always in DOM) ────────────────────────────── */}
            <audio ref={audioRef} preload="none" />

            {/* ── Video — z-10, BEHIND Phaser canvas ───────────────── */}
            {/* Always in DOM during PLAYING so videoRef is stable.    */}
            {/* CSS visibility hides it when not needed.               */}
            <video
                ref={videoRef}
                className="absolute inset-0 z-10 w-full h-full object-contain bg-white"
                style={{ visibility: isPlaying ? 'visible' : 'hidden' }}
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

            {/* ── Phaser game-container — z-20, NEVER unmounted ────── */}
            {/* Removing this div from DOM destroys WebGL context permanently. */}
            {/* Hide via CSS opacity + pointer-events instead.               */}
            <div
                id="game-container"
                ref={gameContainerRef}
                className="absolute inset-0 z-20 overflow-hidden bg-white w-full h-full"
                style={{
                    opacity:       !isPlaying || canvasHidden ? 0 : canvasFading ? 0 : 1,
                    pointerEvents: !isPlaying || canvasFading || canvasHidden ? 'none' : 'auto',
                    transition:    canvasFading
                        ? `opacity ${appConfig.coloredFadeDuration}ms ease-in-out`
                        : 'opacity 0ms',
                }}
            />

            {/* ── Glitter sweep — z-30, one-shot on threshold ──────── */}
            {showGlitter && appConfig.glitterEnabled && (
                <div
                    className="absolute inset-0 z-30 overflow-hidden pointer-events-none"
                    style={{ '--glitter-dur': `${appConfig.glitterDuration}ms` } as React.CSSProperties}
                >
                    <div className="absolute inset-0 glitter-sweep-active"
                         style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,235,130,0.10) 25%, rgba(255,255,255,0.38) 50%, rgba(255,235,130,0.10) 75%, transparent 100%)' }} />
                    <div className="absolute inset-0 glitter-sweep-active"
                         style={{ background: 'linear-gradient(90deg, transparent 35%, rgba(255,255,255,0.55) 50%, transparent 65%)', animationDelay: '80ms' }} />
                </div>
            )}

            {/* ── Back button — visible over video after reveal ─────── */}
            {canvasHidden && isPlaying && (
                <button
                    onClick={handleBack}
                    className="absolute top-4 right-4 z-50 w-9 h-9 rounded-full
                               bg-black/20 backdrop-blur-sm text-white
                               flex items-center justify-center
                               hover:bg-black/35 transition-all active:scale-90"
                    aria-label="Back to gallery"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18"
                         viewBox="0 0 24 24" fill="none" stroke="currentColor"
                         strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 6 6 18M6 6l12 12"/>
                    </svg>
                </button>
            )}

            {/* ── Editor UI overlay — z-40, hides when canvas gone ─── */}
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

                    {/* Click-outside overlay for brush picker */}
                    {showBrushPicker && (
                        <div className="absolute inset-0 z-[15] pointer-events-auto"
                             onClick={() => setShowBrushPicker(false)} aria-hidden="true" />
                    )}

                    {/* Floating brush toggle — bottom right */}
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

'use client';

import { forwardRef, useLayoutEffect, useRef, useState } from 'react';
import { StartGame } from '@/game/game';
import { EventBus } from '@/game/EventBus';
import { useGameStore } from '@/store/useGameStore';

export interface IRefPhaserGame {
    game: Phaser.Game | null;
}

export const PhaserGame = forwardRef<IRefPhaserGame>(function PhaserGame(_, ref) {
    const gameContainerRef = useRef<HTMLDivElement>(null);
    const gameInstanceRef = useRef<Phaser.Game | null>(null);
    
    // State Sync
    const addScore = useGameStore((state) => state.addScore);
    const { score, highScore, isPaused, togglePause, settings, updateSettings } = useGameStore();
    const [showSettings, setShowSettings] = useState(false);

    useLayoutEffect(() => {
        if (gameContainerRef.current && !gameInstanceRef.current) {
            const game = StartGame(gameContainerRef.current.id);
            gameInstanceRef.current = game;
            
            if (ref) {
                if (typeof ref === 'function') {
                    ref({ game });
                } else {
                    ref.current = { game };
                }
            }

            // Sync Score from Phaser
            EventBus.on('game-score-increment', (amount: number) => {
                addScore(amount);
            });

            return () => {
                if (gameInstanceRef.current) {
                    gameInstanceRef.current.destroy(true);
                    gameInstanceRef.current = null;
                    EventBus.removeListener('game-score-increment');
                }
            };
        }
    }, [ref, addScore]);

    // Sync Pause State to Phaser
    useLayoutEffect(() => {
        if (gameInstanceRef.current) {
            EventBus.emit('ui-pause-toggle', isPaused);
        }
    }, [isPaused]);

    return (
        <div id="game-container" ref={gameContainerRef} className="w-full h-full relative overflow-hidden bg-black flex items-center justify-center">
            {/* The Zero-Line UI Overlay Layer */}
            <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-8 font-sans">
                
                {/* HUD Elements */}
                <div className="flex justify-between items-start pointer-events-auto w-full">
                    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 shadow-2xl transition-all hover:scale-105 active:scale-95 group">
                        <h2 className="text-white/60 text-xs font-bold uppercase tracking-widest mb-1 group-hover:text-blue-400 transition-colors">Current Score</h2>
                        <div className="text-4xl font-black text-white tabular-nums tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                            {score.toLocaleString()}
                        </div>
                    </div>

                    <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-700/50 rounded-2xl p-6 shadow-xl">
                        <h2 className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-1 text-right">Best Record</h2>
                        <div className="text-4xl font-black text-zinc-300 tabular-nums tracking-tighter text-right">
                            {highScore.toLocaleString()}
                        </div>
                    </div>
                </div>

                {/* Status/Notification System */}
                <div className="absolute left-8 top-1/2 -translate-y-1/2 flex flex-col gap-4 pointer-events-none">
                    <div className="bg-gradient-to-r from-blue-600/20 to-transparent p-4 border-l-4 border-blue-500 backdrop-blur-sm animate-in slide-in-from-left duration-700">
                        <p className="text-white font-medium italic text-sm">PHASER DEV ACTIVE</p>
                    </div>
                </div>

                {/* Bottom Navigation Controls */}
                <div className="flex justify-center pointer-events-auto">
                    <div className="bg-zinc-950/90 backdrop-blur-xl border border-zinc-800 p-2 rounded-3xl flex gap-2 shadow-2xl">
                        <button 
                            onClick={togglePause}
                            className={`px-8 py-4 ${isPaused ? 'bg-red-600' : 'bg-blue-600'} hover:opacity-90 text-white rounded-2xl font-bold transition-all active:scale-95`}
                        >
                            {isPaused ? 'RESUME' : 'PAUSE'}
                        </button>
                        <button 
                            onClick={() => setShowSettings(true)}
                            className="px-8 py-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-2xl font-bold transition-all active:scale-95"
                        >
                            SETTINGS
                        </button>
                    </div>
                </div>
            </div>

            {/* PAUSE OVERLAY */}
            {isPaused && (
                <div className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-center justify-center p-8">
                    <div className="text-center animate-in zoom-in duration-300">
                        <h1 className="text-6xl font-black text-white mb-8 tracking-tighter">GAME PAUSED</h1>
                        <button onClick={togglePause} className="px-12 py-5 bg-blue-600 text-white rounded-2xl font-bold text-xl shadow-2xl">RESUME</button>
                    </div>
                </div>
            )}

            {/* SETTINGS MODAL */}
            {showSettings && (
                <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-8">
                    <div className="bg-zinc-900 border border-zinc-800 w-full max-w-xl rounded-3xl p-10">
                        <div className="flex justify-between items-center mb-10">
                            <h2 className="text-3xl font-black text-white">System Settings</h2>
                            <button onClick={() => setShowSettings(false)} className="text-zinc-500">CLOSE</button>
                        </div>
                        <div className="space-y-8">
                            <div className="space-y-4">
                                <label className="text-zinc-400 text-xs font-bold uppercase">Volume</label>
                                <input type="range" min="0" max="1" step="0.1" value={settings.musicVolume} onChange={(e) => updateSettings({ musicVolume: parseFloat(e.target.value) })} className="w-full" />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});

export default PhaserGame;

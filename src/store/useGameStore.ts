import { create } from 'zustand';

export interface ColorSet {
    id: string; name: string;
    lineArtUrl: string | null; coloredArtUrl: string | null;
    audioUrl: string | null; videoUrl: string | null;
    createdAt: string;
    creditCost: number; // 0 = free
}

export interface AppConfig {
    revealThreshold: number;
    brushMin: number; brushMax: number; brushDefault: number;
    audioVolume: number;
    lineArtFadeDuration: number; // ms — Phaser tween: remaining line art fades
    coloredFadeDuration: number; // ms — CSS transition: game canvas fades out revealing video
    glitterEnabled: boolean;
    glitterDuration: number;     // ms — shimmer sweep across screen
}

export const DEFAULT_CONFIG: AppConfig = {
    revealThreshold: 0.75,
    brushMin: 10, brushMax: 80, brushDefault: 40,
    audioVolume: 0.85,
    lineArtFadeDuration: 700,
    coloredFadeDuration: 900,
    glitterEnabled: true,
    glitterDuration: 1100,
};

interface GameStore {
    gameState: 'BOOT' | 'GALLERY' | 'PLAYING' | 'COMPLETE';
    selectedSet: ColorSet | null;
    brushSize: number;
    isAssetLoading: boolean;
    appConfig: AppConfig;
    setGameState:      (s: GameStore['gameState']) => void;
    setSelectedSet:    (set: ColorSet | null)      => void;
    setBrushSize:      (size: number)              => void;
    setIsAssetLoading: (loading: boolean)          => void;
    setAppConfig:      (config: AppConfig)         => void;
}

export const useGameStore = create<GameStore>((set) => ({
    gameState: 'GALLERY', selectedSet: null,
    brushSize: DEFAULT_CONFIG.brushDefault,
    isAssetLoading: false, appConfig: { ...DEFAULT_CONFIG },
    setGameState:      (gameState)      => set({ gameState }),
    setSelectedSet:    (selectedSet)    => set({ selectedSet }),
    setBrushSize:      (brushSize)      => set({ brushSize }),
    setIsAssetLoading: (isAssetLoading) => set({ isAssetLoading }),
    setAppConfig:      (appConfig)      => set({ appConfig }),
}));

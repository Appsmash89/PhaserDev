import { create } from 'zustand';

interface GameState {
  score: number;
  highScore: number;
  gameState: string;
  isPaused: boolean;
  settings: {
    musicVolume: number;
    sfxVolume: number;
    showDebug: boolean;
  };
  setGameState: (state: string) => void;
  addScore: (points: number) => void;
  resetScore: () => void;
  togglePause: () => void;
  updateSettings: (settings: Partial<GameState['settings']>) => void;
}

export const useGameStore = create<GameState>((set) => ({
  score: 0,
  highScore: 0,
  gameState: 'BOOT',
  isPaused: false,
  settings: {
    musicVolume: 0.5,
    sfxVolume: 0.8,
    showDebug: false,
  },
  setGameState: (state) => set({ gameState: state }),
  addScore: (points) => set((state) => {
    const newScore = state.score + points;
    return {
      score: newScore,
      highScore: Math.max(newScore, state.highScore),
    };
  }),
  resetScore: () => set({ score: 0 }),
  togglePause: () => set((state) => ({ isPaused: !state.isPaused })),
  updateSettings: (newSettings) => set((state) => ({
    settings: { ...state.settings, ...newSettings }
  })),
}));

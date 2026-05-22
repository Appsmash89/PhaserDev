/**
 * useGameStore — SSOT for all game session & reveal state.
 */
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type GamePhase = 'WELCOME' | 'GALLERY' | 'PLAYING' | 'COMPLETE';

export interface ColorSet {
    id:            string;
    name:          string;
    lineArtUrl:    string | null;
    coloredArtUrl: string | null;
    audioUrl:      string | null;
    videoUrl:      string | null;
    createdAt:     string;
    creditCost:    number;
    genre:         string;    // "Portraits" | "Nature" | "Fantasy" | "Animals" | "Abstract"
    videoMuted:    boolean;   // admin-controlled; true = video stays muted after reveal
}

export type RevealPhase =
    | 'IDLE'
    | 'PAINTING'
    | 'THRESHOLD'
    | 'FADING'
    | 'COMPLETE';

/**
 * Percentage-based rect: resolution-independent position of the colored image
 * within the Phaser canvas. Used to align the video element pixel-perfectly.
 */
export interface ImageDisplayRect {
    xPct: number; // left edge as fraction of canvas width  (0–1)
    yPct: number; // top  edge as fraction of canvas height (0–1)
    wPct: number; // width       as fraction of canvas width
    hPct: number; // height      as fraction of canvas height
}

// ─────────────────────────────────────────────────────────────────────────────
// State + Actions
// ─────────────────────────────────────────────────────────────────────────────

interface GameState {
    // ── App flow ─────────────────────────────────────────────────────────
    gamePhase:        GamePhase;
    activeTab:        'gallery' | 'wallet';

    // ── Session ──────────────────────────────────────────────────────────
    selectedSet:      ColorSet | null;
    isAssetLoading:   boolean;
    brushSize:        number;

    // ── Reveal ───────────────────────────────────────────────────────────
    revealPhase:      RevealPhase;
    revealPct:        number;
    showGlitter:      boolean;
    imageDisplayRect: ImageDisplayRect | null;

    // ── Progression ──────────────────────────────────────────────────────
    completedSetIds:  string[];

    // ── Actions ──────────────────────────────────────────────────────────
    /** WELCOME → GALLERY */
    dismissWelcome:   () => void;
    /** Switch between Discover / Credits tab */
    setActiveTab:     (tab: 'gallery' | 'wallet') => void;
    /** Begin coloring a set */
    startSession:     (set: ColorSet) => void;
    /** Return to gallery; resets all session state */
    endSession:       () => void;

    setRevealPct:       (pct: number)                  => void;
    onRevealThreshold:  ()                             => void;
    onRevealComplete:   ()                             => void;
    dismissGlitter:     ()                             => void;
    setImageDisplayRect:(rect: ImageDisplayRect | null) => void;

    /** @internal called only by Phaser (MainGame) */
    _setAssetLoading: (v: boolean) => void;
    setBrushSize:     (size: number) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────────────────────

export const useGameStore = create<GameState>()(
    devtools(
        (set, get) => ({
            gamePhase:        'WELCOME',
            activeTab:        'gallery',
            selectedSet:      null,
            isAssetLoading:   false,
            brushSize:        40,
            revealPhase:      'IDLE',
            revealPct:        0,
            showGlitter:      false,
            imageDisplayRect: null,
            completedSetIds:  [],

            dismissWelcome: () =>
                set({ gamePhase: 'GALLERY' }, false, 'dismissWelcome'),

            setActiveTab: (activeTab) =>
                set({ activeTab }, false, 'setActiveTab'),

            startSession: (selectedSet) => set({
                gamePhase:        'PLAYING',
                selectedSet,
                revealPhase:      'PAINTING',
                revealPct:        0,
                showGlitter:      false,
                imageDisplayRect: null,
            }, false, 'startSession'),

            endSession: () => set({
                gamePhase:        'GALLERY',
                revealPhase:      'IDLE',
                revealPct:        0,
                showGlitter:      false,
                isAssetLoading:   false,
                imageDisplayRect: null,
            }, false, 'endSession'),

            setRevealPct: (revealPct) =>
                set({ revealPct }, false, 'setRevealPct'),

            onRevealThreshold: () => {
                // Guard: only fire if we're actively in a painting session.
                // A stale EventBus emission from a previous scene must not corrupt
                // the current session's phase.
                if (get().gamePhase !== 'PLAYING' || get().revealPhase !== 'PAINTING') return;
                set({ revealPhase: 'THRESHOLD', showGlitter: true }, false, 'onRevealThreshold');
            },

            onRevealComplete: () => {
                const { gamePhase, revealPhase, selectedSet, completedSetIds } = get();
                // Guard: only fire if reveal is still in progress for THIS session.
                // Stale timers from a previous session must not set gamePhase='COMPLETE'
                // while the user is painting a new set.
                if (gamePhase !== 'PLAYING') return;
                if (revealPhase !== 'THRESHOLD' && revealPhase !== 'FADING') return;
                set({
                    gamePhase:   'COMPLETE',
                    revealPhase: 'COMPLETE',
                    completedSetIds: selectedSet
                        ? [...new Set([...completedSetIds, selectedSet.id])]
                        : completedSetIds,
                }, false, 'onRevealComplete');
            },

            dismissGlitter: () =>
                set({ showGlitter: false }, false, 'dismissGlitter'),

            setImageDisplayRect: (imageDisplayRect) =>
                set({ imageDisplayRect }, false, 'setImageDisplayRect'),

            _setAssetLoading: (isAssetLoading) =>
                set({ isAssetLoading }, false, '_setAssetLoading'),

            setBrushSize: (brushSize) =>
                set({ brushSize }, false, 'setBrushSize'),
        }),
        { name: 'GameStore' }
    )
);

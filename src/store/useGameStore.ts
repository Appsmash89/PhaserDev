/**
 * useGameStore — SSOT for all game session & reveal state.
 *
 * Domains: game flow, selected set, reveal sequence, brush size, asset loading.
 * Does NOT contain: economy data (→ useEconomyStore), admin config (→ useConfigStore),
 *                   sets catalog (→ useSetsStore).
 *
 * All state transitions happen through named actions. No external component
 * may mutate state directly.
 */
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type GamePhase = 'GALLERY' | 'PLAYING' | 'COMPLETE';

export interface ColorSet {
    id:            string;
    name:          string;
    lineArtUrl:    string | null;
    coloredArtUrl: string | null;
    audioUrl:      string | null;
    videoUrl:      string | null;
    createdAt:     string;
    creditCost:    number; // 0 = free
}

/** Reveal phase within a single coloring session. */
export type RevealPhase =
    | 'IDLE'        // not started
    | 'PAINTING'    // user is brushing
    | 'THRESHOLD'   // threshold hit, sequence starting
    | 'FADING'      // canvas CSS fade in progress
    | 'COMPLETE';   // video is visible, session done

// ─────────────────────────────────────────────────────────────────────────────
// State + Actions interface
// ─────────────────────────────────────────────────────────────────────────────

interface GameState {
    // ── Game flow ────────────────────────────────────────────────────────
    gamePhase:       GamePhase;
    selectedSet:     ColorSet | null;

    // ── Asset loading ────────────────────────────────────────────────────
    isAssetLoading:  boolean;

    // ── Brush ────────────────────────────────────────────────────────────
    brushSize:       number;

    // ── Reveal sequence ──────────────────────────────────────────────────
    revealPhase:     RevealPhase;
    revealPct:       number;   // 0.0–1.0, updated by Phaser every 300ms
    showGlitter:     boolean;

    // ── Actions ──────────────────────────────────────────────────────────
    /** Navigate to playing state with a chosen set. */
    startSession:    (set: ColorSet) => void;

    /** Go back to gallery. Resets the entire session. */
    endSession:      () => void;

    /** Update progress from Phaser's EventBus handler. */
    setRevealPct:    (pct: number) => void;

    /** Called when Phaser fires reveal-threshold. */
    onRevealThreshold: () => void;

    /** Called when the canvas CSS fade completes — video is now visible. */
    onRevealComplete:  () => void;

    /** Dismiss glitter after animation duration. */
    dismissGlitter:  () => void;

    // ── Internal Phaser bridge (called only from PhaserGame) ─────────────
    /** @internal Phaser loader sets this. Not for use in UI components. */
    _setAssetLoading: (v: boolean) => void;

    /** @internal Set brush size. */
    setBrushSize:    (size: number) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────────────────────

export const useGameStore = create<GameState>()(
    devtools(
        (set) => ({
            gamePhase:      'GALLERY',
            selectedSet:    null,
            isAssetLoading: false,
            brushSize:      40,
            revealPhase:    'IDLE',
            revealPct:      0,
            showGlitter:    false,

            startSession: (selectedSet) => set({
                gamePhase:    'PLAYING',
                selectedSet,
                revealPhase:  'PAINTING',
                revealPct:    0,
                showGlitter:  false,
            }, false, 'startSession'),

            endSession: () => set({
                gamePhase:    'GALLERY',
                revealPhase:  'IDLE',
                revealPct:    0,
                showGlitter:  false,
                isAssetLoading: false,
            }, false, 'endSession'),

            setRevealPct: (revealPct) => set({ revealPct }, false, 'setRevealPct'),

            onRevealThreshold: () => set({
                revealPhase: 'THRESHOLD',
                showGlitter: true,
            }, false, 'onRevealThreshold'),

            onRevealComplete: () => set({
                gamePhase:   'COMPLETE',
                revealPhase: 'COMPLETE',
            }, false, 'onRevealComplete'),

            dismissGlitter: () => set({ showGlitter: false }, false, 'dismissGlitter'),

            _setAssetLoading: (isAssetLoading) =>
                set({ isAssetLoading }, false, '_setAssetLoading'),

            setBrushSize: (brushSize) => set({ brushSize }, false, 'setBrushSize'),
        }),
        { name: 'GameStore' }
    )
);

'use client';

import { useState, useEffect } from 'react';

interface AppConfig {
    revealThreshold: number;
    brushMin: number; brushMax: number; brushDefault: number;
    audioVolume: number;
    lineArtFadeDuration: number;
    coloredFadeDuration: number;
    glitterEnabled: boolean;
    glitterDuration: number;
}

interface ParamDef {
    key: keyof AppConfig;
    label: string;
    description: string;
    min: number;
    max: number;
    step: number;
    unit: string;
    /** Transform stored value → display value */
    toDisplay: (v: number) => number;
    /** Transform display value → stored value */
    fromDisplay: (v: number) => number;
    formatDisplay: (v: number) => string;
}

const PARAMS: ParamDef[] = [
    {
        key: 'revealThreshold',
        label: 'Reveal Threshold',
        description: 'Percentage of line art cleared before the completion flow fires. Lower = triggers sooner.',
        min: 5, max: 100, step: 1, unit: '%',
        toDisplay: v => Math.round(v * 100), fromDisplay: v => v / 100, formatDisplay: v => `${v}%`,
    },
    {
        key: 'brushMin', label: 'Brush Minimum Size',
        description: 'Smallest brush size selectable by the user.',
        min: 5, max: 60, step: 1, unit: 'px',
        toDisplay: v => v, fromDisplay: v => v, formatDisplay: v => `${v}px`,
    },
    {
        key: 'brushMax', label: 'Brush Maximum Size',
        description: 'Largest brush size selectable by the user.',
        min: 20, max: 200, step: 1, unit: 'px',
        toDisplay: v => v, fromDisplay: v => v, formatDisplay: v => `${v}px`,
    },
    {
        key: 'brushDefault', label: 'Default Brush Size',
        description: 'Starting brush size for every new session.',
        min: 5, max: 200, step: 1, unit: 'px',
        toDisplay: v => v, fromDisplay: v => v, formatDisplay: v => `${v}px`,
    },
    {
        key: 'audioVolume', label: 'Completion Audio Volume',
        description: 'Volume of the celebration audio on reveal.',
        min: 0, max: 100, step: 1, unit: '%',
        toDisplay: v => Math.round(v * 100), fromDisplay: v => v / 100, formatDisplay: v => `${v}%`,
    },
    {
        key: 'lineArtFadeDuration', label: 'Line Art Fade Duration',
        description: 'Time (ms) for the remaining line art mask to fade away after threshold is hit.',
        min: 0, max: 3000, step: 50, unit: 'ms',
        toDisplay: v => v, fromDisplay: v => v, formatDisplay: v => `${v}ms`,
    },
    {
        key: 'coloredFadeDuration', label: 'Canvas Fade Duration',
        description: 'Time (ms) for the game canvas (colored image) to fade out, revealing the video behind it.',
        min: 0, max: 3000, step: 50, unit: 'ms',
        toDisplay: v => v, fromDisplay: v => v, formatDisplay: v => `${v}ms`,
    },
    {
        key: 'glitterDuration', label: 'Glitter Sweep Duration',
        description: 'Time (ms) for the shimmer beam to cross the screen on completion.',
        min: 200, max: 3000, step: 50, unit: 'ms',
        toDisplay: v => v, fromDisplay: v => v, formatDisplay: v => `${v}ms`,
    },
];

// Display values state (numbers for sliders; booleans handled separately)
type DisplayConfig = Record<keyof AppConfig, number>;

function toDisplayConfig(cfg: AppConfig): DisplayConfig {
    return Object.fromEntries(
        PARAMS.map(p => [p.key, p.toDisplay((cfg as Record<string,number>)[p.key] ?? 0)])
    ) as DisplayConfig;
}

export default function DevToolsPage() {
    const [saved, setSaved]         = useState<AppConfig | null>(null);
    const [display, setDisplay]     = useState<DisplayConfig | null>(null);
    const [saving, setSaving]       = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'ok' | 'err'>('idle');

    useEffect(() => {
        fetch('/api/config')
            .then(r => r.json())
            .then((cfg: AppConfig) => { setSaved(cfg); setDisplay(toDisplayConfig(cfg)); })
            .catch(console.error);
    }, []);

    const handleChange = (key: keyof AppConfig, displayVal: number) => {
        setDisplay(prev => prev ? { ...prev, [key]: displayVal } : prev);
        setSaveStatus('idle');
    };

    const isDirty = (): boolean => {
        if (!saved || !display) return false;
        return PARAMS.some(p => p.toDisplay(saved[p.key]) !== display[p.key]);
    };

    const handleSave = async () => {
        if (!display) return;
        setSaving(true);
        const payload = Object.fromEntries(
            PARAMS.map(p => [p.key, p.fromDisplay(display[p.key])])
        ) as AppConfig;
        try {
            const res = await fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error();
            const updated: AppConfig = await res.json();
            setSaved(updated);
            setDisplay(toDisplayConfig(updated));
            setSaveStatus('ok');
        } catch {
            setSaveStatus('err');
        } finally {
            setSaving(false);
        }
    };

    const handleReset = () => {
        if (!saved) return;
        setDisplay(toDisplayConfig(saved));
        setSaveStatus('idle');
    };

    if (!display || !saved) {
        return (
            <div className="p-8 flex items-center gap-3 text-zinc-500">
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Loading config…
            </div>
        );
    }

    return (
        <div className="p-8 max-w-3xl">
            <h1 className="text-2xl font-bold text-white mb-1">App Config</h1>
            <p className="text-sm text-zinc-500 mb-2">
                Tune the app's runtime parameters. Changes take effect when the user starts a new session.
            </p>
            <div className="inline-flex items-center gap-2 bg-amber-900/20 border border-amber-700/30
                            text-amber-400 text-xs font-medium px-3 py-1.5 rounded-lg mb-8">
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
                     fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                DevTools — for admin use only
            </div>

            <div className="flex flex-col gap-5">
                {PARAMS.map(param => {
                    const val = display[param.key];
                    const savedVal = param.toDisplay(saved[param.key]);
                    const changed = val !== savedVal;

                    return (
                        <div key={param.key}
                             className={`bg-zinc-900/60 border rounded-2xl p-5 transition-all duration-200
                                         ${changed ? 'border-violet-500/40' : 'border-white/5'}`}>
                            <div className="flex items-start justify-between gap-4 mb-3">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <p className="font-bold text-white text-sm">{param.label}</p>
                                        {changed && (
                                            <span className="text-[9px] font-bold uppercase tracking-wider
                                                             bg-violet-600/25 text-violet-400 px-1.5 py-0.5 rounded-md">
                                                Modified
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                                        {param.description}
                                    </p>
                                </div>

                                {/* Value display + number input */}
                                <div className="flex-shrink-0 flex items-center gap-2">
                                    <input
                                        type="number"
                                        min={param.min} max={param.max} step={param.step}
                                        value={val}
                                        onChange={e => {
                                            const n = parseInt(e.target.value);
                                            if (!isNaN(n)) handleChange(param.key, Math.max(param.min, Math.min(param.max, n)));
                                        }}
                                        className="w-16 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1
                                                   text-white text-sm text-right focus:outline-none focus:border-violet-500 font-mono"
                                    />
                                    <span className="text-xs text-zinc-500 w-6">{param.unit}</span>
                                </div>
                            </div>

                            {/* Slider */}
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] text-zinc-600 w-8 text-right">{param.min}{param.unit}</span>
                                <input
                                    type="range"
                                    min={param.min} max={param.max} step={param.step}
                                    value={val}
                                    onChange={e => handleChange(param.key, parseInt(e.target.value))}
                                    className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer accent-violet-500"
                                />
                                <span className="text-[10px] text-zinc-600 w-10">{param.max}{param.unit}</span>
                            </div>

                            {/* Saved vs current */}
                            {changed && (
                                <p className="text-[10px] text-zinc-600 mt-2">
                                    Saved: <span className="text-zinc-500 font-mono">{param.formatDisplay(savedVal)}</span>
                                    {' → '}
                                    New: <span className="text-violet-400 font-mono">{param.formatDisplay(val)}</span>
                                </p>
                            )}
                        </div>
                    );
                })}

                {/* ── Glitter toggle (boolean, handled separately) ────────── */}
                {saved && (
                    <div className={`bg-zinc-900/60 border rounded-2xl p-5 transition-all duration-200
                                     ${saved.glitterEnabled !== (display ? true : false) ? 'border-violet-500/40' : 'border-white/5'}`}>
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="font-bold text-white text-sm">Glitter Sweep Effect</p>
                                <p className="text-xs text-zinc-500 mt-1">Show the shimmer beam animation across the screen on completion.</p>
                            </div>
                            <button
                                onClick={() => {
                                    const next = !saved.glitterEnabled;
                                    setSaved(prev => prev ? { ...prev, glitterEnabled: next } : prev);
                                    fetch('/api/config', {
                                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ glitterEnabled: next }),
                                    }).catch(() => {});
                                }}
                                className={`relative w-12 h-6 rounded-full transition-colors duration-200
                                            ${saved.glitterEnabled ? 'bg-violet-600' : 'bg-zinc-700'}`}
                            >
                                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow
                                                 transition-transform duration-200
                                                 ${saved.glitterEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Action bar */}
            <div className="sticky bottom-6 mt-8 flex items-center justify-between gap-4
                            bg-zinc-900/90 backdrop-blur-md border border-white/5
                            rounded-2xl px-5 py-4 shadow-xl">
                <div>
                    {saveStatus === 'ok'  && <p className="text-sm text-emerald-400 font-semibold">✅ Config saved!</p>}
                    {saveStatus === 'err' && <p className="text-sm text-red-400 font-semibold">❌ Save failed</p>}
                    {saveStatus === 'idle' && isDirty() && (
                        <p className="text-xs text-zinc-500">You have unsaved changes</p>
                    )}
                    {saveStatus === 'idle' && !isDirty() && (
                        <p className="text-xs text-zinc-700">All settings are saved</p>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    {isDirty() && (
                        <button onClick={handleReset}
                                className="text-sm font-semibold text-zinc-500 hover:text-zinc-200 transition-colors px-3 py-2">
                            Reset
                        </button>
                    )}
                    <button onClick={handleSave} disabled={!isDirty() || saving}
                            className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all
                                        ${isDirty() && !saving
                                          ? 'bg-violet-600 hover:bg-violet-500 text-white shadow-[0_4px_16px_-4px_rgba(139,92,246,0.6)]'
                                          : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'}`}>
                        {saving ? 'Saving…' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
}

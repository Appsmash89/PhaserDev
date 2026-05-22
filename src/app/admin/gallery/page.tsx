'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useSetsStore } from '@/store/useSetsStore';

interface ColorSet {
    id: string; name: string;
    lineArtUrl: string | null; coloredArtUrl: string | null;
    audioUrl: string | null; videoUrl: string | null;
    createdAt: string; creditCost: number;
    genre: string; videoMuted: boolean;
}
interface FileSlot { file: File | null; preview: string | null; }
const emptySlot = (): FileSlot => ({ file: null, preview: null });

const GENRE_PRESETS = [
    'Portraits', 'Animals', 'Nature', 'Fantasy',
    'Architecture', 'Abstract', 'Space', 'General',
];

const ASSET_CONFIG = [
    { key: 'lineArt',    urlField: 'lineArtUrl',    label: 'Line Art',    accept: 'image/*', isImage: true  },
    { key: 'coloredArt', urlField: 'coloredArtUrl', label: 'Colored Art', accept: 'image/*', isImage: true  },
    { key: 'audio',      urlField: 'audioUrl',       label: 'Audio',       accept: 'audio/*', isImage: false },
    { key: 'video',      urlField: 'videoUrl',       label: 'Video',       accept: 'video/*', isImage: false },
] as const;

// ── FileDropZone ──────────────────────────────────────────────────────────────

function FileDropZone({ label, accept, slot, onFile, isImage = false }:
    { label: string; accept: string; slot: FileSlot; onFile: (f: File) => void; isImage?: boolean; }) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [dragging, setDragging] = useState(false);
    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault(); setDragging(false);
        const f = e.dataTransfer.files[0]; if (f) onFile(f);
    }, [onFile]);
    return (
        <div onClick={() => inputRef.current?.click()}
             onDragOver={e => { e.preventDefault(); setDragging(true); }}
             onDragLeave={() => setDragging(false)} onDrop={handleDrop}
             className={`relative flex flex-col items-center justify-center rounded-xl border-2
                         border-dashed cursor-pointer transition-all duration-200 overflow-hidden
                         min-h-[120px] select-none
                         ${dragging ? 'border-violet-400 bg-violet-900/20 scale-[1.02]'
                           : slot.file ? 'border-emerald-500/60 bg-emerald-900/10'
                           : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-500'}`}>
            {isImage && slot.preview && (
                <img src={slot.preview} alt={label}
                     className="absolute inset-0 w-full h-full object-cover opacity-40" />
            )}
            <div className="relative z-10 flex flex-col items-center gap-1 p-3 text-center">
                <p className={`text-[10px] font-bold uppercase tracking-widest
                               ${slot.file ? 'text-emerald-400' : 'text-zinc-500'}`}>
                    {slot.file ? '✓ ' + label : label}
                </p>
                <p className="text-[10px] text-zinc-600 leading-tight max-w-[120px]">
                    {slot.file ? (slot.file.name.length > 18 ? slot.file.name.slice(0,18)+'…' : slot.file.name) : 'Drop or tap'}
                </p>
            </div>
            <input ref={inputRef} type="file" accept={accept} className="hidden"
                   onChange={e => { const f = e.target.files?.[0]; if (f) { onFile(f); e.target.value = ''; } }} />
        </div>
    );
}

// ── AssetRow ──────────────────────────────────────────────────────────────────

function AssetRow({ setId, assetKey, urlField, label, accept, isImage, currentUrl, onUpdated, onDeleted }:
    { setId: string; assetKey: string; urlField: string; label: string; accept: string;
      isImage: boolean; currentUrl: string|null;
      onUpdated: (url: string) => void; onDeleted: () => void; }) {
    const [busy, setBusy] = useState(false);
    const [msg,  setMsg]  = useState<string|null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleReplace = async (file: File) => {
        setBusy(true); setMsg(null);
        const fd = new FormData(); fd.append('assetType', assetKey); fd.append('file', file);
        try {
            const res = await fetch(`/api/sets/${setId}`, { method: 'PATCH', body: fd });
            if (!res.ok) throw new Error();
            const updated: ColorSet = await res.json();
            onUpdated((updated as any)[urlField]);
            setMsg('✅ Replaced');
        } catch { setMsg('❌ Failed'); }
        finally { setBusy(false); }
    };

    const handleDelete = async () => {
        if (!currentUrl) return;
        if (!confirm(`Delete ${label}?`)) return;
        setBusy(true); setMsg(null);
        try {
            const res = await fetch(`/api/sets/${setId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ assetType: assetKey }),
            });
            if (!res.ok) throw new Error();
            onDeleted();
            setMsg('🗑 Deleted');
        } catch { setMsg('❌ Failed'); }
        finally { setBusy(false); }
    };

    return (
        <div className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
            <div className="w-24 flex-shrink-0">
                {isImage && currentUrl
                    ? <img src={currentUrl} alt={label} className="w-24 h-14 object-cover rounded-lg" />
                    : <div className={`w-24 h-14 rounded-lg flex items-center justify-center text-xs font-bold
                                       ${currentUrl ? 'bg-emerald-900/30 text-emerald-400' : 'bg-zinc-800 text-zinc-600'}`}>
                        {currentUrl ? '✓' : '–'} {label}
                      </div>
                }
            </div>
            <div className="flex-1 text-[11px] text-zinc-500 truncate">
                {currentUrl ? currentUrl.split('/').pop() : 'Not uploaded'}
            </div>
            <div className="flex gap-2 flex-shrink-0 items-center">
                {msg && <span className="text-[10px] text-zinc-400">{msg}</span>}
                <button onClick={() => inputRef.current?.click()} disabled={busy}
                        className="text-[10px] font-bold px-2 py-1 bg-zinc-700 text-zinc-300 rounded hover:bg-zinc-600 transition-colors disabled:opacity-50">
                    Replace
                </button>
                {currentUrl && (
                    <button onClick={handleDelete} disabled={busy}
                            className="text-[10px] font-bold px-2 py-1 bg-red-900/40 text-red-400 rounded hover:bg-red-900/70 transition-colors disabled:opacity-50">
                        Delete
                    </button>
                )}
                <input ref={inputRef} type="file" accept={accept} className="hidden"
                       onChange={e => { const f = e.target.files?.[0]; if (f) { handleReplace(f); e.target.value = ''; } }} />
            </div>
        </div>
    );
}

// ── MetadataField — inline update for genre / videoMuted ─────────────────────

function MetadataField({ setId, field, value, onUpdate }:
    { setId: string; field: string; value: string | boolean; onUpdate: (v: string | boolean) => void; }) {
    const [busy, setBusy] = useState(false);

    const patch = async (newVal: string | boolean) => {
        setBusy(true);
        try {
            const res = await fetch(`/api/sets/${setId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ field, value: newVal }),
            });
            if (!res.ok) throw new Error();
            onUpdate(newVal);
        } catch { /* show nothing — state doesn't change on fail */ }
        finally { setBusy(false); }
    };

    if (field === 'videoMuted') {
        return (
            <button
                onClick={() => patch(!value)}
                disabled={busy}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold
                            transition-all disabled:opacity-60
                            ${value
                              ? 'bg-amber-900/40 text-amber-400 border border-amber-500/30'
                              : 'bg-zinc-800 text-zinc-400 border border-zinc-700'}`}
            >
                {busy ? '…' : value ? '🔇 Video Muted' : '🔊 Video Unmuted'}
            </button>
        );
    }

    if (field === 'genre') {
        return (
            <div className="flex items-center gap-2">
                <select
                    defaultValue={value as string}
                    onChange={e => patch(e.target.value)}
                    disabled={busy}
                    className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1
                               text-white text-xs focus:outline-none focus:border-violet-500
                               disabled:opacity-60"
                >
                    {GENRE_PRESETS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                {busy && <span className="text-[10px] text-zinc-500">Saving…</span>}
            </div>
        );
    }

    return null;
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function GalleryManager() {
    const { sets: storeSets } = useSetsStore();
    const [sets, setSets]     = useState<ColorSet[]>([]);
    const [name, setName]     = useState('');
    const [creditCost, setCreditCost] = useState(0);
    const [genre, setGenre]   = useState('Portraits');
    const [videoMuted, setVideoMuted] = useState(false);
    const [lineArt, setLineArt] = useState<FileSlot>(emptySlot());
    const [colored, setColored] = useState<FileSlot>(emptySlot());
    const [audio, setAudio]     = useState<FileSlot>(emptySlot());
    const [video, setVideo]     = useState<FileSlot>(emptySlot());
    const [uploading, setUploading] = useState(false);
    const [status, setStatus]   = useState<{ type: 'ok'|'err'; msg: string }|null>(null);
    const [deleting, setDeleting]   = useState<string|null>(null);
    const [expanded, setExpanded]   = useState<string|null>(null);

    const fetchSets = () => useSetsStore.getState().refetchSets();
    useEffect(() => { fetchSets(); }, []);

    // Sync store sets into local state (admin page has its own local copy for live edits)
    useEffect(() => {
        if (storeSets.length > 0) setSets(storeSets as ColorSet[]);
    }, [storeSets]);

    const setFile = (setter: React.Dispatch<React.SetStateAction<FileSlot>>, isImage: boolean) =>
        (file: File) => setter({ file, preview: isImage ? URL.createObjectURL(file) : null });

    const readyToUpload = name.trim() && lineArt.file && colored.file && audio.file && video.file;

    const handleUpload = async () => {
        if (!readyToUpload) return;
        setUploading(true); setStatus(null);
        const fd = new FormData();
        fd.append('name', name.trim());
        fd.append('creditCost', String(creditCost));
        fd.append('genre', genre);
        fd.append('videoMuted', String(videoMuted));
        fd.append('lineArt', lineArt.file!);
        fd.append('coloredArt', colored.file!);
        fd.append('audio', audio.file!);
        fd.append('video', video.file!);
        try {
            const res = await fetch('/api/sets', { method: 'POST', body: fd });
            if (!res.ok) throw new Error((await res.json()).error || 'Upload failed');
            setStatus({ type: 'ok', msg: '✅ Set uploaded!' });
            setName(''); setCreditCost(0); setGenre('Portraits'); setVideoMuted(false);
            setLineArt(emptySlot()); setColored(emptySlot()); setAudio(emptySlot()); setVideo(emptySlot());
            fetchSets();
        } catch (e) {
            setStatus({ type: 'err', msg: `❌ ${e instanceof Error ? e.message : 'Error'}` });
        } finally { setUploading(false); }
    };

    const handleDeleteSet = async (id: string) => {
        if (deleting === id + '_confirm') {
            await useSetsStore.getState().deleteSet(id);
            setSets(prev => prev.filter(s => s.id !== id));
            setDeleting(null);
        } else { setDeleting(id + '_confirm'); setTimeout(() => setDeleting(null), 3000); }
    };

    return (
        <div className="p-8 max-w-4xl">
            <h1 className="text-2xl font-bold text-white mb-1">Gallery Manager</h1>
            <p className="text-sm text-zinc-500 mb-8">Upload and manage coloring sets</p>

            {/* ── Upload form ─────────────────────────────────────────── */}
            <div className="bg-zinc-900/60 border border-white/5 rounded-3xl p-6 mb-8">
                <h2 className="text-base font-bold text-white mb-1 flex items-center gap-2">
                    <span className="text-violet-400">+</span> Upload New Set
                </h2>
                <p className="text-xs text-zinc-500 mb-5">All 4 assets required.</p>

                {/* Name */}
                <div className="mb-5">
                    <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">
                        Set Name
                    </label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)}
                           placeholder="e.g. Enchanted Forest"
                           className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3
                                      text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-violet-500" />
                </div>

                {/* Credit Cost + Genre — side by side */}
                <div className="flex gap-4 mb-5">
                    <div className="flex-1">
                        <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">
                            Credit Cost <span className="normal-case text-zinc-700 font-normal">(0 = free)</span>
                        </label>
                        <input type="number" min={0} step={10} value={creditCost}
                               onChange={e => setCreditCost(Math.max(0, parseInt(e.target.value) || 0))}
                               className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3
                                          text-white text-sm focus:outline-none focus:border-violet-500 font-mono" />
                    </div>
                    <div className="flex-1">
                        <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">
                            Genre
                        </label>
                        <select value={genre} onChange={e => setGenre(e.target.value)}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3
                                           text-white text-sm focus:outline-none focus:border-violet-500">
                            {GENRE_PRESETS.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                    </div>
                </div>

                {/* Video Muted toggle */}
                <div className="mb-5">
                    <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">
                        Video Audio
                    </label>
                    <button
                        onClick={() => setVideoMuted(v => !v)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all
                                    ${videoMuted
                                      ? 'bg-amber-900/20 border-amber-500/40 text-amber-400'
                                      : 'bg-zinc-800 border-zinc-700 text-zinc-300'}`}
                    >
                        <span className="text-lg">{videoMuted ? '🔇' : '🔊'}</span>
                        <div className="text-left">
                            <p className="text-sm font-bold">{videoMuted ? 'Video Muted' : 'Video Unmuted'}</p>
                            <p className="text-[11px] text-zinc-500">
                                {videoMuted
                                    ? 'Video will play silently after reveal'
                                    : 'Video will play with audio after reveal'}
                            </p>
                        </div>
                        <div className={`ml-auto w-11 h-6 rounded-full flex items-center transition-colors
                                          ${videoMuted ? 'bg-amber-500' : 'bg-zinc-600'}`}>
                            <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5
                                             ${videoMuted ? 'translate-x-5' : 'translate-x-0'}`} />
                        </div>
                    </button>
                </div>

                {/* Asset dropzones */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                    <FileDropZone label="Line Art"    accept="image/*" isImage slot={lineArt} onFile={setFile(setLineArt, true)} />
                    <FileDropZone label="Colored Art" accept="image/*" isImage slot={colored} onFile={setFile(setColored, true)} />
                    <FileDropZone label="Audio"       accept="audio/*" slot={audio} onFile={setFile(setAudio, false)} />
                    <FileDropZone label="Video"       accept="video/*" slot={video} onFile={setFile(setVideo, false)} />
                </div>

                {status && <p className={`text-sm mb-4 font-medium ${status.type === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}>{status.msg}</p>}
                <button onClick={handleUpload} disabled={!readyToUpload || uploading}
                        className={`w-full py-3 rounded-2xl font-bold text-sm transition-all
                                    ${readyToUpload && !uploading
                                      ? 'bg-violet-600 hover:bg-violet-500 text-white'
                                      : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'}`}>
                    {uploading ? 'Uploading…' : 'Upload Set'}
                </button>
            </div>

            {/* ── Library ─────────────────────────────────────────────── */}
            <h2 className="text-base font-bold text-white mb-4">Library ({sets.length} sets)</h2>
            {sets.length === 0
                ? <p className="text-zinc-700 text-sm">No sets yet.</p>
                : <div className="flex flex-col gap-4">
                    {sets.map(set => (
                        <div key={set.id} className="bg-zinc-900/60 border border-white/5 rounded-2xl overflow-hidden">
                            <div className="flex items-center gap-4 p-4">
                                {set.coloredArtUrl
                                    ? <img src={set.coloredArtUrl} alt={set.name}
                                           className="w-16 h-16 object-cover rounded-xl border border-white/10 flex-shrink-0" />
                                    : <div className="w-16 h-16 bg-zinc-800 rounded-xl flex-shrink-0 flex items-center justify-center text-zinc-600 text-xs">No img</div>
                                }
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-white text-sm truncate">{set.name}</p>
                                    <p className="text-[11px] text-zinc-500 mt-0.5">
                                        {new Date(set.createdAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}
                                    </p>
                                    <div className="flex gap-1.5 mt-1.5 flex-wrap items-center">
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md
                                            ${set.creditCost > 0
                                              ? 'bg-violet-900/40 text-violet-400'
                                              : 'bg-zinc-800 text-zinc-500'}`}>
                                            {set.creditCost > 0 ? `💎 ${set.creditCost}` : 'FREE'}
                                        </span>
                                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-zinc-800/60 text-zinc-400">
                                            {set.genre || 'General'}
                                        </span>
                                        {set.videoMuted && (
                                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-900/30 text-amber-500">
                                                🔇 Muted
                                            </span>
                                        )}
                                        {ASSET_CONFIG.map(a => (
                                            <span key={a.key} className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md tracking-wide
                                                ${(set as unknown as Record<string, unknown>)[a.urlField] ? 'bg-emerald-900/40 text-emerald-400' : 'bg-red-900/30 text-red-400'}`}>
                                                {a.label}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2 flex-shrink-0">
                                    <button onClick={() => setExpanded(expanded === set.id ? null : set.id)}
                                            className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5
                                                       bg-zinc-800 text-zinc-400 rounded-lg hover:bg-zinc-700 hover:text-white transition-all">
                                        {expanded === set.id ? 'Close' : 'Manage'}
                                    </button>
                                    <button onClick={() => handleDeleteSet(set.id)}
                                            className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all
                                                ${deleting === set.id+'_confirm' ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-600 hover:text-red-400'}`}>
                                        {deleting === set.id+'_confirm' ? '⚠ Confirm' : 'Delete'}
                                    </button>
                                </div>
                            </div>

                            {expanded === set.id && (
                                <div className="border-t border-white/5 px-4 py-4 bg-zinc-950/30 flex flex-col gap-4">

                                    {/* Metadata controls */}
                                    <div>
                                        <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-3">
                                            Metadata
                                        </p>
                                        <div className="flex flex-wrap gap-3 items-center">
                                            <div>
                                                <p className="text-[10px] text-zinc-600 mb-1">Genre</p>
                                                <MetadataField
                                                    setId={set.id} field="genre" value={set.genre}
                                                    onUpdate={v => setSets(prev => prev.map(s =>
                                                        s.id === set.id ? { ...s, genre: v as string } : s
                                                    ))}
                                                />
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-zinc-600 mb-1">Video Audio</p>
                                                <MetadataField
                                                    setId={set.id} field="videoMuted" value={set.videoMuted}
                                                    onUpdate={v => setSets(prev => prev.map(s =>
                                                        s.id === set.id ? { ...s, videoMuted: v as boolean } : s
                                                    ))}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Asset management */}
                                    <div>
                                        <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-1">
                                            Assets
                                        </p>
                                        {ASSET_CONFIG.map(a => (
                                            <AssetRow key={a.key} setId={set.id} assetKey={a.key} urlField={a.urlField}
                                                label={a.label} accept={a.accept} isImage={a.isImage}
                                                currentUrl={(set as unknown as Record<string, unknown>)[a.urlField] as string | null}
                                                onUpdated={url => setSets(prev => prev.map(s => s.id === set.id ? { ...s, [a.urlField]: url } : s))}
                                                onDeleted={() => setSets(prev => prev.map(s => s.id === set.id ? { ...s, [a.urlField]: null } : s))}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            }
        </div>
    );
}

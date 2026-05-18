import Link from 'next/link';
import fs from 'fs';
import path from 'path';

function readSets() {
    try { return JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', 'sets.json'), 'utf-8')); }
    catch { return []; }
}
function readConfig() {
    try { return JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', 'config.json'), 'utf-8')); }
    catch { return { revealThreshold: 0.75, brushMin: 10, brushMax: 80, brushDefault: 40, audioVolume: 0.85 }; }
}

export default function AdminOverview() {
    const sets   = readSets();
    const config = readConfig();

    const cards = [
        { label: 'Total Sets',         value: sets.length,                     color: 'violet' },
        { label: 'Reveal Threshold',   value: `${Math.round(config.revealThreshold * 100)}%`, color: 'amber' },
        { label: 'Brush Range',        value: `${config.brushMin}–${config.brushMax}px`,      color: 'sky'   },
        { label: 'Audio Volume',       value: `${Math.round(config.audioVolume * 100)}%`,     color: 'emerald'},
    ];

    const colorMap: Record<string, string> = {
        violet:  'bg-violet-600/15 text-violet-300 border-violet-500/20',
        amber:   'bg-amber-600/15  text-amber-300  border-amber-500/20',
        sky:     'bg-sky-600/15    text-sky-300    border-sky-500/20',
        emerald: 'bg-emerald-600/15 text-emerald-300 border-emerald-500/20',
    };

    const quickLinks = [
        { href: '/admin/gallery', label: 'Gallery Manager', desc: 'Upload, replace, and delete coloring sets', icon: '🖼' },
        { href: '/admin/devtools', label: 'App Config',     desc: 'Tune reveal threshold, brush range, and more', icon: '⚙️' },
    ];

    return (
        <div className="p-8 max-w-4xl">
            <h1 className="text-2xl font-bold text-white mb-1">Overview</h1>
            <p className="text-sm text-zinc-500 mb-8">Studio Color — Admin Console</p>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
                {cards.map(c => (
                    <div key={c.label}
                         className={`rounded-2xl border p-4 ${colorMap[c.color]}`}>
                        <p className="text-2xl font-extrabold">{c.value}</p>
                        <p className="text-[11px] font-semibold uppercase tracking-widest mt-1 opacity-70">
                            {c.label}
                        </p>
                    </div>
                ))}
            </div>

            {/* Quick links */}
            <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-600 mb-3">Quick Access</h2>
            <div className="grid sm:grid-cols-2 gap-4 mb-10">
                {quickLinks.map(l => (
                    <Link key={l.href} href={l.href}
                          className="flex items-start gap-4 bg-zinc-900/60 border border-white/5
                                     rounded-2xl p-5 hover:border-violet-500/30 hover:bg-zinc-900
                                     transition-all group">
                        <span className="text-2xl">{l.icon}</span>
                        <div>
                            <p className="font-bold text-white group-hover:text-violet-300 transition-colors">
                                {l.label}
                            </p>
                            <p className="text-xs text-zinc-500 mt-0.5">{l.desc}</p>
                        </div>
                    </Link>
                ))}
            </div>

            {/* Current config preview */}
            <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-600 mb-3">Current Config</h2>
            <div className="bg-zinc-900/60 border border-white/5 rounded-2xl p-5">
                <pre className="text-xs text-zinc-400 font-mono leading-relaxed">
                    {JSON.stringify(config, null, 2)}
                </pre>
                <Link href="/admin/devtools"
                      className="inline-block mt-4 text-[11px] font-bold uppercase tracking-widest
                                 text-violet-400 hover:text-violet-300 transition-colors">
                    Edit in DevTools →
                </Link>
            </div>
        </div>
    );
}

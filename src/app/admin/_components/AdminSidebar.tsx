'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
    {
        section: null,
        items: [
            {
                href: '/admin',
                label: 'Overview',
                icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                         fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                         strokeLinejoin="round">
                        <rect x="3" y="3" width="7" height="7" rx="1"/>
                        <rect x="14" y="3" width="7" height="7" rx="1"/>
                        <rect x="3" y="14" width="7" height="7" rx="1"/>
                        <rect x="14" y="14" width="7" height="7" rx="1"/>
                    </svg>
                ),
            },
        ],
    },
    {
        section: 'CONTENT',
        items: [
            {
                href: '/admin/gallery',
                label: 'Gallery Manager',
                icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                         fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                         strokeLinejoin="round">
                        <rect x="2" y="2" width="20" height="20" rx="2"/>
                        <path d="m2 15 5-5 4 4 4-4 7 7"/>
                        <circle cx="8.5" cy="8.5" r="1.5"/>
                    </svg>
                ),
            },
        ],
    },
    {
        section: 'DEVTOOLS',
        items: [
            {
                href: '/admin/devtools',
                label: 'App Config',
                icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                         fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                         strokeLinejoin="round">
                        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
                        <circle cx="12" cy="12" r="3"/>
                    </svg>
                ),
            },
        ],
    },
];

export function AdminSidebar() {
    const pathname = usePathname();

    const isActive = (href: string) =>
        href === '/admin'
            ? pathname === '/admin'
            : pathname.startsWith(href);

    return (
        <aside className="fixed top-0 left-0 h-full w-60 bg-[#0c0c12] border-r border-white/5
                           flex flex-col z-30 overflow-y-auto">

            {/* Brand */}
            <div className="flex items-center gap-3 px-5 py-5 border-b border-white/5">
                <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                         fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"
                         strokeLinejoin="round">
                        <path d="m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08"/>
                        <path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z"/>
                    </svg>
                </div>
                <div>
                    <p className="text-sm font-bold text-white leading-none">Studio Color</p>
                    <p className="text-[10px] text-zinc-500 leading-none mt-0.5">Admin Console</p>
                </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 py-4 px-3 flex flex-col gap-1">
                {NAV.map((group, gi) => (
                    <div key={gi} className={gi > 0 ? 'mt-4' : ''}>
                        {group.section && (
                            <p className="text-[9px] font-bold uppercase tracking-[0.12em]
                                          text-zinc-600 px-3 mb-1.5 mt-1">
                                {group.section}
                            </p>
                        )}
                        {group.items.map(item => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl
                                            text-sm font-medium transition-all duration-150
                                            ${isActive(item.href)
                                              ? 'bg-violet-600/20 text-violet-300'
                                              : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/5'}`}
                            >
                                <span className={isActive(item.href) ? 'text-violet-400' : 'text-zinc-600'}>
                                    {item.icon}
                                </span>
                                {item.label}
                            </Link>
                        ))}
                    </div>
                ))}
            </nav>

            {/* Footer hint */}
            <div className="px-5 py-4 border-t border-white/5">
                <p className="text-[10px] text-zinc-700 leading-relaxed">
                    Admin access via URL only.<br />
                    Not linked from player app.
                </p>
            </div>
        </aside>
    );
}

'use client';

import dynamic from 'next/dynamic';
import { useRef } from 'react';
import type { IRefPhaserGame } from '@/components/PhaserGame';

// Dynamically import PhaserGame to avoid SSR issues
const PhaserGame = dynamic(() => import('@/components/PhaserGame'), { ssr: false });

export default function Home() {
  const phaserRef = useRef<IRefPhaserGame>(null);

  return (
    <main className="w-screen h-[100dvh] bg-zinc-100 flex flex-col items-center justify-center p-0 sm:p-4">
      <div className="w-full max-w-[600px] flex-1 sm:max-h-[900px] bg-white sm:rounded-[2rem] shadow-2xl overflow-hidden relative border-0 sm:border border-zinc-200">
        <div className="absolute inset-0">
          <PhaserGame ref={phaserRef} />
        </div>
      </div>
    </main>
  );
}

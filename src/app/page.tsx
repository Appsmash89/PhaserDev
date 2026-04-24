'use client';

import dynamic from 'next/dynamic';
import { useRef } from 'react';
import type { IRefPhaserGame } from '@/components/PhaserGame';

// Dynamically import PhaserGame to avoid SSR issues
const PhaserGame = dynamic(() => import('@/components/PhaserGame'), { ssr: false });

export default function Home() {
  const phaserRef = useRef<IRefPhaserGame>(null);

  return (
    <main className="w-screen h-screen">
      <PhaserGame ref={phaserRef} />
    </main>
  );
}

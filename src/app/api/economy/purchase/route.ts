// POST /api/economy/purchase — deduct credits & unlock a set
// CRITICAL: Client NEVER writes credits/unlockedSets directly.
import { NextRequest, NextResponse } from 'next/server';
import { adminDb, verifyToken, ADMIN_CONFIGURED } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

function getSetCost(setId: string): number {
    try {
        const sets = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', 'sets.json'), 'utf-8'));
        const set  = sets.find((s: { id: string; creditCost?: number }) => s.id === setId);
        return set?.creditCost ?? 0;
    } catch { return 0; }
}

export async function POST(request: NextRequest) {
    try {
        const token = request.headers.get('authorization')?.replace('Bearer ', '') ?? '';
        const uid   = await verifyToken(token);
        const { setId } = await request.json() as { setId: string };

        if (!setId) return NextResponse.json({ error: 'setId required' }, { status: 400 });

        const creditCost = getSetCost(setId);

        if (!ADMIN_CONFIGURED || !adminDb) {
            // Dev mode
            return NextResponse.json({ ok: true, newBalance: 999, unlockedSets: [setId] });
        }

        const userRef = adminDb.collection('users').doc(uid);
        let result: { ok: boolean; newBalance: number; unlockedSets: string[] } = { ok: false, newBalance: 0, unlockedSets: [] };

        await adminDb.runTransaction(async (tx) => {
            const snap = await tx.get(userRef);
            const data = snap.data() ?? { credits: 0, unlockedSets: [] };
            const credits: number = data.credits ?? 0;
            const unlocked: string[] = data.unlockedSets ?? [];

            // Already unlocked — free pass
            if (unlocked.includes(setId) || creditCost === 0) {
                result = { ok: true, newBalance: credits, unlockedSets: unlocked };
                return;
            }

            // Insufficient funds
            if (credits < creditCost) {
                throw new Error('INSUFFICIENT_CREDITS');
            }

            const newCredits  = credits - creditCost;
            const newUnlocked = [...unlocked, setId];
            tx.update(userRef, {
                credits:      newCredits,
                unlockedSets: FieldValue.arrayUnion(setId),
            });
            result = { ok: true, newBalance: newCredits, unlockedSets: newUnlocked };
        });

        return NextResponse.json(result);
    } catch (e) {
        const msg = String(e);
        if (msg.includes('INSUFFICIENT_CREDITS')) {
            return NextResponse.json({ error: 'INSUFFICIENT_CREDITS' }, { status: 402 });
        }
        return NextResponse.json({ error: msg }, { status: 401 });
    }
}

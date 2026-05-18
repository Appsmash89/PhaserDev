// POST /api/economy/earn — server-authoritative credit award
// Client NEVER writes credits directly. Only this route does.
import { NextRequest, NextResponse } from 'next/server';
import { adminDb, verifyToken, ADMIN_CONFIGURED } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

// Predetermined earn amounts — not configurable by client
const EARN_TABLE: Record<string, number> = {
    watch_ad:         50,
    click_affiliate:  10,
    daily_bonus:     100,
};

export async function POST(request: NextRequest) {
    try {
        const token = request.headers.get('authorization')?.replace('Bearer ', '') ?? '';
        const uid   = await verifyToken(token);
        const { actionType } = await request.json() as { actionType: string };

        const amount = EARN_TABLE[actionType];
        if (!amount) {
            return NextResponse.json({ error: 'Invalid actionType' }, { status: 400 });
        }

        let newCredits = amount;

        if (ADMIN_CONFIGURED && adminDb) {
            const userRef = adminDb.collection('users').doc(uid);
            await adminDb.runTransaction(async (tx) => {
                const snap = await tx.get(userRef);
                if (!snap.exists) {
                    tx.set(userRef, { credits: amount, unlockedSets: [], hasRemovedAds: false });
                } else {
                    tx.update(userRef, { credits: FieldValue.increment(amount) });
                    newCredits = (snap.data()?.credits ?? 0) + amount;
                }
            });
        } else {
            // Dev mode — return mock balance
            newCredits = 999;
        }

        return NextResponse.json({ ok: true, credited: amount, newBalance: newCredits });
    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 401 });
    }
}

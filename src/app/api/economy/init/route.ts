// POST /api/economy/init — creates user doc on first launch
import { NextRequest, NextResponse } from 'next/server';
import { adminDb, verifyToken, ADMIN_CONFIGURED } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
    try {
        const token = request.headers.get('authorization')?.replace('Bearer ', '') ?? '';
        const uid   = await verifyToken(token);

        if (ADMIN_CONFIGURED && adminDb) {
            const userRef = adminDb.collection('users').doc(uid);
            const snap    = await userRef.get();
            if (!snap.exists) {
                await userRef.set({
                    credits:       0,
                    unlockedSets:  [],
                    hasRemovedAds: false,
                    createdAt:     FieldValue.serverTimestamp(),
                });
            }
        }

        return NextResponse.json({ ok: true });
    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 401 });
    }
}

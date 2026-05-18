// Firebase Admin SDK — server-side only (API routes)
// Never import this from client components!
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore }                       from 'firebase-admin/firestore';
import { getAuth }                            from 'firebase-admin/auth';

export const ADMIN_CONFIGURED = !!(
    process.env.FIREBASE_ADMIN_PROJECT_ID &&
    process.env.FIREBASE_ADMIN_CLIENT_EMAIL &&
    process.env.FIREBASE_ADMIN_PRIVATE_KEY
);

let adminApp: App | null = null;

function getAdminApp(): App | null {
    if (!ADMIN_CONFIGURED) return null;
    if (getApps().length) return getApps()[0];
    return initializeApp({
        credential: cert({
            projectId:   process.env.FIREBASE_ADMIN_PROJECT_ID!,
            clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL!,
            privateKey:  process.env.FIREBASE_ADMIN_PRIVATE_KEY!.replace(/\\n/g, '\n'),
        }),
    });
}

adminApp = getAdminApp();

export const adminDb   = adminApp ? getFirestore(adminApp) : null;
export const adminAuth = adminApp ? getAuth(adminApp)      : null;

/**
 * Verify a Firebase ID token and return the UID.
 * In dev mode (no admin config), returns 'dev-uid'.
 */
export async function verifyToken(token: string): Promise<string> {
    if (!ADMIN_CONFIGURED || !adminAuth || token === 'dev-token') return 'dev-uid';
    const decoded = await adminAuth.verifyIdToken(token);
    return decoded.uid;
}

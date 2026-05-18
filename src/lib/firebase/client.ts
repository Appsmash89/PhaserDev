import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// True only when all required env vars are present
export const FIREBASE_CONFIGURED = !!(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
);

const app = FIREBASE_CONFIGURED
    ? (getApps().length ? getApps()[0] : initializeApp(firebaseConfig))
    : null;

export const auth = app ? getAuth(app) : null;
export const db   = app ? getFirestore(app) : null;

/** Get current user's ID token for API calls. Returns 'dev-token' in local mode. */
export async function getIdToken(): Promise<string> {
    if (!FIREBASE_CONFIGURED || !auth?.currentUser) return 'dev-token';
    return auth.currentUser.getIdToken(true);
}

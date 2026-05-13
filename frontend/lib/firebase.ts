import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Guard: skip initialization during static build when env vars aren't available.
// NEXT_PUBLIC_* vars are inlined into the client bundle at build time, so on the
// client side they will always be present once the build succeeds.
const app =
  firebaseConfig.apiKey
    ? getApps().length === 0
      ? initializeApp(firebaseConfig)
      : getApps()[0]
    : null;

export const auth = app ? getAuth(app) : (null as any);
export const db = app ? getFirestore(app) : (null as any);
export const storage = app ? getStorage(app) : (null as any);
export default app;

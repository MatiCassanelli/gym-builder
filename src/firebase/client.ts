import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';

// Exported so adminUsersService can spin up a second, throwaway app instance to create
// trainer accounts without clobbering the signed-in admin's own session.
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

/**
 * With VITE_USE_EMULATORS=true the whole app talks to the local Firebase emulators instead
 * of the real project: local rules, throwaway data, and trainer accounts you can create
 * without sending real password-reset emails. See `npm run dev:emulator`.
 *
 * Guarded by DEV so a stray env var can never point a production build at localhost.
 */
export const usingEmulators =
  import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === 'true';

if (usingEmulators) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}

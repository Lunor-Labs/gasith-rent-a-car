import dotenv from 'dotenv';
import * as admin from 'firebase-admin';

// FIREBASE_CONFIG is automatically set by the Cloud Functions runtime
const isCloudFunctions = !!process.env.FIREBASE_CONFIG;

if (!isCloudFunctions) {
  dotenv.config();
}

if (!admin.apps.length) {
  if (isCloudFunctions) {
    // Auto-init: credentials + storageBucket come from FIREBASE_CONFIG env var
    admin.initializeApp();
  } else {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    });
  }
}

export const db = admin.firestore();
export const storage = admin.storage();
export const auth = admin.auth();
export default admin;

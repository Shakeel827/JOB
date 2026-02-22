import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyD3S4jkbrxZZ0AviCV8C-C35qXo42x8Pg8",
  authDomain: "jobs-c44e0.firebaseapp.com",
  projectId: "jobs-c44e0",
  storageBucket: "jobs-c44e0.firebasestorage.app",
  messagingSenderId: "803240058441",
  appId: "1:803240058441:web:16fd1f006a2a0dcd43a998",
  measurementId: "G-ZNTB4QF49M",
};

const app: FirebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

let analytics: ReturnType<typeof getAnalytics> | null = null;
isSupported().then((yes) => {
  if (yes) analytics = getAnalytics(app);
});
export { analytics };

export default app;

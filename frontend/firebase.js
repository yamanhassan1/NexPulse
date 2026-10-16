import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "nexpulse-3a2c3.firebaseapp.com",
  projectId: "nexpulse-3a2c3",
  storageBucket: "nexpulse-3a2c3.firebasestorage.app",
  messagingSenderId: "786531551124",
  appId: "1:786531551124:web:cfb23615e88551bd7ab181",
  measurementId: "G-WGS4FKFPC2",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

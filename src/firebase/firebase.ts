// src/firebase/firebase.ts
import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
// SDK completo do Firestore, com streaming e realtime listeners
import { getFirestore } from "firebase/firestore"
import { getStorage } from "firebase/storage"

const firebaseConfig = {
  apiKey: "AIzaSyCeNdxgKJCvVa4htYs703f8_Ct99st-DHQ",
  authDomain: "gestao-trailer-tio-de.firebaseapp.com",
  projectId: "gestao-trailer-tio-de",
  storageBucket: "gestao-trailer-tio-de.appspot.com",
  messagingSenderId: "23181585546",
  appId: "1:23181585546:web:58728e400519f4c6c05173",
  measurementId: "G-5TY84K24SD"
}


const app = initializeApp(firebaseConfig)

// Firebase Auth
export const auth = getAuth(app)

// Firestore completo (Realtime, onSnapshot, offline persistence etc.)
export const db = getFirestore(app)

// Firebase Storage
export const storage = getStorage(app)
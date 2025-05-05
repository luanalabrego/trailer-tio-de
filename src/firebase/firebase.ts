// src/firebase/firebase.ts

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCeNdxgKJCvVa4htYs703f8_Ct99st-DHQ",
  authDomain: "gestao-trailer-tio-de.firebaseapp.com",
  projectId: "gestao-trailer-tio-de",
  storageBucket: "gestao-trailer-tio-de.appspot.com",
  messagingSenderId: "23181585546",
  appId: "1:23181585546:web:58728e400519f4c6c05173",
  measurementId: "G-5TY84K24SD"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

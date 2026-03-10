import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAie1LY7vEQ3eLxOo-f2JrwYI_Fm6lGU40",
  authDomain: "solarradar-8882e.firebaseapp.com",
  projectId: "solarradar-8882e",
  storageBucket: "solarradar-8882e.firebasestorage.app",
  messagingSenderId: "1017230591284",
  appId: "1:1017230591284:web:79567a12cb9722f841d161"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
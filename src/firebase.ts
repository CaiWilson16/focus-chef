import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyCUeO-1pV64C6HBRuxv4_UGNGXrNTAzs5A",
  authDomain: "cherise-wilson.firebaseapp.com",
  databaseURL: "https://cherise-wilson.firebaseio.com",
  projectId: "cherise-wilson",
  storageBucket: "cherise-wilson.appspot.com",
  messagingSenderId: "639100656694",
  appId: "1:639100656694:web:c77782d03ee749ed5f8c97",
  measurementId: "G-ZMEQ9Z6E6V"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const analytics = getAnalytics(app);
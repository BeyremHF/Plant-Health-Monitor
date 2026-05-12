import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  databaseURL: "https://plant-health-monitor-esp32-default-rtdb.europe-west1.firebasedatabase.app",
  apiKey: "AIzaSyA2zNDb5xvlCsN-d7NIaNlp8In0JNZJvko",
  authDomain: "plant-health-monitor-esp32.firebaseapp.com",
  projectId: "plant-health-monitor-esp32",
  storageBucket: "plant-health-monitor-esp32.firebasestorage.app",
  messagingSenderId: "1084057782848",
  appId: "1:1084057782848:web:cd711de94f1af1488f2da5" 
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

export { database };
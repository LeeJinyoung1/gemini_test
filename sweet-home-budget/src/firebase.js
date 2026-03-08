
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: Firebase 콘솔에서 프로젝트 설정 정보를 복사하여 아래에 붙여넣으세요.
const firebaseConfig = {
  apiKey: "AIzaSyB2SufBJD7HYyKLLKDqJ5fzW6iwfqAfWMQ",
  authDomain: "household-account-book-e1337.firebaseapp.com",
  projectId: "household-account-book-e1337",
  storageBucket: "household-account-book-e1337.firebasestorage.app",
  messagingSenderId: "395367789962",
  appId: "1:395367789962:web:81efa1c4da46c5f3968473",
  measurementId: "G-BG2L79F9RJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;

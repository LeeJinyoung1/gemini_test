
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

/**
 * Firebase 프로젝트 설정 정보
 */
const firebaseConfig = {
  apiKey: "AIzaSyB2SufBJD7HYyKLLKDqJ5fzW6iwfqAfWMQ",
  authDomain: "household-account-book-e1337.firebaseapp.com",
  projectId: "household-account-book-e1337",
  storageBucket: "household-account-book-e1337.firebasestorage.app",
  messagingSenderId: "395367789962",
  appId: "1:395367789962:web:81efa1c4da46c5f3968473",
  measurementId: "G-BG2L79F9RJ"
};

// Firebase 앱 초기화
const app = initializeApp(firebaseConfig);

// 인증(Auth) 및 데이터베이스(Firestore) 인스턴스 내보내기
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;

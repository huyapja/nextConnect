import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, MessagePayload } from 'firebase/messaging';

// Firebase configuration với thông tin thật
const firebaseConfig = {
  apiKey: "AIzaSyBjvUyp3VClva2ZEJYlumonaYnwE9_WYC8",
  authDomain: "erpnextvn-d0ec7.firebaseapp.com",
  projectId: "erpnextvn-d0ec7",
  storageBucket: "erpnextvn-d0ec7.firebasestorage.app",
  messagingSenderId: "771489672323",
  appId: "1:771489672323:web:04698dae5fd6db76af7fb6",
  measurementId: "G-13L796L4FB"
};

// VAPID key cho web push
export const VAPID_KEY = "BDSp283ejn319EfnQTWDrD-4Vq587ulgFEMrl9hgA6tfyuci3PfNIsGu3wmwbHAJPgh0zLW59LG4PGyidiJoCUQ";

// Khởi tạo Firebase app
const firebaseApp = initializeApp(firebaseConfig);

// Khởi tạo messaging service
let messaging: any = null;

if (typeof window !== 'undefined') {
  try {
    messaging = getMessaging(firebaseApp);
  } catch (error) {
    console.error('Error initializing Firebase messaging:', error);
  }
}

export { firebaseApp, messaging, getToken, onMessage };
export type { MessagePayload };
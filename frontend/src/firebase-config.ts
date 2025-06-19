import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

// Hàm helper để lấy biến môi trường
const getEnvVar = (key: string, defaultValue: string): string => {
  // Try to get from window object (set by backend)
  if (typeof window !== 'undefined' && (window as any).__ENV__ && (window as any).__ENV__[key]) {
    return (window as any).__ENV__[key];
  }
  // Try to get from meta tag
  const metaTag = document.querySelector(`meta[name="${key}"]`);
  if (metaTag) {
    return metaTag.getAttribute('content') || defaultValue;
  }
  return defaultValue;
};

// Cấu hình Firebase - bạn cần thay thế bằng config thực tế từ Firebase Console
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: getEnvVar('FIREBASE_API_KEY', "AIzaSyBjvUyp3VClva2ZEJYlumonaYnwE9_WYC8"),
    authDomain: getEnvVar('FIREBASE_AUTH_DOMAIN', "erpnextvn-d0ec7.firebaseapp.com"),
    projectId: getEnvVar('FIREBASE_PROJECT_ID', "erpnextvn-d0ec7"),
    storageBucket: getEnvVar('FIREBASE_STORAGE_BUCKET', "erpnextvn-d0ec7.firebasestorage.app"),
    messagingSenderId: getEnvVar('FIREBASE_MESSAGING_SENDER_ID', "771489672323"),
    appId: getEnvVar('FIREBASE_APP_ID', "1:771489672323:web:04698dae5fd6db76af7fb6"),
    measurementId: getEnvVar('FIREBASE_MEASUREMENT_ID', "G-13L796L4FB")
  };

// Khởi tạo Firebase app
const firebaseApp = initializeApp(firebaseConfig);

// Khởi tạo Firebase Messaging
const messaging = getMessaging(firebaseApp);

// VAPID Key - bạn cần lấy từ Firebase Console
const VAPID_KEY = getEnvVar('VAPID_KEY', "BDSp283ejn319EfnQTWDrD-4Vq587ulgFEMrl9hgA6tfyuci3PfNIsGu3wmwbHAJPgh0zLW59LG4PGyidiJoCUQ");

export { messaging, getToken, onMessage, VAPID_KEY };

// Hàm đăng ký FCM token
export const registerFCMToken = async (): Promise<string | null> => {
  try {
    // Yêu cầu quyền notification
    const permission = await Notification.requestPermission();
    
    if (permission !== 'granted') {
      console.log('Notification permission denied');
      return null;
    }

    // Lấy FCM token
    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    
    if (token) {
      console.log('FCM Token:', token);
      
      // Gửi token lên backend Frappe
      await saveFCMTokenToBackend(token);
      
      return token;
    } else {
      console.log('No registration token available');
      return null;
    }
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
};

// Hàm gửi token lên backend
const saveFCMTokenToBackend = async (token: string): Promise<void> => {
  try {
    // Lấy CSRF token
    const csrfToken = getCSRFToken();
    
    if (!csrfToken) {
      console.warn('CSRF token not found, trying without it');
    }
    
    // Chuẩn bị headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (csrfToken) {
      headers['X-Frappe-CSRF-Token'] = csrfToken;
    }
    
    // Chuẩn bị body data
    const bodyData = {
      fcm_token: token,
      platform: 'Web'
    };
    
    console.log('Sending FCM token to backend:', {
      url: '/api/method/raven.api.save_fcm_token.save_fcm_token',
      headers,
      body: bodyData
    });
    
    const response = await fetch('/api/method/raven.api.save_fcm_token.save_fcm_token', {
      method: 'POST',
      headers,
      body: JSON.stringify(bodyData),
      credentials: 'include' // Include cookies
    });

    console.log('Backend response status:', response.status);
    console.log('Backend response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Backend error response:', errorText);
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
    }

    const result = await response.json();
    console.log('FCM token saved to backend:', result);
  } catch (error) {
    console.error('Error saving FCM token to backend:', error);
    
    // Fallback: thử gửi lại với format khác
    try {
      console.log('Trying fallback method...');
      const response = await fetch('/api/method/raven.api.save_fcm_token.save_fcm_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `fcm_token=${encodeURIComponent(token)}&platform=Web`,
        credentials: 'include'
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('FCM token saved to backend (fallback):', result);
      } else {
        console.error('Fallback method also failed:', response.status);
      }
    } catch (fallbackError) {
      console.error('Fallback method error:', fallbackError);
    }
  }
};

// Hàm xóa token khi logout
export const deleteFCMToken = async (token: string): Promise<void> => {
  try {
    const response = await fetch('/api/method/raven.api.save_fcm_token.delete_fcm_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Frappe-CSRF-Token': getCSRFToken(),
      },
      body: JSON.stringify({
        fcm_token: token
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('FCM token deleted from backend:', result);
  } catch (error) {
    console.error('Error deleting FCM token from backend:', error);
  }
};

// Hàm lấy CSRF token từ Frappe
const getCSRFToken = (): string => {
  // Method 1: Lấy từ meta tag
  const metaTag = document.querySelector('meta[name="csrf-token"]');
  if (metaTag) {
    const token = metaTag.getAttribute('content');
    if (token) {
      console.log('CSRF token found in meta tag');
      return token;
    }
  }
  
  // Method 2: Lấy từ window.frappe object
  if ((window as any).frappe?.csrf_token) {
    console.log('CSRF token found in window.frappe');
    return (window as any).frappe.csrf_token;
  }
  
  // Method 3: Lấy từ frappe.boot
  if ((window as any).frappe?.boot?.csrf_token) {
    console.log('CSRF token found in frappe.boot');
    return (window as any).frappe.boot.csrf_token;
  }
  
  // Method 4: Lấy từ cookie
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'csrf_token' && value) {
      console.log('CSRF token found in cookie');
      return value;
    }
  }
  
  // Method 5: Lấy từ localStorage
  const localToken = localStorage.getItem('csrf_token');
  if (localToken) {
    console.log('CSRF token found in localStorage');
    return localToken;
  }
  
  console.warn('No CSRF token found');
  return '';
};

// Hàm lắng nghe foreground messages
export const setupForegroundMessageListener = (): void => {
  onMessage(messaging, (payload) => {
    console.log('Foreground push received:', payload);
    console.log('Notification data:', payload.data);
    console.log('Notification content:', payload.notification);
    
    // Hiển thị notification trong app
    showInAppNotification(payload);
  });
};

// Hàm hiển thị notification trong app
const showInAppNotification = (payload: any): void => {
  const { notification, data } = payload;
  
  console.log('Showing in-app notification:', { notification, data });
  
  // Tạo toast notification
  const toast = document.createElement('div');
  toast.className = 'fcm-toast-notification';
  toast.innerHTML = `
    <div class="fcm-toast-header">
      <strong>${notification?.title || 'Thông báo mới'}</strong>
      <button onclick="this.parentElement.parentElement.remove()">×</button>
    </div>
    <div class="fcm-toast-body">
      ${notification?.body || ''}
    </div>
  `;
  
  // Thêm styles
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: white;
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 16px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 9999;
    max-width: 300px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    cursor: pointer;
    transition: all 0.3s ease;
  `;
  
  // Thêm hover effect
  toast.addEventListener('mouseenter', () => {
    toast.style.transform = 'translateY(-2px)';
    toast.style.boxShadow = '0 6px 16px rgba(0,0,0,0.2)';
  });
  
  toast.addEventListener('mouseleave', () => {
    toast.style.transform = 'translateY(0)';
    toast.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
  });
  
  // Thêm vào DOM
  document.body.appendChild(toast);
  
  // Tự động xóa sau 5 giây
  setTimeout(() => {
    if (toast.parentElement) {
      toast.remove();
    }
  }, 5000);
  
  // Xử lý click để mở channel
  if (data?.channel_id) {
    toast.addEventListener('click', () => {
      console.log('Toast clicked, navigating to channel:', data.channel_id);
      // Chuyển đến channel
      window.location.href = `/raven?channel=${data.channel_id}`;
    });
  }
  
  // Phát âm thanh notification (nếu có)
  try {
    const audio = new Audio('/assets/raven/notification.mp3');
    audio.volume = 0.5;
    audio.play().catch(e => console.log('Could not play notification sound:', e));
  } catch (e) {
    console.log('Could not create notification sound:', e);
  }
}; 
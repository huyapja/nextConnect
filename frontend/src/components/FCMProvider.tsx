import { useEffect, useRef } from 'react';
import { registerFCMToken, setupForegroundMessageListener, deleteFCMToken } from '../firebase-config';

interface FCMProviderProps {
  children: React.ReactNode;
}

export const FCMProvider: React.FC<FCMProviderProps> = ({ children }) => {
  const fcmTokenRef = useRef<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const initializeFCM = async () => {
      try {
        console.log('Initializing FCM...');
        
        // Kiểm tra quyền notification
        if (!('Notification' in window)) {
          console.log('This browser does not support notifications');
          return;
        }
        
        // Đăng ký FCM token
        const token = await registerFCMToken();
        
        if (isMounted && token) {
          fcmTokenRef.current = token;
          console.log('FCM initialized successfully');
          console.log('FCM Token:', token);
          
          // Thiết lập listener cho foreground messages
          setupForegroundMessageListener();
          
          // Kiểm tra service worker
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then((registration) => {
              console.log('Service Worker ready:', registration);
            }).catch((error) => {
              console.error('Service Worker not ready:', error);
            });
          }
        }
      } catch (error) {
        console.error('Error initializing FCM:', error);
      }
    };

    // Khởi tạo FCM khi component mount
    initializeFCM();

    // Cleanup khi component unmount
    return () => {
      isMounted = false;
      
      // Xóa FCM token khi logout
      if (fcmTokenRef.current) {
        deleteFCMToken(fcmTokenRef.current).catch(error => {
          console.error('Error deleting FCM token:', error);
        });
      }
    };
  }, []);

  // Xử lý khi user logout
  useEffect(() => {
    const handleLogout = () => {
      if (fcmTokenRef.current) {
        deleteFCMToken(fcmTokenRef.current).catch(error => {
          console.error('Error deleting FCM token on logout:', error);
        });
        fcmTokenRef.current = null;
      }
    };

    // Lắng nghe sự kiện logout
    window.addEventListener('beforeunload', handleLogout);
    
    // Lắng nghe sự kiện visibility change để kiểm tra logout
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Có thể user đã logout hoặc đóng tab
        // Không xóa token ở đây vì có thể user chỉ chuyển tab
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleLogout);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return <>{children}</>;
}; 
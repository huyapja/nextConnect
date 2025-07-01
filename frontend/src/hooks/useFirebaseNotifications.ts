import { useEffect, useState, useCallback } from 'react';
import { firebaseNotificationService, getFirebaseToken } from '../lib/firebase/firebase-notification-service';
import { MessagePayload } from '../lib/firebase/firebase-config';

interface UseFirebaseNotificationsReturn {
  isInitialized: boolean;
  token: string | null;
  sendTestNotification: () => Promise<void>;
  refreshToken: () => Promise<void>;
  unregisterToken: () => Promise<void>;
}

export const useFirebaseNotifications = (
  onMessage?: (payload: MessagePayload) => void
): UseFirebaseNotificationsReturn => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Kiểm tra initialization status
    const checkInitialization = () => {
      const initialized = firebaseNotificationService.isInitialized();
      const currentToken = firebaseNotificationService.getToken();
      
      setIsInitialized(initialized);
      setToken(currentToken);
    };

    // Check immediately
    checkInitialization();

    // Set up polling to check status
    const interval = setInterval(checkInitialization, 1000);

    // Clean up after 10 seconds
    setTimeout(() => {
      clearInterval(interval);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Set up message callback if provided
    if (onMessage && isInitialized) {
      firebaseNotificationService.onMessage(onMessage);
    }
  }, [onMessage, isInitialized]);

  const sendTestNotification = useCallback(async () => {
    await firebaseNotificationService.sendTestNotification();
  }, []);

  const refreshToken = useCallback(async () => {
    await firebaseNotificationService.refreshToken();
    setToken(firebaseNotificationService.getToken());
  }, []);

  const unregisterToken = useCallback(async () => {
    await firebaseNotificationService.unregisterToken();
    setToken(null);
  }, []);

  return {
    isInitialized,
    token,
    sendTestNotification,
    refreshToken,
    unregisterToken,
  };
};

// Hook để lắng nghe notifications trong component
export const useNotificationListener = () => {
  const [lastNotification, setLastNotification] = useState<{
    title: string;
    body: string;
    data: any;
  } | null>(null);

  useEffect(() => {
    const handleNotification = (event: CustomEvent) => {
      setLastNotification(event.detail);
    };

    window.addEventListener('ravenNotification', handleNotification as EventListener);
    
    return () => {
      window.removeEventListener('ravenNotification', handleNotification as EventListener);
    };
  }, []);

  return lastNotification;
}; 
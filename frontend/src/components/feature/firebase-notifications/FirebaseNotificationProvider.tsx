import React, { createContext, useContext, useEffect } from 'react';
import { useFirebaseNotifications, useNotificationListener } from '../../../hooks/useFirebaseNotifications';
import { MessagePayload } from '../../../lib/firebase/firebase-config';
import { toast } from 'sonner';

interface FirebaseNotificationContextType {
  isInitialized: boolean;
  token: string | null;
  sendTestNotification: () => Promise<void>;
  refreshToken: () => Promise<void>;
  unregisterToken: () => Promise<void>;
}

const FirebaseNotificationContext = createContext<FirebaseNotificationContextType | null>(null);

export const useFirebaseNotificationContext = () => {
  const context = useContext(FirebaseNotificationContext);
  if (!context) {
    throw new Error('useFirebaseNotificationContext must be used within FirebaseNotificationProvider');
  }
  return context;
};

interface FirebaseNotificationProviderProps {
  children: React.ReactNode;
}

export const FirebaseNotificationProvider: React.FC<FirebaseNotificationProviderProps> = ({ children }) => {
  // Handle foreground messages
  const handleMessage = (payload: MessagePayload) => {
    const { notification, data } = payload;
    
    if (notification) {
      // Show toast notification
      toast(notification.title || 'Thông báo mới', {
        description: notification.body,
        duration: 5000,
        action: data?.click_action ? {
          label: 'Xem',
          onClick: () => {
            if (data.click_action) {
              window.location.href = data.click_action;
            }
          }
        } : undefined
      });
    }
  };

  const firebaseNotifications = useFirebaseNotifications(handleMessage);
  const lastNotification = useNotificationListener();

  useEffect(() => {
    if (lastNotification) {
      console.log('Received notification:', lastNotification);
    }
  }, [lastNotification]);

  return (
    <FirebaseNotificationContext.Provider value={firebaseNotifications}>
      {children}
    </FirebaseNotificationContext.Provider>
  );
}; 
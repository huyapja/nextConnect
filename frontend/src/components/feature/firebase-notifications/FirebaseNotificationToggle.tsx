import React, { useState, useEffect } from 'react';
import { DropdownMenu } from '@radix-ui/themes';
import { FiBell, FiBellOff } from 'react-icons/fi';
import { toast } from 'sonner';
import { useFirebaseNotificationContext } from './FirebaseNotificationProvider';
import { __ } from '@/utils/translations';

export const FirebaseNotificationToggle: React.FC = () => {
  const { isInitialized, token, refreshToken, unregisterToken } = useFirebaseNotificationContext();
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Check notification permission and Firebase status
  useEffect(() => {
    const checkStatus = () => {
      const hasPermission = Notification.permission === 'granted';
      const hasToken = isInitialized && !!token;
      setIsEnabled(hasPermission && hasToken);
    };

    checkStatus();
  }, [isInitialized, token]);

  const toggleFirebaseNotifications = async () => {
    if (isLoading) return;

    setIsLoading(true);

    try {
      if (!isEnabled) {
        // Enable Firebase notifications
        if (Notification.permission === 'denied') {
          toast.error(__('Notifications are blocked'), {
            description: __('Please enable notifications in your browser settings')
          });
          setIsLoading(false);
          return;
        }

        if (Notification.permission === 'default') {
          const permission = await Notification.requestPermission();
          if (permission !== 'granted') {
            toast.error(__('Permission denied for notifications'));
            setIsLoading(false);
            return;
          }
        }

        // Refresh/register Firebase token
        await refreshToken();
        
        toast.success(__('Firebase notifications enabled'));
        setIsEnabled(true);

      } else {
        // Disable Firebase notifications
        await unregisterToken();
        
        toast.info(__('Firebase notifications disabled'));
        setIsEnabled(false);
      }

    } catch (error) {
      console.error('Firebase notification toggle error:', error);
      toast.error(__('Failed to toggle notifications'), {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Don't show if not supported
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    return null;
  }

  return (
    <DropdownMenu.Item 
      color='gray' 
      onClick={toggleFirebaseNotifications} 
      className='flex justify-normal gap-2 cursor-pointer'
      disabled={isLoading}
    >
      {isEnabled ? (
        <>
          <FiBellOff size={14} className="text-orange-600" /> 
          {isLoading ? __('Disabling...') : __('Disable Firebase Notifications')}
        </>
      ) : (
        <>
          <FiBell size={14} className="text-green-600" /> 
          {isLoading ? __('Enabling...') : __('Enable Firebase Notifications')}
        </>
      )}
    </DropdownMenu.Item>
  );
}; 
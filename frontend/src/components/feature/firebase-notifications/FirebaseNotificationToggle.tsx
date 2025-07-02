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
          toast.error('Thông báo đã bị chặn', {
            description: 'Vui lòng bật thông báo trong cài đặt trình duyệt'
          });
          setIsLoading(false);
          return;
        }

        if (Notification.permission === 'default') {
          const permission = await Notification.requestPermission();
          if (permission !== 'granted') {
            toast.error('Không có quyền sử dụng thông báo');
            setIsLoading(false);
            return;
          }
        }

        // Refresh/register Firebase token
        await refreshToken();
        
        toast.success('Đã bật thông báo Firebase');
        setIsEnabled(true);

      } else {
        // Disable Firebase notifications
        await unregisterToken();
        
        toast.info('Đã tắt thông báo Firebase');
        setIsEnabled(false);
      }

    } catch (error) {
      console.error('Firebase notification toggle error:', error);
      toast.error('Không thể bật/tắt thông báo', {
        description: error instanceof Error ? error.message : 'Lỗi không xác định'
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
          {isLoading ? 'Đang tắt...' : 'Tắt thông báo'}
        </>
      ) : (
        <>
          <FiBell size={14} className="text-green-600" /> 
          {isLoading ? 'Đang bật...' : 'Bật thông báo'}
        </>
      )}
    </DropdownMenu.Item>
  );
}; 
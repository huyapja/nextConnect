import React, { useState } from 'react';
import { useFirebaseNotificationContext } from './FirebaseNotificationProvider';
import { Button, Tooltip } from '@radix-ui/themes';
import { FiBell } from 'react-icons/fi';
import { toast } from 'sonner';

interface FirebaseTestButtonProps {
  size?: '1' | '2' | '3';
  variant?: 'solid' | 'soft' | 'outline' | 'ghost';
}

export const FirebaseTestButton: React.FC<FirebaseTestButtonProps> = ({ 
  size = '1', 
  variant = 'ghost' 
}) => {
  const { isInitialized, sendTestNotification } = useFirebaseNotificationContext();
  const [isLoading, setIsLoading] = useState(false);

  const handleTest = async () => {
    if (!isInitialized) {
      toast.error('Firebase notifications chưa được khởi tạo');
      return;
    }

    setIsLoading(true);
    try {
      await sendTestNotification();
      toast.success('🔥 Test notification đã được gửi!');
    } catch (error) {
      toast.error('Không thể gửi test notification');
      console.error('Test notification error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getTooltipContent = () => {
    if (!isInitialized) {
      return 'Firebase notifications chưa được khởi tạo';
    }
    if (Notification.permission !== 'granted') {
      return 'Vui lòng cấp phép notifications cho browser';
    }
    return 'Gửi test Firebase notification';
  };

  return (
    <Tooltip content={getTooltipContent()}>
      <Button
        size={size}
        variant={variant}
        color="gray"
        onClick={handleTest}
        disabled={!isInitialized || isLoading || Notification.permission !== 'granted'}
        className="transition-all duration-200"
      >
        <FiBell size={12} />
        {isLoading ? 'Đang gửi...' : 'Test 🔥'}
      </Button>
    </Tooltip>
  );
}; 
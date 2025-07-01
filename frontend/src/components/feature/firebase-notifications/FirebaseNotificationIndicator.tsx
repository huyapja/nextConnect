import React from 'react';
import { useFirebaseNotificationContext } from './FirebaseNotificationProvider';
import { Badge, Tooltip } from '@radix-ui/themes';
import { FiBell, FiBellOff } from 'react-icons/fi';

export const FirebaseNotificationIndicator: React.FC = () => {
  const { isInitialized, token } = useFirebaseNotificationContext();

  const getStatus = () => {
    if (Notification.permission === 'denied') {
      return {
        color: 'red' as const,
        icon: <FiBellOff size={12} />,
        text: 'Notifications Denied',
        tooltip: 'Browser notifications have been denied. Please enable them in browser settings.'
      };
    }
    
    if (!isInitialized || !token) {
      return {
        color: 'yellow' as const,
        icon: <FiBellOff size={12} />,
        text: 'Not Connected',
        tooltip: 'Firebase notifications not initialized. Refreshing page might help.'
      };
    }

    return {
      color: 'green' as const,
      icon: <FiBell size={12} />,
      text: 'Connected',
      tooltip: 'Firebase notifications are working properly'
    };
  };

  const status = getStatus();

  return (
    <Tooltip content={status.tooltip}>
      <Badge color={status.color} size="1" className="flex items-center gap-1 cursor-help">
        {status.icon}
        <span className="text-xs">{status.text}</span>
      </Badge>
    </Tooltip>
  );
}; 
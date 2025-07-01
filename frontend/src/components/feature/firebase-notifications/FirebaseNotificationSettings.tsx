import React from 'react';
import { useFirebaseNotificationContext } from './FirebaseNotificationProvider';
import { Button } from '@radix-ui/themes';
import { toast } from 'sonner';

export const FirebaseNotificationSettings: React.FC = () => {
  const { 
    isInitialized, 
    token, 
    sendTestNotification, 
    refreshToken, 
    unregisterToken 
  } = useFirebaseNotificationContext();

  const handleSendTest = async () => {
    try {
      await sendTestNotification();
      toast.success('Test notification đã được gửi!');
    } catch (error) {
      toast.error('Không thể gửi test notification');
      console.error('Error sending test notification:', error);
    }
  };

  const handleRefreshToken = async () => {
    try {
      await refreshToken();
      toast.success('Token đã được làm mới!');
    } catch (error) {
      toast.error('Không thể làm mới token');
      console.error('Error refreshing token:', error);
    }
  };

  const handleUnregisterToken = async () => {
    try {
      await unregisterToken();
      toast.success('Token đã được hủy đăng ký!');
    } catch (error) {
      toast.error('Không thể hủy đăng ký token');
      console.error('Error unregistering token:', error);
    }
  };

  const copyTokenToClipboard = () => {
    if (token) {
      navigator.clipboard.writeText(token);
      toast.success('Token đã được copy vào clipboard!');
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="border rounded-lg p-4 space-y-4">
        <h2 className="text-xl font-semibold">🔔 Firebase Push Notifications</h2>
        
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-medium">Trạng thái:</span>
            <span 
              className={`px-2 py-1 rounded text-sm ${
                isInitialized 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {isInitialized ? '✅ Đã khởi tạo' : '❌ Chưa khởi tạo'}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="font-medium">Permission:</span>
            <span 
              className={`px-2 py-1 rounded text-sm ${
                Notification.permission === 'granted'
                  ? 'bg-green-100 text-green-800' 
                  : Notification.permission === 'denied'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}
            >
              {Notification.permission === 'granted' ? '✅ Đã cấp phép' :
               Notification.permission === 'denied' ? '❌ Bị từ chối' : '⏳ Chưa xác định'}
            </span>
          </div>
        </div>

        {token && (
          <div className="space-y-2">
            <span className="font-medium">Firebase Token:</span>
            <div className="flex gap-2">
              <code className="bg-gray-100 p-2 rounded text-xs break-all flex-1">
                {token.substring(0, 50)}...
              </code>
              <Button size="1" variant="soft" onClick={copyTokenToClipboard}>
                Copy
              </Button>
            </div>
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          <Button 
            onClick={handleSendTest} 
            disabled={!isInitialized}
            variant="solid"
          >
            🧪 Gửi Test Notification
          </Button>
          
          <Button 
            onClick={handleRefreshToken} 
            disabled={!isInitialized}
            variant="soft"
          >
            🔄 Làm mới Token
          </Button>
          
          <Button 
            onClick={handleUnregisterToken} 
            disabled={!token}
            variant="soft"
            color="red"
          >
            🗑️ Hủy đăng ký
          </Button>
        </div>

        {!isInitialized && (
          <div className="bg-blue-50 border border-blue-200 rounded p-3">
            <p className="text-sm text-blue-800">
              💡 <strong>Lưu ý:</strong> Để nhận push notifications, vui lòng:
            </p>
            <ul className="list-disc list-inside text-sm text-blue-700 mt-2 space-y-1">
              <li>Cấp phép thông báo cho website</li>
              <li>Đảm bảo Service Worker đã được đăng ký</li>
              <li>Kiểm tra console để xem lỗi chi tiết</li>
            </ul>
          </div>
        )}

        <div className="bg-gray-50 border rounded p-3">
          <p className="text-sm text-gray-700">
            🔥 <strong>Firebase Service:</strong> Hệ thống notification sử dụng Firebase Cloud Messaging
            để gửi push notifications realtime đến các thiết bị của bạn.
          </p>
        </div>
      </div>
    </div>
  );
}; 
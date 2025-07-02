import { getErrorMessage } from '@/components/layout/AlertBanner/ErrorBanner'
import useIsPushNotificationEnabled from '@/hooks/fetchers/useIsPushNotificationEnabled'
import { __ } from '@/utils/translations'
import { DropdownMenu } from '@radix-ui/themes'
import { useState } from 'react'
import { BsBell, BsBellSlash } from 'react-icons/bs'
import { toast } from 'sonner'

const PushNotificationToggle = () => {
  const isPushAvailable = useIsPushNotificationEnabled()

  const [pushNotificationsEnabled, setPushNotificationsEnabled] = useState(
    // Kiểm tra Firebase notification permission thay vì frappePushNotification
    Notification.permission === 'granted' && (window as any).firebaseNotificationService?.getToken()
  )

  const togglePushNotifications = async () => {
    // Disable chức năng này vì đã có FirebaseNotificationToggle riêng
    toast.info('Vui lòng sử dụng tùy chọn "Bật/Tắt thông báo" cho Firebase', {
      description: 'Chức năng Frappe Push Notification đã được vô hiệu hóa'
    })
    return
    
    // Code cũ bị disable
    // if (!pushNotificationsEnabled) {
    //   enablePushNotifications()
    // } else {
    //   // Disable Firebase notification bằng cách unregister token
    //   (window as any).firebaseNotificationService?.unregisterToken()
    //     .then((data: any) => {
    //       setPushNotificationsEnabled(false) // Disable the switch
    //       toast.info('Đã tắt thông báo Firebase')
    //     })
    //     .catch((error: any) => {
    //       toast.error(__('There was an error'), {
    //         description: getErrorMessage(error)
    //       })
    //     })
    // }
  }

  const enablePushNotifications = async () => {
    toast.promise(
      // Sử dụng Firebase notification service thay vì frappePushNotification
      (window as any).firebaseNotificationService?.refreshToken()
        .then(() => {
          // Kiểm tra permission
          if (Notification.permission === 'granted') {
            setPushNotificationsEnabled(true)
            return { permission_granted: true }
          } else {
            // Request permission
            return Notification.requestPermission().then(permission => {
              if (permission === 'granted') {
                setPushNotificationsEnabled(true)
                return { permission_granted: true }
              } else {
                setPushNotificationsEnabled(false)
                throw new Error('Không có quyền sử dụng thông báo')
              }
            })
          }
        })
        .catch((error: any) => {
          setPushNotificationsEnabled(false)
          throw error
        }),
      {
        success: 'Đã bật thông báo Firebase',
        loading: 'Đang bật thông báo Firebase...',
        error: (e: Error) => e.message || 'Không thể bật thông báo Firebase'
      }
    )
  }

  // Comment lại để cho phép sử dụng Firebase notifications
  // if (!window.frappe?.boot.push_relay_server_url && !isPushAvailable) {
  //   return null
  // }
  // Ẩn nút Frappe/Raven Cloud vì đã có FirebaseNotificationToggle
  return null
}

export default PushNotificationToggle

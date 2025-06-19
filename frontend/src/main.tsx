import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import '@radix-ui/themes/styles.css'
import './index.css'

// Import hệ thống FCM tùy chỉnh
import { registerFCMToken, setupForegroundMessageListener } from './firebase-config'

// Vô hiệu hóa FrappePushNotification để tránh xung đột
// @ts-ignore
// import FrappePushNotification from '../public/frappe-push-notification'

const registerServiceWorker = () => {
  // Vô hiệu hóa FrappePushNotification
  // @ts-ignore
  // window.frappePushNotification = new FrappePushNotification('raven')

  if ('serviceWorker' in navigator) {
    // Sử dụng service worker tùy chỉnh cho FCM
    navigator.serviceWorker
      .register('/firebase-messaging-sw.js', {
        type: 'module'
      })
      .then((registration) => {
        console.info('Custom FCM Service Worker registered')
        
        // Khởi tạo hệ thống FCM tùy chỉnh
        registerFCMToken().then((token) => {
          if (token) {
            console.info('FCM Token registered successfully')
            // Thiết lập listener cho foreground messages
            setupForegroundMessageListener()
          }
        }).catch((err) => {
          console.error('Failed to register FCM token', err)
        })
      })
      .catch((err: any) => {
        console.error('Failed to register service worker', err)
      })
  } else {
    console.error('Service worker not enabled/supported by browser')
  }
}

if (import.meta.env.DEV) {
  fetch('/api/method/raven.www.raven.get_context_for_dev', {
    method: 'POST'
  })
    .then((response) => response.json())
    .then((values) => {
      const v = JSON.parse(values.message)
      if (!window.frappe) window.frappe = {}
      //@ts-ignore
      window.frappe.boot = v
      registerServiceWorker()
      ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
        <React.StrictMode>
          <App />
        </React.StrictMode>
      )
    })
} else {
  registerServiceWorker()
  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}

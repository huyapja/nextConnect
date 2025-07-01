import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import '@radix-ui/themes/styles.css'
import './index.css'

// @ts-ignore
import FrappePushNotification from '../public/frappe-push-notification'

const registerServiceWorker = () => {
  // @ts-ignore
  window.frappePushNotification = new FrappePushNotification('raven')

  if ('serviceWorker' in navigator) {
    // Register Firebase service worker first
    navigator.serviceWorker
      .register('/firebase-messaging-sw.js', {
        scope: '/',
        type: 'classic'
      })
      .then((registration) => {
        console.info('Firebase Service Worker registered successfully')
      })
      .catch((err: any) => {
        console.warn('Firebase Service Worker registration failed:', err)
      })

    // Register Frappe service worker
    // @ts-ignore
    window.frappePushNotification
      .appendConfigToServiceWorkerURL('/assets/raven/raven/sw.js')
      .then((url: string) => {
        navigator.serviceWorker
          .register(url, {
            type: 'classic'
          })
          .then((registration) => {
            // @ts-ignore
            window.frappePushNotification.initialize(registration).then(() => {
              console.info('Frappe Push Notification initialized')
            })
          })
      })
      .catch((err: any) => {
        console.error('Failed to register Frappe service worker', err)
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

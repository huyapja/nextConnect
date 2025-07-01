// Import Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBjvUyp3VClva2ZEJYlumonaYnwE9_WYC8",
  authDomain: "erpnextvn-d0ec7.firebaseapp.com",
  projectId: "erpnextvn-d0ec7",
  storageBucket: "erpnextvn-d0ec7.firebasestorage.app",
  messagingSenderId: "771489672323",
  appId: "1:771489672323:web:04698dae5fd6db76af7fb6",
  measurementId: "G-13L796L4FB"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Get messaging instance
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);

  const notificationTitle = payload.notification?.title || 'Raven Notification';
  const notificationOptions = {
    body: payload.notification?.body || 'Bạn có một tin nhắn mới',
    icon: '/assets/raven/raven-logo.png',
    badge: '/assets/raven/raven-logo.png',
    image: payload.notification?.image,
    data: payload.data,
    tag: payload.data?.channel_id || 'raven-notification',
    requireInteraction: true,
    actions: [
      {
        action: 'open',
        title: 'Mở',
        icon: '/assets/raven/raven-logo.png'
      },
      {
        action: 'close',
        title: 'Đóng'
      }
    ]
  };

  // Show notification
  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', function(event) {
  console.log('[firebase-messaging-sw.js] Notification click received:', event);

  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const clickAction = event.notification.data?.click_action || 
                     event.notification.data?.message_url || 
                     '/raven';

  // Open or focus window
  event.waitUntil(
    clients.matchAll({
      type: 'window'
    }).then(function(clientList) {
      // Check if there's already a window open
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url.includes('/raven') && 'focus' in client) {
          client.postMessage({
            type: 'NOTIFICATION_CLICKED',
            data: event.notification.data
          });
          return client.focus();
        }
      }
      
      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(clickAction);
      }
    })
  );
});

// Handle notification close
self.addEventListener('notificationclose', function(event) {
  console.log('[firebase-messaging-sw.js] Notification closed:', event);
});

// Handle push event (backup)
self.addEventListener('push', function(event) {
  console.log('[firebase-messaging-sw.js] Push received:', event);
  
  if (event.data) {
    try {
      const payload = event.data.json();
      const notificationTitle = payload.notification?.title || 'Raven Notification';
      const notificationOptions = {
        body: payload.notification?.body || 'Bạn có một tin nhắn mới',
        icon: '/assets/raven/raven-logo.png',
        badge: '/assets/raven/raven-logo.png',
        data: payload.data
      };

      event.waitUntil(
        self.registration.showNotification(notificationTitle, notificationOptions)
      );
    } catch (error) {
      console.error('[firebase-messaging-sw.js] Error handling push:', error);
    }
  }
}); 
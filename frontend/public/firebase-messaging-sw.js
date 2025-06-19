// Firebase Messaging Service Worker
// Xử lý push notifications khi app đang chạy nền

importScripts("https://www.gstatic.com/firebasejs/10.10.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.10.0/firebase-messaging-compat.js");

// Cấu hình Firebase - phải giống với firebase-config.ts
firebase.initializeApp({
  apiKey: "AIzaSyBjvUyp3VClva2ZEJYlumonaYnwE9_WYC8",
  authDomain: "erpnextvn-d0ec7.firebaseapp.com",
  projectId: "erpnextvn-d0ec7",
  storageBucket: "erpnextvn-d0ec7.firebasestorage.app",
  messagingSenderId: "771489672323",
  appId: "1:771489672323:web:04698dae5fd6db76af7fb6",
  measurementId: "G-13L796L4FB"
});

const messaging = firebase.messaging();

// Xử lý background messages
messaging.onBackgroundMessage(function(payload) {
  console.log("[firebase-messaging-sw.js] Received background message ", payload);
  
  const notificationTitle = payload.notification?.title || "Thông báo mới";
  const notificationOptions = {
    body: payload.notification?.body || "",
    icon: "/assets/raven/raven-logo.png",
    badge: "/assets/raven/raven-logo.png",
    tag: "raven-notification",
    data: payload.data || {},
    actions: [
      {
        action: "open",
        title: "Mở",
        icon: "/assets/raven/raven-logo.png"
      },
      {
        action: "close",
        title: "Đóng"
      }
    ],
    requireInteraction: false,
    silent: false,
    vibrate: [200, 100, 200],
    timestamp: Date.now()
  };

  // Hiển thị notification
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Xử lý khi user click vào notification
self.addEventListener('notificationclick', function(event) {
  console.log('[Service Worker] Notification click received.');
  console.log('[Service Worker] Notification data:', event.notification.data);
  
  event.notification.close();
  
  if (event.action === 'close') {
    return;
  }
  
  // Xử lý click để mở app
  const data = event.notification.data;
  let urlToOpen = '/raven';
  
  // Nếu có channel_id, mở trực tiếp channel đó
  if (data && data.channel_id) {
    urlToOpen = `/raven?channel=${data.channel_id}`;
  }
  
  console.log('[Service Worker] Opening URL:', urlToOpen);
  
  // Mở tab mới hoặc focus tab hiện tại
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // Kiểm tra xem có tab nào đang mở Raven không
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes('/raven') && 'focus' in client) {
          console.log('[Service Worker] Focusing existing Raven tab');
          return client.focus();
        }
      }
      
      // Nếu không có tab nào mở Raven, mở tab mới
      if (clients.openWindow) {
        console.log('[Service Worker] Opening new Raven tab');
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Xử lý khi notification bị đóng
self.addEventListener('notificationclose', function(event) {
  console.log('[Service Worker] Notification closed:', event.notification.tag);
});

// Xử lý push event (fallback)
self.addEventListener('push', function(event) {
  console.log('[Service Worker] Push received.');
  console.log('[Service Worker] Push data:', event.data ? event.data.json() : 'No data');
  
  if (event.data) {
    const data = event.data.json();
    const notificationTitle = data.notification?.title || "Thông báo mới";
    const notificationOptions = {
      body: data.notification?.body || "",
      icon: "/assets/raven/raven-logo.png",
      badge: "/assets/raven/raven-logo.png",
      tag: "raven-notification",
      data: data.data || {},
      requireInteraction: false,
      vibrate: [200, 100, 200],
      timestamp: Date.now()
    };
    
    event.waitUntil(
      self.registration.showNotification(notificationTitle, notificationOptions)
    );
  }
});

// Install event
self.addEventListener('install', function(event) {
  console.log('[Service Worker] Installing Service Worker...');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', function(event) {
  console.log('[Service Worker] Activating Service Worker...');
  event.waitUntil(self.clients.claim());
});

// Message event để giao tiếp với main thread
self.addEventListener('message', function(event) {
  console.log('[Service Worker] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Xử lý lỗi
self.addEventListener('error', function(event) {
  console.error('[Service Worker] Error:', event.error);
});

self.addEventListener('unhandledrejection', function(event) {
  console.error('[Service Worker] Unhandled rejection:', event.reason);
}); 
import { messaging, getToken, onMessage, VAPID_KEY, MessagePayload } from './firebase-config';

interface NotificationData {
  type?: string;
  channel_id?: string;
  click_action?: string;
  image?: string;
  message_id?: string;
  from_user?: string;
  content?: string;
  [key: string]: any;
}

class FirebaseNotificationService {
  private initialized = false;
  private token: string | null = null;
  private onMessageCallback: ((payload: MessagePayload) => void) | null = null;

  constructor() {
    this.initializeService();
  }

  private async initializeService() {
    try {
      // Đăng ký service worker
      await this.registerServiceWorker();
      
      // Yêu cầu permission
      const permission = await this.requestNotificationPermission();
      
      if (permission === 'granted') {
        // Lấy FCM token
        await this.getFCMToken();
        
        // Setup message listener
        this.setupMessageListener();
        
        this.initialized = true;
        console.log('Firebase Notification Service initialized successfully');
      } else {
        console.warn('Notification permission denied');
      }
    } catch (error) {
      console.error('Failed to initialize Firebase Notification Service:', error);
    }
  }

  private async registerServiceWorker(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        // Try multiple possible paths for the service worker
        let registration;
        const possiblePaths = [
          '/firebase-messaging-sw.js',
          '/assets/firebase-messaging-sw.js',
          '/assets/raven/firebase-messaging-sw.js',
          '/api/method/raven.api.firebase_notification.get_firebase_service_worker'
        ];
        
        for (const path of possiblePaths) {
          try {
            registration = await navigator.serviceWorker.register(path, {
              scope: '/'
            });
            console.log(`Service Worker registered successfully with path: ${path}`, registration);
            break;
          } catch (pathError) {
            console.warn(`Failed to register service worker with path ${path}:`, pathError);
            if (path === possiblePaths[possiblePaths.length - 1]) {
              throw pathError; // Throw error only if all paths failed
            }
          }
        }
        
        if (!registration) {
          throw new Error('All service worker registration paths failed');
        }
        
        console.log('Service Worker registered:', registration);
        
        // Listen for messages from service worker
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data?.type === 'NOTIFICATION_CLICKED') {
            this.handleNotificationClick(event.data.data);
          }
        });
        
      } catch (error) {
        console.error('Service Worker registration failed:', error);
        throw error;
      }
    } else {
      throw new Error('Service Workers not supported');
    }
  }

  private async requestNotificationPermission(): Promise<NotificationPermission> {
    try {
      if (!('Notification' in window)) {
        throw new Error('This browser does not support notifications');
      }

      let permission = Notification.permission;
      
      if (permission === 'default') {
        permission = await Notification.requestPermission();
      }
      
      return permission;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return 'denied';
    }
  }

  private async getFCMToken(): Promise<void> {
    try {
      if (!messaging) {
        throw new Error('Firebase messaging not available');
      }

      const token = await getToken(messaging, {
        vapidKey: VAPID_KEY
      });

      if (token) {
        this.token = token;
        console.log('FCM Token obtained:', token);
        
        // Đăng ký token với server
        await this.registerTokenWithServer(token);
      } else {
        console.warn('No registration token available');
      }
    } catch (error) {
      console.error('Error getting FCM token:', error);
      throw error;
    }
  }

  private async registerTokenWithServer(token: string): Promise<void> {
    try {
      const response = await fetch('/api/method/raven.api.firebase_notification.register_firebase_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Frappe-CSRF-Token': (window as any).frappe?.csrf_token || ''
        },
        body: JSON.stringify({
          firebase_token: token,
          environment: 'Web',
          device_information: navigator.userAgent
        })
      });

      const result = await response.json();
      
      if (result.message?.success) {
        console.log('Firebase token registered with server');
      } else {
        console.error('Failed to register token with server:', result);
      }
    } catch (error) {
      console.error('Error registering token with server:', error);
    }
  }

  private setupMessageListener(): void {
    if (!messaging) return;

    onMessage(messaging, (payload: MessagePayload) => {
      console.log('Foreground message received:', payload);
      
      // Xử lý notification khi app đang active
      this.handleForegroundMessage(payload);
      
      // Callback nếu có
      if (this.onMessageCallback) {
        this.onMessageCallback(payload);
      }
    });
  }

  private handleForegroundMessage(payload: MessagePayload): void {
    try {
      const { notification, data } = payload;
      
      if (notification && data) {
        // Kiểm tra xem có phải đang ở channel hiện tại không
        const currentChannel = data.channel_id && window.location.pathname.includes(data.channel_id);
        
        // Nếu không ở channel hiện tại hoặc tab không active thì hiện notification
        if (!currentChannel || document.hidden) {
          this.showBrowserNotification(notification.title!, notification.body!, data as NotificationData);
        }
        
        // Phát âm thanh thông báo
        this.playNotificationSound();
        
        // Hiển thị toast notification trong app
        this.showInAppNotification(notification.title!, notification.body!, data as NotificationData);
      }
    } catch (error) {
      console.error('Error handling foreground message:', error);
    }
  }

  private showBrowserNotification(title: string, body: string, data: NotificationData): void {
    try {
      if (Notification.permission === 'granted') {
        const notification = new Notification(title, {
          body,
          icon: '/assets/raven/raven-logo.png',
          badge: '/assets/raven/raven-logo.png',
          tag: data.channel_id || 'raven-notification',
          data: data,
          requireInteraction: false
        });

        notification.onclick = () => {
          window.focus();
          this.handleNotificationClick(data);
          notification.close();
        };

        // Auto close after 5 seconds
        setTimeout(() => {
          notification.close();
        }, 5000);
      }
    } catch (error) {
      console.error('Error showing browser notification:', error);
    }
  }

  private showInAppNotification(title: string, body: string, data: NotificationData): void {
    try {
      // Dispatch custom event để các component khác có thể lắng nghe
      const event = new CustomEvent('ravenNotification', {
        detail: { title, body, data }
      });
      window.dispatchEvent(event);
      
      // Có thể hiển thị toast hoặc banner trong app ở đây
      console.log('In-app notification:', { title, body, data });
    } catch (error) {
      console.error('Error showing in-app notification:', error);
    }
  }

  private handleNotificationClick(data: NotificationData): void {
    try {
      if (data.click_action) {
        window.location.href = data.click_action;
      } else if (data.channel_id) {
        window.location.href = `/raven/channels/${data.channel_id}/`;
      } else {
        window.location.href = '/raven';
      }
    } catch (error) {
      console.error('Error handling notification click:', error);
    }
  }

  private playNotificationSound(): void {
    try {
      const audio = new Audio('/assets/raven/sounds/raven_notification.mp3');
      audio.volume = 0.3;
      audio.play().catch(() => {
        // Ignore autoplay errors
        console.log('Could not play notification sound');
      });
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  }

  // Public methods
  public isInitialized(): boolean {
    return this.initialized;
  }

  public getToken(): string | null {
    return this.token;
  }

  public onMessage(callback: (payload: MessagePayload) => void): void {
    this.onMessageCallback = callback;
  }

  public async refreshToken(): Promise<void> {
    try {
      await this.getFCMToken();
    } catch (error) {
      console.error('Error refreshing token:', error);
    }
  }

  public async unregisterToken(): Promise<void> {
    try {
      if (this.token) {
        const response = await fetch('/api/method/raven.api.firebase_notification.unregister_firebase_token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Frappe-CSRF-Token': (window as any).frappe?.csrf_token || ''
          },
          body: JSON.stringify({
            firebase_token: this.token
          })
        });

        const result = await response.json();
        
        if (result.message?.success) {
          console.log('Firebase token unregistered');
          this.token = null;
        }
      }
    } catch (error) {
      console.error('Error unregistering token:', error);
    }
  }

  public async sendTestNotification(): Promise<void> {
    try {
      const response = await fetch('/api/method/raven.api.firebase_notification.send_test_notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Frappe-CSRF-Token': (window as any).frappe?.csrf_token || ''
        }
      });

      const result = await response.json();
      console.log('Test notification result:', result);
    } catch (error) {
      console.error('Error sending test notification:', error);
    }
  }
}

// Singleton instance
export const firebaseNotificationService = new FirebaseNotificationService();

// Helper functions
export const registerFirebaseNotifications = () => firebaseNotificationService;
export const getFirebaseToken = () => firebaseNotificationService.getToken();
export const sendTestNotification = () => firebaseNotificationService.sendTestNotification();

// Expose Firebase để có thể test trong browser console
if (typeof window !== 'undefined') {
  (window as any).firebaseMessaging = messaging;
  (window as any).firebaseNotificationService = firebaseNotificationService;
  (window as any).getFirebaseToken = getFirebaseToken;
  
  // Expose Firebase v9+ objects for testing
  (window as any).firebaseV9 = {
    messaging,
    getToken,
    onMessage,
    service: firebaseNotificationService
  };
  
  console.log('🔥 Firebase messaging exposed to window for debugging');
  
  // Load Firebase debug console utility (async)
  fetch('/assets/raven/firebase-debug-console.js')
    .then(response => response.text())
    .then(script => {
      const scriptElement = document.createElement('script');
      scriptElement.textContent = script;
      document.head.appendChild(scriptElement);
      console.log('🔧 Firebase Debug Console loaded - gõ firebaseDebug.help() để xem hướng dẫn');
    })
    .catch((error) => {
      console.warn('⚠️ Firebase Debug Console không load được:', error);
    });
} 
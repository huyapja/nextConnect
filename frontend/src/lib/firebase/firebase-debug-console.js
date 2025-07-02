/**
 * Firebase Debug Console Utility
 * Sử dụng: Mở F12 Console và gọi các function này để debug Firebase
 * 
 * Commands:
 * - firebaseDebug.checkAll() - Kiểm tra toàn bộ
 * - firebaseDebug.checkConfig() - Kiểm tra config
 * - firebaseDebug.checkToken() - Kiểm tra token
 * - firebaseDebug.checkPermission() - Kiểm tra permission
 * - firebaseDebug.testNotification() - Test gửi notification
 */

window.firebaseDebug = {
  
  /**
   * Kiểm tra toàn bộ Firebase setup
   */
  async checkAll() {
    console.log('🔥 === FIREBASE DEBUG - KIỂM TRA TOÀN BỘ ===');
    
    try {
      // 1. Kiểm tra cấu hình
      await this.checkConfig();
      console.log('');
      
      // 2. Kiểm tra permission
      await this.checkPermission();
      console.log('');
      
      // 3. Kiểm tra token
      await this.checkToken();
      console.log('');
      
      // 4. Kiểm tra database
      await this.checkDatabase();
      console.log('');
      
      // 5. Test notification
      await this.testNotification();
      
      console.log('✅ FIREBASE DEBUG HOÀN THÀNH');
      
    } catch (error) {
      console.error('❌ Lỗi trong quá trình debug:', error);
    }
  },

  /**
   * Kiểm tra Firebase configuration
   */
  async checkConfig() {
    console.log('🔧 === KIỂM TRA FIREBASE CONFIG ===');
    
    try {
      // Kiểm tra Firebase service
      const service = window.firebaseNotificationService;
      console.log('Firebase Service:', service ? '✅ Available' : '❌ Not found');
      
      if (service) {
        console.log('Service initialized:', service.isInitialized() ? '✅ Yes' : '❌ No');
      }
      
      // Kiểm tra Firebase messaging object
      const messaging = window.firebaseMessaging;
      console.log('Firebase Messaging:', messaging ? '✅ Available' : '❌ Not found');
      
      // Kiểm tra Firebase v9 objects
      const firebaseV9 = window.firebaseV9;
      console.log('Firebase V9 Objects:', firebaseV9 ? '✅ Available' : '❌ Not found');
      
      if (firebaseV9) {
        console.log('- Messaging:', firebaseV9.messaging ? '✅' : '❌');
        console.log('- getToken:', firebaseV9.getToken ? '✅' : '❌');
        console.log('- onMessage:', firebaseV9.onMessage ? '✅' : '❌');
      }
      
      // Lấy config từ server
      const response = await fetch('/api/method/raven.api.firebase_notification.get_firebase_config');
      const configData = await response.json();
      
      if (configData.message) {
        const { firebaseConfig, vapidKey } = configData.message;
        console.log('📋 Firebase Config từ server:');
        console.log('- API Key:', firebaseConfig.apiKey ? '✅ Có' : '❌ Thiếu');
        console.log('- Project ID:', firebaseConfig.projectId ? '✅' + firebaseConfig.projectId : '❌ Thiếu');
        console.log('- Messaging Sender ID:', firebaseConfig.messagingSenderId ? '✅' + firebaseConfig.messagingSenderId : '❌ Thiếu');
        console.log('- App ID:', firebaseConfig.appId ? '✅ Có' : '❌ Thiếu');
        console.log('- VAPID Key:', vapidKey ? '✅ Có' : '❌ Thiếu');
        
        if (vapidKey) {
          console.log('VAPID Key preview:', vapidKey.substring(0, 20) + '...');
        }
      } else {
        console.error('❌ Không thể lấy Firebase config từ server');
      }
      
    } catch (error) {
      console.error('❌ Lỗi kiểm tra config:', error);
    }
  },

  /**
   * Kiểm tra notification permission
   */
  async checkPermission() {
    console.log('🔔 === KIỂM TRA NOTIFICATION PERMISSION ===');
    
    try {
      // Kiểm tra browser support
      console.log('Browser support Notification:', 'Notification' in window ? '✅ Yes' : '❌ No');
      console.log('Browser support ServiceWorker:', 'serviceWorker' in navigator ? '✅ Yes' : '❌ No');
      
      // Kiểm tra permission hiện tại
      const permission = Notification.permission;
      console.log('Current permission:', permission);
      
      if (permission === 'granted') {
        console.log('✅ Permission đã được cấp');
      } else if (permission === 'denied') {
        console.log('❌ Permission bị từ chối');
      } else {
        console.log('⚠️ Permission chưa được hỏi');
        
        // Thử request permission
        const newPermission = await Notification.requestPermission();
        console.log('Permission sau khi request:', newPermission);
      }
      
      // Kiểm tra service worker
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        console.log('Service Worker registrations:', registrations.length);
        
        registrations.forEach((reg, index) => {
          console.log(`SW ${index + 1}:`, reg.scope);
          console.log('- Active:', reg.active ? '✅' : '❌');
          console.log('- Installing:', reg.installing ? '⚠️' : '❌');
          console.log('- Waiting:', reg.waiting ? '⚠️' : '❌');
        });
      }
      
    } catch (error) {
      console.error('❌ Lỗi kiểm tra permission:', error);
    }
  },

  /**
   * Kiểm tra Firebase token
   */
  async checkToken() {
    console.log('🎫 === KIỂM TRA FIREBASE TOKEN ===');
    
    try {
      const service = window.firebaseNotificationService;
      
      if (!service) {
        console.error('❌ Firebase service không available');
        return;
      }
      
      // Lấy token từ service
      const currentToken = service.getToken();
      console.log('Current token từ service:', currentToken ? '✅ Có' : '❌ Không có');
      
      if (currentToken) {
        console.log('Token preview:', currentToken.substring(0, 20) + '...' + currentToken.substring(-10));
        console.log('Token length:', currentToken.length);
      }
      
      // Thử refresh token
      console.log('🔄 Đang thử refresh token...');
      await service.refreshToken();
      
      const newToken = service.getToken();
      console.log('Token sau refresh:', newToken ? '✅ Có' : '❌ Không có');
      
      if (newToken && newToken !== currentToken) {
        console.log('✅ Token đã được refresh');
        console.log('New token preview:', newToken.substring(0, 20) + '...' + newToken.substring(-10));
      } else if (newToken === currentToken) {
        console.log('ℹ️ Token không thay đổi (vẫn hợp lệ)');
      }
      
    } catch (error) {
      console.error('❌ Lỗi kiểm tra token:', error);
    }
  },

  /**
   * Kiểm tra database có lưu token không
   */
  async checkDatabase() {
    console.log('💾 === KIỂM TRA DATABASE TOKENS ===');
    
    try {
      const response = await fetch('/api/method/raven.api.firebase_notification.get_user_firebase_tokens');
      const result = await response.json();
      
      if (result.message && result.message.success) {
        const tokens = result.message.tokens;
        console.log('Số lượng tokens trong database:', tokens.length);
        
        tokens.forEach((token, index) => {
          console.log(`Token ${index + 1}:`);
          console.log('- Environment:', token.environment);
          console.log('- Device info:', token.device_information || 'N/A');
          console.log('- Token preview:', token.firebase_token.substring(0, 20) + '...');
        });
        
        if (tokens.length === 0) {
          console.log('⚠️ Không có token nào trong database');
        }
      } else {
        console.error('❌ Không thể lấy tokens từ database:', result);
      }
      
    } catch (error) {
      console.error('❌ Lỗi kiểm tra database:', error);
    }
  },

  /**
   * Test gửi notification
   */
  async testNotification() {
    console.log('📨 === TEST GỬI NOTIFICATION ===');
    
    try {
      const response = await fetch('/api/method/raven.api.firebase_notification.send_test_notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Frappe-CSRF-Token': window.frappe?.csrf_token || ''
        }
      });
      
      const result = await response.json();
      
      if (result.message && result.message.success) {
        console.log('✅ Test notification đã được gửi thành công');
        console.log('Kiểm tra thiết bị của bạn xem có nhận được notification không');
      } else {
        console.error('❌ Không thể gửi test notification:', result.message?.message || result);
      }
      
    } catch (error) {
      console.error('❌ Lỗi gửi test notification:', error);
    }
  },

  /**
   * Show help
   */
  help() {
    console.log(`
🔥 === FIREBASE DEBUG CONSOLE HELP ===

Các lệnh available:

1. firebaseDebug.checkAll()
   - Kiểm tra toàn bộ Firebase setup

2. firebaseDebug.checkConfig()
   - Kiểm tra Firebase configuration

3. firebaseDebug.checkPermission()
   - Kiểm tra notification permission

4. firebaseDebug.checkToken()
   - Kiểm tra Firebase token

5. firebaseDebug.checkDatabase()
   - Kiểm tra tokens trong database

6. firebaseDebug.testNotification()
   - Test gửi notification

7. firebaseDebug.help()
   - Hiển thị help này

=== CÁCH SỬ DỤNG ===
1. Mở Developer Tools (F12)
2. Chuyển sang tab Console
3. Gõ: firebaseDebug.checkAll()
4. Kiểm tra kết quả

Happy debugging! 🚀
    `);
  }
};

// Auto-run help when loaded
console.log('🔥 Firebase Debug Console loaded!');
console.log('Gõ firebaseDebug.help() để xem hướng dẫn');
console.log('Hoặc firebaseDebug.checkAll() để kiểm tra toàn bộ'); 
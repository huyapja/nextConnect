import frappe
from frappe import _
from ..firebase_env import get_firebase_config, get_firebase_vapid_key
from typing import Optional


@frappe.whitelist(allow_guest=True, methods=["POST"])
def register_firebase_token(firebase_token: str, environment: str = "Web", device_information: Optional[str] = None):
	"""
	Đăng ký Firebase token cho user hiện tại
	
	Args:
		firebase_token: FCM registration token
		environment: Web hoặc Mobile
		device_information: Thông tin thiết bị (optional)
		
	Returns:
		dict: Kết quả đăng ký
	"""
	try:
		user = frappe.session.user
		
		if not firebase_token:
			frappe.throw(_("Firebase token is required"))
		
		# Kiểm tra token đã tồn tại chưa
		existing = frappe.get_all(
			"Firebase Notification Token",
			filters={
				"user": user,
				"firebase_token": firebase_token,
				"is_active": 1
			}
		)
		
		if existing:
			return {
				"success": True,
				"message": "Token already registered",
				"token_id": existing[0].name
			}
		
		# Tạo token mới
		doc = frappe.get_doc({
			"doctype": "Firebase Notification Token",
			"user": user,
			"firebase_token": firebase_token,
			"environment": environment,
			"device_information": device_information,
			"is_active": 1
		})
		
		doc.insert(ignore_permissions=True)
		
		return {
			"success": True,
			"message": "Firebase token registered successfully",
			"token_id": doc.name
		}
		
	except Exception as e:
		frappe.logger().error(f"Error registering Firebase token: {str(e)}")
		return {
			"success": False,
			"message": str(e)
		}


@frappe.whitelist(allow_guest=True, methods=["POST"])
def unregister_firebase_token(firebase_token: str):
	"""
	Hủy đăng ký Firebase token
	
	Args:
		firebase_token: FCM registration token cần hủy
		
	Returns:
		dict: Kết quả hủy đăng ký
	"""
	try:
		user = frappe.session.user
		
		if not firebase_token:
			frappe.throw(_("Firebase token is required"))
		
		# Tìm và deactivate token
		from raven.raven.doctype.firebase_notification_token.firebase_notification_token import FirebaseNotificationToken
		FirebaseNotificationToken.deactivate_token(firebase_token, user)
		
		return {
			"success": True,
			"message": "Firebase token unregistered successfully"
		}
		
	except Exception as e:
		frappe.logger().error(f"Error unregistering Firebase token: {str(e)}")
		return {
			"success": False,
			"message": str(e)
		}


@frappe.whitelist()
def get_user_firebase_tokens():
	"""
	Lấy danh sách Firebase tokens của user hiện tại
	
	Returns:
		list: Danh sách tokens
	"""
	try:
		user = frappe.session.user
		
		from raven.raven.doctype.firebase_notification_token.firebase_notification_token import FirebaseNotificationToken
		tokens = FirebaseNotificationToken.get_active_tokens_for_user(user)
		
		return {
			"success": True,
			"tokens": tokens
		}
		
	except Exception as e:
		frappe.logger().error(f"Error getting Firebase tokens: {str(e)}")
		return {
			"success": False,
			"message": str(e)
		}


@frappe.whitelist(allow_guest=True, methods=["POST"])
def send_test_notification(user_id: str = None):
	"""
	Gửi test notification (chỉ dành cho System Manager)
	
	Args:
		user_id: User ID để gửi test notification (mặc định là user hiện tại)
		
	Returns:
		dict: Kết quả gửi test notification
	"""
	try:
		# Chỉ System Manager mới được gửi test notification
		if "System Manager" not in frappe.get_roles():
			frappe.throw(_("Only System Manager can send test notifications"))
		
		target_user = user_id or frappe.session.user
		
		from raven.firebase_service import send_firebase_notification_to_user
		
		success = send_firebase_notification_to_user(
			user=target_user,
			title="🔔 Test Notification từ Raven",
			body="Đây là test notification từ Firebase service",
			data={
				"type": "test",
				"test_time": frappe.utils.now(),
				"click_action": frappe.utils.get_url() + "/raven"
			}
		)
		
		return {
			"success": success,
			"message": "Test notification sent successfully" if success else "Failed to send test notification"
		}
		
	except Exception as e:
		frappe.logger().error(f"Error sending test notification: {str(e)}")
		return {
			"success": False,
			"message": str(e)
		}


@frappe.whitelist()
def get_firebase_config_from_env():
	"""
	Lấy Firebase config cho frontend từ environment variables
	
	Returns:
		dict: Firebase configuration từ .firebase.env
	"""
	try:
		# Load configuration từ .firebase.env file
		from ..firebase_env import get_firebase_config as load_config, get_firebase_vapid_key
		config = load_config()
		vapid_key = get_firebase_vapid_key()
		
		# Validate configuration
		if not config.get("projectId") or not vapid_key:
			frappe.logger().error("Firebase configuration incomplete. Check .firebase.env file")
			return {
				"success": False,
				"error": "Firebase configuration not found. Please configure .firebase.env file"
			}
		
		return {
			"success": True,
			"firebaseConfig": config,
			"vapidKey": vapid_key
		}
		
	except Exception as e:
		frappe.logger().error(f"Error getting Firebase config: {str(e)}")
		return {
			"success": False,
			"error": str(e)
		}

@frappe.whitelist()
def get_firebase_config():
	"""
	Lấy Firebase config cho frontend (legacy function với env support)
	
	Returns:
		dict: Firebase configuration với proper structure
	"""
	try:
		# Load từ environment variables  
		from ..firebase_env import get_firebase_config as load_config, get_firebase_vapid_key
		config = load_config()
		vapid_key = get_firebase_vapid_key()
		
		if config.get("projectId") and vapid_key:
			frappe.logger().info("✅ Using Firebase config from .firebase.env")
			return {
				"firebaseConfig": config,
				"vapidKey": vapid_key
			}
		else:
			# Fallback to hardcoded (để backwards compatibility)
			frappe.logger().warning("⚠️ Using hardcoded Firebase config. Please configure .firebase.env")
			return {
				"firebaseConfig": {
					"apiKey": "AIzaSyBjvUyp3VClva2ZEJYlumonaYnwE9_WYC8",
					"authDomain": "erpnextvn-d0ec7.firebaseapp.com",
					"projectId": "erpnextvn-d0ec7",
					"storageBucket": "erpnextvn-d0ec7.firebasestorage.app",
					"messagingSenderId": "771489672323",
					"appId": "1:771489672323:web:04698dae5fd6db76af7fb6",
					"measurementId": "G-13L796L4FB"
				},
				"vapidKey": "BDSp283ejn319EfnQTWDrD-4Vq587ulgFEMrl9hgA6tfyuci3PfNIsGu3wmwbHAJPgh0zLW59LG4PGyidiJoCUQ"
			}
			
	except Exception as e:
		frappe.logger().error(f"❌ Error getting Firebase config: {str(e)}")
		# Return hardcoded as fallback
		return {
			"firebaseConfig": {
				"apiKey": "AIzaSyBjvUyp3VClva2ZEJYlumonaYnwE9_WYC8",
				"authDomain": "erpnextvn-d0ec7.firebaseapp.com",
				"projectId": "erpnextvn-d0ec7",
				"storageBucket": "erpnextvn-d0ec7.firebasestorage.app",
				"messagingSenderId": "771489672323",
				"appId": "1:771489672323:web:04698dae5fd6db76af7fb6",
				"measurementId": "G-13L796L4FB"
			},
			"vapidKey": "BDSp283ejn319EfnQTWDrD-4Vq587ulgFEMrl9hgA6tfyuci3PfNIsGu3wmwbHAJPgh0zLW59LG4PGyidiJoCUQ"
		}


@frappe.whitelist(allow_guest=True, methods=["GET"])
def get_firebase_service_worker():
	"""
	Serve Firebase service worker file
	
	Returns:
		Response: Service worker JavaScript file
	"""
	return serve_firebase_service_worker()


def serve_firebase_service_worker():
	"""
	Serve Firebase service worker file with proper headers
	"""
	try:
		import os
		from frappe.utils import get_site_path
		
		# Try multiple possible locations for the service worker
		possible_paths = [
			os.path.join(get_site_path(), "public", "firebase-messaging-sw.js"),
			os.path.join(frappe.get_app_path("raven"), "public", "firebase-messaging-sw.js"),
			os.path.join(frappe.get_app_path("raven"), "raven", "public", "firebase-messaging-sw.js"),
			os.path.join(frappe.get_app_path("raven"), "frontend", "public", "firebase-messaging-sw.js")
		]
		
		service_worker_content = None
		for path in possible_paths:
			if os.path.exists(path):
				with open(path, 'r', encoding='utf-8') as f:
					service_worker_content = f.read()
				frappe.logger().info(f"✅ Firebase service worker loaded from: {path}")
				break
		
		if not service_worker_content:
			# Fallback: Generate basic service worker
			frappe.logger().warning("⚠️ Service worker file not found, generating fallback version")
			service_worker_content = get_fallback_service_worker()
		
		# Set appropriate headers for service worker
		if not hasattr(frappe.local, 'response'):
			frappe.local.response = frappe._dict()
		if not frappe.local.response.get('headers'):
			frappe.local.response.headers = frappe._dict()
			
		frappe.local.response.headers.update({
			"Content-Type": "application/javascript; charset=utf-8",
			"Service-Worker-Allowed": "/",
			"Cache-Control": "no-cache, no-store, must-revalidate",
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "GET",
			"Access-Control-Allow-Headers": "Content-Type"
		})
		
		return service_worker_content
		
	except Exception as e:
		frappe.logger().error(f"❌ Error serving service worker: {str(e)}")
		return get_fallback_service_worker()


def get_fallback_service_worker():
	"""
	Generate fallback service worker content
	"""
	return """// Firebase Messaging Service Worker - Fallback Version
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
    requireInteraction: true
  };

  // Show notification
  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', function(event) {
  console.log('[firebase-messaging-sw.js] Notification click received:', event);

  event.notification.close();

  const clickAction = event.notification.data?.click_action || '/raven';

  // Open or focus window
  event.waitUntil(
    clients.matchAll({
      type: 'window'
    }).then(function(clientList) {
      // Check if there's already a window open
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url.includes('/raven') && 'focus' in client) {
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

console.log('Firebase messaging service worker loaded successfully');""" 
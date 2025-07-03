import frappe
from frappe import _


@frappe.whitelist()
def test_firebase_worker():
	"""
	API để test Firebase worker từ web interface
	"""
	try:
		from raven.firebase_hooks import test_firebase_worker as test_worker_function
		result = test_worker_function()
		
		return {
			"success": True,
			"message": "Firebase worker test job enqueued successfully!",
			"data": result
		}
		
	except Exception as e:
		frappe.logger().error(f"Error testing Firebase worker via API: {str(e)}")
		return {
			"success": False,
			"message": f"Error testing Firebase worker: {str(e)}"
		}


@frappe.whitelist() 
def get_firebase_worker_status():
	"""
	Kiểm tra trạng thái Firebase worker
	"""
	try:
		# Kiểm tra Redis connection
		redis_status = _check_redis_connection()
		
		# Kiểm tra Firebase config
		firebase_status = _check_firebase_config()
		
		# Kiểm tra queue status
		queue_status = _check_queue_status()
		
		# Kiểm tra service worker file
		sw_status = _check_service_worker_file()
		
		return {
			"success": True,
			"status": {
				"redis": redis_status,
				"firebase": firebase_status,
				"queue": queue_status,
				"service_worker": sw_status
			}
		}
		
	except Exception as e:
		frappe.logger().error(f"Error checking Firebase worker status: {str(e)}")
		return {
			"success": False,
			"message": str(e)
		}


@frappe.whitelist()
def create_firebase_service_worker():
	"""
	Tạo lại Firebase service worker file
	"""
	try:
		from raven.install import create_firebase_service_worker_file
		create_firebase_service_worker_file()
		
		return {
			"success": True,
			"message": "Firebase service worker file created successfully"
		}
		
	except Exception as e:
		frappe.logger().error(f"Error creating Firebase service worker: {str(e)}")
		return {
			"success": False,
			"message": str(e)
		}


def _check_redis_connection():
	"""Kiểm tra Redis connection"""
	try:
		import redis
		import frappe
		
		# Thử multiple ways để get Redis connection
		try:
			from frappe.utils.redis_wrapper import RedisWrapper
			redis_conn = RedisWrapper.from_url(frappe.conf.redis_queue)
		except:
			try:
				from frappe.utils import get_redis_conn
				redis_conn = get_redis_conn()
			except:
				redis_conn = frappe.cache()
		
		# Test connection
		redis_conn.ping()
		
		return {
			"status": "connected",
			"message": "Redis connection OK"
		}
	except Exception as e:
		return {
			"status": "error", 
			"message": f"Redis connection failed: {str(e)}"
		}


def _check_firebase_config():
	"""Kiểm tra Firebase configuration"""
	try:
		from raven.firebase_env import get_firebase_service_account
		firebase_config = get_firebase_service_account()
		
		if firebase_config.get("project_id"):
			return {
				"status": "configured",
				"message": f"Firebase configured for project: {firebase_config.get('project_id')}"
			}
		else:
			return {
				"status": "not_configured",
				"message": "Firebase not configured"
			}
			
	except Exception as e:
		return {
			"status": "error",
			"message": f"Error checking Firebase config: {str(e)}"
		}


def _check_queue_status():
	"""Kiểm tra queue status"""
	try:
		# Thử check queue qua frappe.enqueue
		try:
			test_job_id = f"test_job_{frappe.utils.now()}"
			job = frappe.enqueue(
				"frappe.ping", 
				queue='default',
				job_id=test_job_id,
				now=False  # Không chạy ngay lập tức
			)
			
			# Hủy job test này luôn
			if hasattr(job, 'cancel'):
				job.cancel()
			
			return {
				"status": "available",
				"message": "Queue system working (test job created and cancelled)",
				"test_job_id": test_job_id
			}
			
		except Exception as queue_error:
			# Fallback: Thử check RQ queue trực tiếp
			try:
				from rq import Queue
				import frappe
				
				# Get Redis connection từ Frappe
				redis_conn = frappe.cache()
				default_queue = Queue('default', connection=redis_conn)
				
				return {
					"status": "available",
					"message": f"Default queue has {len(default_queue)} jobs",
					"queue_length": len(default_queue)
				}
			except Exception as rq_error:
				return {
					"status": "warning",
					"message": f"Queue check uncertain. frappe.enqueue error: {str(queue_error)}, RQ error: {str(rq_error)}"
				}
		
	except Exception as e:
		return {
			"status": "error",
			"message": f"Error checking queue status: {str(e)}"
		}


def _check_service_worker_file():
	"""Kiểm tra Firebase service worker file"""
	try:
		import os
		from frappe.utils import get_site_path
		
		# Check if service worker file exists
		site_root = get_site_path()
		sw_file_path = os.path.join(site_root, "public", "firebase-messaging-sw.js")
		
		if os.path.exists(sw_file_path):
			# Check file size and content
			file_size = os.path.getsize(sw_file_path)
			with open(sw_file_path, 'r', encoding='utf-8') as f:
				content = f.read()
			
			# Basic validation
			has_firebase = "firebase" in content.lower()
			has_messaging = "messaging" in content.lower()
			
			if has_firebase and has_messaging and file_size > 100:
				return {
					"status": "exists",
					"message": f"Service worker file exists ({file_size} bytes)",
					"path": sw_file_path,
					"file_size": file_size
				}
			else:
				return {
					"status": "invalid",
					"message": f"Service worker file exists but seems invalid ({file_size} bytes)",
					"path": sw_file_path,
					"file_size": file_size
				}
		else:
			return {
				"status": "missing",
				"message": "Service worker file not found",
				"expected_path": sw_file_path
			}
			
	except Exception as e:
		return {
			"status": "error",
			"message": f"Error checking service worker: {str(e)}"
		}


@frappe.whitelist()
def send_test_firebase_notification():
	"""
	Gửi test Firebase notification trực tiếp (không qua worker)
	"""
	try:
		from raven.firebase_service import send_firebase_notification_to_user
		
		current_user = frappe.session.user
		if current_user == "Guest":
			return {
				"success": False,
				"message": "Please login to test Firebase notification"
			}
		
		result = send_firebase_notification_to_user(
			user=current_user,
			title="🧪 Test Firebase Direct",
			body="Đây là test notification trực tiếp (không qua worker)",
			data={"test": "direct", "timestamp": str(frappe.utils.now())}
		)
		
		return {
			"success": True,
			"message": f"Direct Firebase notification sent. Result: {result}",
			"result": result
		}
		
	except Exception as e:
		frappe.logger().error(f"Error sending test Firebase notification: {str(e)}")
		return {
			"success": False,
			"message": f"Error: {str(e)}"
		}


@frappe.whitelist()
def enqueue_test_firebase_notification():
	"""
	Enqueue test Firebase notification qua worker
	"""
	try:
		# Tạo một RavenMessage test để trigger worker
		test_channel = _get_or_create_test_channel()
		
		if not test_channel:
			return {
				"success": False,
				"message": "Could not create test channel"
			}
		
		# Tạo test message
		test_message = frappe.get_doc({
			"doctype": "Raven Message",
			"channel_id": test_channel.name,
			"text": "🧪 Test Firebase Worker Notification",
			"message_type": "Text"
		})
		test_message.insert()
		
		return {
			"success": True,
			"message": f"Test message created: {test_message.name}. Check worker logs for Firebase notification.",
			"message_id": test_message.name
		}
		
	except Exception as e:
		frappe.logger().error(f"Error enqueuing test Firebase notification: {str(e)}")
		return {
			"success": False,
			"message": f"Error: {str(e)}"
		}


def _get_or_create_test_channel():
	"""Lấy hoặc tạo test channel"""
	try:
		current_user = frappe.session.user
		if current_user == "Guest":
			return None
		
		# Tìm hoặc tạo test channel
		test_channel_name = f"test-firebase-{current_user.lower().replace('@', '-').replace('.', '-')}"
		
		try:
			channel = frappe.get_doc("Raven Channel", test_channel_name)
		except frappe.DoesNotExistError:
			channel = frappe.get_doc({
				"doctype": "Raven Channel",
				"name": test_channel_name,
				"channel_name": "🧪 Firebase Test Channel",
				"type": "Private",
				"channel_description": "Test channel for Firebase notifications"
			})
			channel.insert()
		
		return channel
		
	except Exception as e:
		frappe.logger().error(f"Error creating test channel: {str(e)}")
		return None 
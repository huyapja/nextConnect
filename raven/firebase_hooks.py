import frappe
from typing import Optional


@frappe.whitelist()
def handle_raven_message_insert(doc, method=None):
	"""
	Hook function được gọi khi có message mới
	Đẩy job Firebase notification vào worker queue
	"""
	try:
		# Kiểm tra điều kiện trước khi enqueue
		if should_send_firebase_notification(doc):
			# Đẩy job vào worker queue thay vì gọi trực tiếp
			frappe.enqueue(
				"raven.firebase_hooks.process_firebase_notification_worker",
				queue='default',
				timeout=300,
				now=False,
				message_id=doc.name,
				job_name=f"Firebase notification for message {doc.name}"
			)
			frappe.logger().info(f"🔥 Enqueued Firebase notification job for message {doc.name}")
		
	except Exception as e:
		frappe.logger().error(f"Error in Firebase message hook: {str(e)}")


@frappe.whitelist()
def process_firebase_notification_worker(message_id: str):
	"""
	Worker function thực tế xử lý Firebase notification
	Chạy trong background worker
	"""
	try:
		frappe.logger().info(f"🔥 Worker processing Firebase notification for message {message_id}")
		
		# Lấy message document
		message_doc = frappe.get_doc("Raven Message", message_id)
		
		# Import và gửi Firebase notification
		from raven.firebase_notification_integration import send_firebase_notification_for_message
		send_firebase_notification_for_message(message_doc)
		
		frappe.logger().info(f"🔥 Worker completed Firebase notification for message {message_id}")
		
	except Exception as e:
		frappe.logger().error(f"🔥 Worker error processing Firebase notification for message {message_id}: {str(e)}")
		raise  # Re-raise để worker biết job failed


def should_send_firebase_notification(message) -> bool:
	"""
	Kiểm tra xem có nên gửi Firebase notification không
	
	Args:
		message: RavenMessage document
		
	Returns:
		bool: True nếu nên gửi notification
	"""
	try:
		# Không gửi notification trong các trường hợp sau:
		if (
			message.message_type == "System"
			or message.flags.get("send_silently")
			or frappe.flags.in_test
			or frappe.flags.in_install
			or frappe.flags.in_patch
			or frappe.flags.in_import
		):
			return False
		
		# Kiểm tra xem channel có self message không
		try:
			channel_doc = frappe.get_cached_doc("Raven Channel", message.channel_id)
			if channel_doc.is_self_message:
				return False
		except:
			# Nếu không thể lấy channel doc, skip notification
			return False
		
		return True
		
	except Exception as e:
		frappe.logger().error(f"Error checking Firebase notification conditions: {str(e)}")
		return False


@frappe.whitelist()
def test_firebase_worker():
	"""
	Test function để kiểm tra Firebase worker hoạt động
	"""
	try:
		frappe.enqueue(
			"raven.firebase_hooks.test_firebase_notification_job",
			queue='default',
			timeout=60,
			now=False,
			job_name="Test Firebase Worker"
		)
		return {"status": "success", "message": "Test job enqueued successfully"}
	except Exception as e:
		frappe.logger().error(f"Error testing Firebase worker: {str(e)}")
		return {"status": "error", "message": str(e)}


@frappe.whitelist()
def test_firebase_notification_job():
	"""
	Test job để verify worker hoạt động
	"""
	try:
		frappe.logger().info("🔥 Firebase test worker job executed successfully")
		
		# Test gửi notification đơn giản
		from raven.firebase_service import send_firebase_notification_to_user
		
		# Lấy user hiện tại để test
		current_user = frappe.session.user
		if current_user and current_user != "Guest":
			result = send_firebase_notification_to_user(
				user=current_user,
				title="🧪 Test Firebase Worker",
				body="Worker đang hoạt động bình thường!",
				data={"test": "true", "worker": "firebase_hooks"}
			)
			frappe.logger().info(f"🔥 Test notification result: {result}")
		
		return True
		
	except Exception as e:
		frappe.logger().error(f"🔥 Test Firebase worker job failed: {str(e)}")
		raise 
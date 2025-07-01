import frappe
from raven.firebase_notification_integration import send_firebase_notification_for_message


def send_firebase_push_notification(message):
	"""
	Hook function để gửi Firebase push notification cho RavenMessage
	Thay thế hoặc bổ sung cho hệ thống notification cũ
	
	Args:
		message: RavenMessage document
	"""
	try:
		# Kiểm tra xem có nên gửi Firebase notification không
		if should_send_firebase_notification(message):
			# Gửi Firebase notification
			send_firebase_notification_for_message(message)
		
	except Exception as e:
		frappe.logger().error(f"Error in Firebase message integration: {str(e)}")


def should_send_firebase_notification(message):
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
		channel_doc = frappe.get_cached_doc("Raven Channel", message.channel_id)
		if channel_doc.is_self_message:
			return False
		
		return True
		
	except Exception as e:
		frappe.logger().error(f"Error checking Firebase notification conditions: {str(e)}")
		return False


# Monkey patch RavenMessage để add Firebase notification
def patch_raven_message():
	"""
	Patch RavenMessage để thêm Firebase notification support
	"""
	try:
		from raven.raven_messaging.doctype.raven_message.raven_message import RavenMessage
		
		# Backup original send_push_notification method
		if not hasattr(RavenMessage, '_original_send_push_notification'):
			RavenMessage._original_send_push_notification = RavenMessage.send_push_notification
		
		def new_send_push_notification(self):
			"""
			Enhanced send_push_notification method với Firebase support
			"""
			try:
				# Log để debug
				frappe.logger().info(f"🔥 Firebase send_push_notification called for message {self.name} in channel {self.channel_id}")
				
				# Gửi Firebase notification
				send_firebase_push_notification(self)
				
				# Có thể gửi cả original system nếu muốn (comment out để chỉ dùng Firebase)
				# self._original_send_push_notification()
				
			except Exception as e:
				frappe.logger().error(f"Error in enhanced send_push_notification: {str(e)}")
				import traceback
				frappe.logger().error(traceback.format_exc())
		
		# Patch method
		RavenMessage.send_push_notification = new_send_push_notification
		
		frappe.logger().info("RavenMessage patched for Firebase notifications")
		
	except Exception as e:
		frappe.logger().error(f"Error patching RavenMessage: {str(e)}")


# Auto-patch khi module được import
# Chỉ patch khi Frappe đã sẵn sàng
if not (frappe.flags.in_install or frappe.flags.in_patch or frappe.flags.in_import):
	try:
		patch_raven_message()
	except Exception as e:
		# Ignore lỗi khi startup, hook sẽ gọi lại sau
		pass 
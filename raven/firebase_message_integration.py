import frappe

# DEPRECATED: File này đã được thay thế bởi firebase_hooks.py
# Firebase notification hiện được xử lý qua document hooks trong hooks.py
# Xem: raven.firebase_hooks.handle_raven_message_insert

def patch_raven_message():
	"""
	DEPRECATED: RavenMessage patch không còn cần thiết
	Firebase notifications hiện được xử lý qua document hooks
	"""
	frappe.logger().info("⚠️  firebase_message_integration.patch_raven_message() is deprecated")
	frappe.logger().info("🔥 Firebase notifications được xử lý qua hooks.py -> firebase_hooks.py")
	pass  # Không làm gì cả


# Giữ function này để tránh lỗi nếu có code cũ gọi
def send_firebase_push_notification(message):
	"""
	DEPRECATED: Function này đã được thay thế
	"""
	frappe.logger().warning("⚠️  send_firebase_push_notification() is deprecated. Use firebase_hooks.py instead")
	pass


def should_send_firebase_notification(message):
	"""
	DEPRECATED: Function này đã được thay thế
	"""
	frappe.logger().warning("⚠️  should_send_firebase_notification() is deprecated. Use firebase_hooks.py instead")
		return False
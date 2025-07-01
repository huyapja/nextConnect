import frappe
from raven.firebase_notification_integration import send_firebase_notification_for_message


def handle_raven_message_insert(doc, method=None):
	"""
	Hook function được gọi sau khi RavenMessage được insert
	Gửi Firebase notification cho tin nhắn mới
	
	Args:
		doc: RavenMessage document
		method: Method name (after_insert)
	"""
	try:
		frappe.logger().info(f"🔥 Firebase hook called for message {doc.name} in channel {doc.channel_id}")
		
		# Kiểm tra điều kiện gửi notification
		if (
			doc.message_type == "System"
			or doc.flags.get("send_silently")
			or frappe.flags.in_test
			or frappe.flags.in_install
			or frappe.flags.in_patch
			or frappe.flags.in_import
		):
			frappe.logger().info(f"🔥 Skipping notification for message {doc.name} - system/silent message")
			return

		# Kiểm tra channel
		channel_doc = frappe.get_cached_doc("Raven Channel", doc.channel_id)
		if channel_doc.is_self_message:
			frappe.logger().info(f"🔥 Skipping notification for message {doc.name} - self message")
			return

		# Gửi Firebase notification
		frappe.logger().info(f"🔥 Sending Firebase notification for message {doc.name}")
		send_firebase_notification_for_message(doc)
		frappe.logger().info(f"🔥 Firebase notification sent for message {doc.name}")
		
	except Exception as e:
		frappe.logger().error(f"🔥 Error in Firebase hook for message {doc.name}: {str(e)}")
		import traceback
		frappe.logger().error(traceback.format_exc()) 
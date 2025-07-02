__version__ = "2.5.0"

from raven.raven_integrations.doctype.raven_incoming_webhook.raven_incoming_webhook import (  # noqa
	handle_incoming_webhook as webhook,
)

# Auto-patch RavenMessage để sử dụng Firebase notifications
try:
	from raven.firebase_message_integration import patch_raven_message
	patch_raven_message()
except Exception as e:
	import frappe
	if hasattr(frappe, 'logger'):
		frappe.logger().error(f"Error auto-patching RavenMessage in __init__: {str(e)}")
	# Ignore errors during import để không break module loading

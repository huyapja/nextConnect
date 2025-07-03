import frappe
import jwt
import time
from frappe import _

@frappe.whitelist(methods=["GET"])
def get_stringee_token():
	"""
	Tạo token cho Stringee Call 2
	"""
	try:
		# Lấy thông tin người dùng hiện tại
		user = frappe.session.user
		
		# Lấy cấu hình Stringee từ site config
		api_key_sid = frappe.conf.get("stringee_api_key_sid")
		api_key_secret = frappe.conf.get("stringee_api_key_secret")
		
		if not api_key_sid or not api_key_secret:
			frappe.throw(_("Stringee API keys chưa được cấu hình"))
		
		# Tạo JWT token cho Stringee
		payload = {
			"jti": f"{user}_{int(time.time())}",  # JWT ID
			"iss": api_key_sid,  # Issuer (API Key SID)
			"exp": int(time.time()) + 3600,  # Expiration time (1 hour)
			"userId": user,  # User ID
			"rest_api": True,  # Enable REST API
		}
		
		# Tạo JWT token
		token = jwt.encode(payload, api_key_secret, algorithm="HS256")
		
		return {
			"token": token,
			"user_id": user
		}
		
	except Exception as e:
		frappe.log_error(f"Lỗi khi tạo Stringee token: {str(e)}")
		frappe.throw(_("Không thể tạo token cho cuộc gọi"))

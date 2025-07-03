import frappe
import jwt
import time
from frappe import _

@frappe.whitelist(methods=["GET"])
def get_stringee_token():
	"""
	Tạo token Stringee (REST API + Web SDK)
	"""
	try:
		# Lấy người dùng hiện tại
		user = frappe.session.user

		# Lấy API Key từ site_config
		api_key_sid = frappe.conf.get("stringee_api_key_sid")
		api_key_secret = frappe.conf.get("stringee_api_key_secret")
		

		if not api_key_sid or not api_key_secret:
			frappe.throw(_("Stringee API keys chưa được cấu hình"))

		# Payload JWT
		payload = {
			"jti": f"{user}_{int(time.time())}",
			"iss": api_key_sid,
			"exp": int(time.time()) + 3600,
			"userId": user,
			"rest_api": True
		}

		# Encode JWT
		token = jwt.encode(payload, api_key_secret, algorithm="HS256")

		# Một số phiên bản PyJWT trả về bytes
		if isinstance(token, bytes):
			token = token.decode("utf-8")

		# Trả về đúng định dạng cho useFrappeGetCall
		return {
			"message": {
				"token": token,
				"user_id": user
			}
		}

	except Exception as e:
		frappe.log_error(f"[Stringee] Tạo token thất bại: {str(e)}")
		frappe.throw(_("Không thể tạo token Stringee"))

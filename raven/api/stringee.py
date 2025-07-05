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

@frappe.whitelist(methods=["GET"])
def check_user_busy(user_id):
    """Kiểm tra trạng thái bận của user (dùng khi load lần đầu)"""
    is_busy = frappe.cache().get_value(f'stringee_busy:{user_id}')
    return {"busy": bool(is_busy)}

@frappe.whitelist(methods=["POST"])
def mark_user_busy(user_id: str):
    """Đánh dấu user đang trong cuộc gọi"""
    frappe.cache().set_value(f'stringee_busy:{user_id}', 1)
    frappe.publish_realtime(f'stringee_user_busy:{user_id}', {'busy': True})

@frappe.whitelist(methods=["POST"])
def mark_user_idle(user_id: str):
    """Đánh dấu user đã kết thúc cuộc gọi"""
    frappe.cache().set_value(f'stringee_busy:{user_id}', 0)
    frappe.publish_realtime(f'stringee_user_busy:{user_id}', {'busy': False})

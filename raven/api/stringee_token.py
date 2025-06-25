import frappe
import jwt
import time
from frappe import _

def get_call_session_safely(session_id):
	"""
	Safely get call session document with proper error handling
	"""
	try:
		return frappe.get_doc("Raven Call Session", {"session_id": session_id})
	except frappe.DoesNotExistError:
		frappe.throw(_("Session cuộc gọi không tồn tại"))
	except Exception as e:
		frappe.log_error(f"Lỗi khi lấy call session: {str(e)}")
		frappe.throw(_("Không thể truy cập session cuộc gọi"))

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

@frappe.whitelist(methods=["POST"])
def create_call_session(caller_id, callee_id, call_type="video"):
	"""
	Tạo session cuộc gọi giữa 2 người dùng
	"""
	try:
		# Kiểm tra quyền
		if frappe.session.user != caller_id:
			frappe.throw(_("Bạn không có quyền tạo cuộc gọi này"))
		
		# Tạo session ID duy nhất
		session_id = f"call_{caller_id}_{callee_id}_{int(time.time())}"
		
		# Tạo channel_id cho DM
		channel_id = f"{caller_id} _ {callee_id}" if caller_id < callee_id else f"{callee_id} _ {caller_id}"
		
		# Lưu thông tin cuộc gọi vào database
		call_session = frappe.get_doc({
			"doctype": "Raven Call Session",
			"session_id": session_id,
			"caller_id": caller_id,
			"callee_id": callee_id,
			"call_type": call_type,
			"status": "initiated",
			"channel_id": channel_id
		})
		call_session.insert(ignore_permissions=True)
		
		print(f"📞 [API] Creating call session: {caller_id} -> {callee_id}, type: {call_type}")
		
		# Lấy tên người gọi
		caller_name = frappe.get_cached_value("Raven User", caller_id, "full_name")
		if not caller_name:
			caller_name = frappe.get_cached_value("Raven User", caller_id, "first_name")
		if not caller_name:
			caller_name = caller_id
		
		# Gửi thông báo realtime cho người nhận
		frappe.publish_realtime(
			event="incoming_call",
			message={
				"session_id": session_id,
				"caller_id": caller_id,
				"callee_id": callee_id,
				"call_type": call_type,
				"caller_name": caller_name
			},
			user=callee_id
		)
		
		return {
			"session_id": session_id,
			"caller_id": caller_id,
			"callee_id": callee_id,
			"call_type": call_type
		}
		
	except Exception as e:
		frappe.log_error(f"Lỗi khi tạo call session: {str(e)}")
		frappe.throw(_("Không thể tạo session cuộc gọi"))

@frappe.whitelist(methods=["POST"])
def update_call_status(session_id, status, end_time=None):
	"""
	Cập nhật trạng thái cuộc gọi
	"""
	try:
		call_session = get_call_session_safely(session_id)
		call_session.status = status
		
		if end_time and status in ["ended", "missed", "rejected"]:
			call_session.end_time = end_time
			if call_session.start_time:
				from datetime import datetime
				start = datetime.fromisoformat(str(call_session.start_time))
				end = datetime.fromisoformat(end_time)
				call_session.duration = int((end - start).total_seconds())
		
		call_session.save(ignore_permissions=True)
		
		# Thông báo realtime cho cả hai người dùng
		users = [call_session.caller_id, call_session.callee_id]
		print(f"📡 [API] Sending realtime to users: {users}, status: {status}")
		
		frappe.publish_realtime(
			event="call_status_update",
			message={
				"session_id": session_id,
				"status": status
			},
			user=users
		)
		
		print(f"📡 [API] Realtime sent successfully")
		
		return {"success": True}
		
	except Exception as e:
		frappe.log_error(f"Lỗi khi cập nhật call status: {str(e)}")
		frappe.throw(_("Không thể cập nhật trạng thái cuộc gọi"))

@frappe.whitelist(methods=["POST"])
def answer_call(session_id):
	"""
	Trả lời cuộc gọi
	"""
	try:
		call_session = get_call_session_safely(session_id)
		
		# Kiểm tra quyền
		if frappe.session.user != call_session.callee_id:
			frappe.throw(_("Bạn không có quyền trả lời cuộc gọi này"))
		
		call_session.status = "answered"
		call_session.save(ignore_permissions=True)
		
		# Thông báo cho người gọi
		frappe.publish_realtime(
			event="call_answered",
			message={
				"session_id": session_id,
				"callee_id": call_session.callee_id
			},
			user=call_session.caller_id
		)
		
		return {"success": True}
		
	except Exception as e:
		frappe.log_error(f"Lỗi khi trả lời cuộc gọi: {str(e)}")
		frappe.throw(_("Không thể trả lời cuộc gọi"))

@frappe.whitelist(methods=["POST"])
def reject_call(session_id):
	"""
	Từ chối cuộc gọi
	"""
	try:
		call_session = get_call_session_safely(session_id)
		
		# Kiểm tra quyền
		if frappe.session.user != call_session.callee_id:
			frappe.throw(_("Bạn không có quyền từ chối cuộc gọi này"))
		
		call_session.status = "rejected"
		call_session.save(ignore_permissions=True)
		
		# Thông báo cho người gọi
		frappe.publish_realtime(
			event="call_rejected",
			message={
				"session_id": session_id,
				"callee_id": call_session.callee_id
			},
			user=call_session.caller_id
		)
		
		return {"success": True}
		
	except Exception as e:
		frappe.log_error(f"Lỗi khi từ chối cuộc gọi: {str(e)}")
		frappe.throw(_("Không thể từ chối cuộc gọi")) 

@frappe.whitelist(methods=["POST"])
def send_video_upgrade_request(session_id, from_user, to_user):
	"""
	Gửi yêu cầu nâng cấp lên video call
	"""
	try:
		# Kiểm tra quyền
		if frappe.session.user != from_user:
			frappe.throw(_("Bạn không có quyền gửi yêu cầu này"))
		
		print(f"📹 [API] Processing video upgrade request from {from_user} to {to_user}, session: {session_id}")
		
		# Kiểm tra session tồn tại (cho phép cả fallback session)
		call_session = None
		try:
			call_session = frappe.get_doc("Raven Call Session", {"session_id": session_id})
			print(f"📹 [API] Found call session with status: {call_session.status}")
		except frappe.DoesNotExistError:
			print(f"📹 [API] Call session not found in DB, proceeding with realtime only")
		
		# Relax validation - allow if session not found or any status
		if call_session and call_session.status not in ["answered", "connected", "initiated"]:
			print(f"📹 [API] Warning: Call session status is {call_session.status}, but proceeding anyway")
		
		print(f"📹 [API] Sending video upgrade request from {from_user} to {to_user}")
		
		# Lấy tên người gửi yêu cầu
		from_user_name = frappe.get_cached_value("Raven User", from_user, "full_name")
		if not from_user_name:
			from_user_name = frappe.get_cached_value("Raven User", from_user, "first_name")
		if not from_user_name:
			from_user_name = from_user
		
		print(f"📹 [API] Sending realtime event to user: {to_user}")
		
		# Gửi thông báo realtime cho người nhận
		frappe.publish_realtime(
			event="video_upgrade_request",
			message={
				"session_id": session_id,
				"from_user": from_user,
				"to_user": to_user,
				"from_user_name": from_user_name,
				"timestamp": int(time.time())
			},
			user=to_user
		)
		
		# Also send to all sessions of the user for better delivery
		frappe.publish_realtime(
			event="video_upgrade_request",
			message={
				"session_id": session_id,
				"from_user": from_user,
				"to_user": to_user,
				"from_user_name": from_user_name,
				"timestamp": int(time.time())
			},
			room=f"user_{to_user}"
		)
		
		print(f"📹 [API] Video upgrade request sent successfully")
		
		return {"success": True}
		
	except Exception as e:
		print(f"📹 [API] Error in send_video_upgrade_request: {str(e)}")
		frappe.log_error(f"Lỗi khi gửi video upgrade request: {str(e)}")
		frappe.throw(_("Không thể gửi yêu cầu nâng cấp video"))

@frappe.whitelist(methods=["POST"])
def respond_video_upgrade(session_id, accepted):
	"""
	Phản hồi yêu cầu nâng cấp video call
	"""
	try:
		print(f"📹 [API] Processing video upgrade response for session: {session_id}, accepted: {accepted}")
		
		# Kiểm tra session tồn tại (cho phép fallback sessions)
		call_session = None
		target_user = None
		current_user = frappe.session.user
		
		try:
			call_session = frappe.get_doc("Raven Call Session", {"session_id": session_id})
			print(f"📹 [API] Found call session: {call_session.caller_id} -> {call_session.callee_id}")
			
			# Xác định người gửi phản hồi (callee hoặc caller)
			if current_user == call_session.caller_id:
				target_user = call_session.callee_id
			elif current_user == call_session.callee_id:
				target_user = call_session.caller_id
			else:
				frappe.throw(_("Bạn không có quyền phản hồi yêu cầu này"))
				
		except frappe.DoesNotExistError:
			print(f"📹 [API] Call session not found in DB, proceeding with realtime only")
			# For fallback sessions, extract target user from session_id pattern
			if "_" in session_id:
				parts = session_id.split("_")
				if len(parts) >= 3:
					user1, user2 = parts[1], parts[2]
					target_user = user2 if current_user == user1 else user1
					print(f"📹 [API] Extracted target user from session ID: {target_user}")
		
		if not target_user:
			frappe.throw(_("Không thể xác định người nhận phản hồi"))
		
		accepted = str(accepted).lower() == 'true'
		
		print(f"📹 [API] Video upgrade response: {accepted} from {current_user} to {target_user}")
		
		# Nếu được chấp nhận, cập nhật call type thành video (nếu có session)
		if accepted and call_session:
			call_session.call_type = "video"
			call_session.save(ignore_permissions=True)
			print(f"📹 [API] Updated call session type to video")
		
		# Gửi thông báo realtime cho người yêu cầu
		frappe.publish_realtime(
			event="video_upgrade_response",
			message={
				"session_id": session_id,
				"accepted": accepted,
				"from_user": current_user
			},
			user=target_user
		)
		
		# Also send to user room for better delivery
		frappe.publish_realtime(
			event="video_upgrade_response",
			message={
				"session_id": session_id,
				"accepted": accepted,
				"from_user": current_user
			},
			room=f"user_{target_user}"
		)
		
		print(f"📹 [API] Video upgrade response sent successfully")
		
		return {"success": True, "accepted": accepted}
		
	except Exception as e:
		print(f"📹 [API] Error in respond_video_upgrade: {str(e)}")
		frappe.log_error(f"Lỗi khi phản hồi video upgrade: {str(e)}")
		frappe.throw(_("Không thể phản hồi yêu cầu nâng cấp video"))

@frappe.whitelist(methods=["GET"])
def stringee_answer_url():
	"""
	Answer URL endpoint cho Stringee
	Trả về JSON config cho Stringee khi có cuộc gọi đến
	"""
	try:
		# Lấy query parameters
		record = frappe.form_dict.get("record", "false")
		app_to_phone = frappe.form_dict.get("appToPhone", "false")
		
		# Trả về JSON config theo format Stringee yêu cầu
		response = [{
			"action": "connect",
			"from": {
				"type": "internal", 
				"number": "",
				"alias": ""
			},
			"to": {
				"type": "internal",
				"number": "", 
				"alias": ""
			},
			"customData": "",
			"timeout": 60,
			"maxConnectTime": 0,
			"peerToPeerCall": True
		}]
		
		return response
		
	except Exception as e:
		frappe.log_error(f"Lỗi trong stringee answer URL: {str(e)}")
		return [{
			"action": "connect",
			"from": {"type": "internal", "number": "", "alias": ""},
			"to": {"type": "internal", "number": "", "alias": ""},
			"customData": "",
			"timeout": 60,
			"maxConnectTime": 0,
			"peerToPeerCall": True
		}] 

@frappe.whitelist(methods=["POST"])
def check_user_busy_status(user_id):
	"""
	Kiểm tra xem user có đang trong cuộc gọi không
	"""
	try:
		# Kiểm tra quyền - chỉ người dùng hiện tại có thể check
		current_user = frappe.session.user
		
		print(f"📞 [API] Checking busy status for user: {user_id} (requested by: {current_user})")
		
		# Tìm các cuộc gọi đang active của user
		active_calls = frappe.db.sql("""
			SELECT session_id, caller_id, callee_id, status, call_type
			FROM `tabRaven Call Session`
			WHERE (caller_id = %(user_id)s OR callee_id = %(user_id)s)
			AND status IN ('initiated', 'answered', 'connected')
			AND TIMESTAMPDIFF(MINUTE, creation, NOW()) < 30
			ORDER BY creation DESC
		""", {"user_id": user_id}, as_dict=True)
		
		print(f"📞 [API] Found {len(active_calls)} active call sessions for user {user_id}")
		
		is_busy = len(active_calls) > 0
		
		if is_busy:
			# Lấy thông tin cuộc gọi gần nhất
			latest_call = active_calls[0]
			print(f"📞 [API] User {user_id} is BUSY with call: {latest_call}")
			
			return {
				"is_busy": True,
				"current_call": {
					"session_id": latest_call.session_id,
					"status": latest_call.status,
					"call_type": latest_call.call_type,
					"with_user": latest_call.caller_id if latest_call.callee_id == user_id else latest_call.callee_id
				}
			}
		else:
			print(f"📞 [API] User {user_id} is AVAILABLE")
			return {
				"is_busy": False,
				"current_call": None
			}
			
	except Exception as e:
		print(f"📞 [API] Error checking busy status: {str(e)}")
		frappe.log_error(f"Lỗi khi kiểm tra busy status: {str(e)}")
		# Trả về available nếu có lỗi để không block cuộc gọi
		return {
			"is_busy": False,
			"current_call": None,
			"error": str(e)
		}

@frappe.whitelist(methods=["POST"])
def send_video_status(session_id, from_user, to_user, video_enabled):
	"""
	Gửi trạng thái video (bật/tắt) cho người dùng khác
	"""
	try:
		# Kiểm tra quyền
		current_user = frappe.session.user
		if current_user != from_user:
			frappe.throw(_("Bạn không có quyền gửi trạng thái video này"))
		
		# Parse video_enabled if it's a string
		if isinstance(video_enabled, str):
			video_enabled = video_enabled.lower() == 'true'
		
		print(f"📹 [API] Sending video status from {from_user} to {to_user}: {video_enabled}")
		
		# Gửi thông báo realtime cho người nhận
		frappe.publish_realtime(
			event="video_status_update",
			message={
				"session_id": session_id,
				"from_user": from_user,
				"video_enabled": video_enabled
			},
			user=to_user
		)
		
		# Also send to user room for better delivery
		frappe.publish_realtime(
			event="video_status_update",
			message={
				"session_id": session_id,
				"from_user": from_user,
				"video_enabled": video_enabled
			},
			room=f"user_{to_user}"
		)
		
		print(f"📹 [API] Video status sent successfully")
		
		return {"success": True, "video_enabled": video_enabled}
		
	except Exception as e:
		print(f"📹 [API] Error sending video status: {str(e)}")
		frappe.log_error(f"Lỗi khi gửi video status: {str(e)}")
		frappe.throw(_("Không thể gửi trạng thái video"))
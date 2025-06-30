import json
import frappe
from frappe import _
from typing import List, Dict, Optional, Union
import firebase_admin
from firebase_admin import credentials, messaging
from .firebase_env import get_firebase_service_account


class FirebaseService:
	"""
	Firebase Cloud Messaging service cho Raven
	Thư viện riêng để gửi push notifications qua Firebase
	"""
	
	_instance = None
	_app = None
	
	def __new__(cls):
		if cls._instance is None:
			cls._instance = super(FirebaseService, cls).__new__(cls)
		return cls._instance
	
	def __init__(self):
		if not hasattr(self, 'initialized'):
			self.initialized = False
			self._initialize_firebase()
	
	def _initialize_firebase(self):
		"""Khởi tạo Firebase Admin SDK"""
		try:
			if not firebase_admin._apps:
				# Load Service Account từ environment variables
				service_account_info = get_firebase_service_account()
				
				if not service_account_info.get("project_id"):
					frappe.logger().error("Firebase Service Account not configured. Please check .firebase.env file")
					self.initialized = False
					return
				
				cred = credentials.Certificate(service_account_info)
				
				# Initialize with project ID để ensure HTTP v1 API
				firebase_admin_config = {
					'projectId': service_account_info.get("project_id")  # From environment
				}
				
				self._app = firebase_admin.initialize_app(cred, firebase_admin_config)
			else:
				self._app = firebase_admin.get_app()
				
			self.initialized = True
			frappe.logger().info("Firebase Service initialized successfully")
			
		except Exception as e:
			frappe.logger().error(f"Failed to initialize Firebase: {str(e)}")
			self.initialized = False
	
	def send_notification_to_user(
		self, 
		user: str, 
		title: str, 
		body: str, 
		data: Optional[Dict] = None,
		click_action: Optional[str] = None,
		image: Optional[str] = None
	) -> bool:
		"""
		Gửi notification đến một user cụ thể
		
		Args:
			user: User ID
			title: Tiêu đề notification
			body: Nội dung notification
			data: Dữ liệu custom
			click_action: URL khi click vào notification
			image: URL hình ảnh
			
		Returns:
			bool: True nếu gửi thành công
		"""
		if not self.initialized:
			frappe.logger().error("Firebase service not initialized")
			return False
		
		try:
			# Lấy tokens của user
			from raven.raven.doctype.firebase_notification_token.firebase_notification_token import FirebaseNotificationToken
			tokens = FirebaseNotificationToken.get_active_tokens_for_user(user)
			
			if not tokens:
				frappe.logger().warning(f"No active Firebase tokens found for user: {user}")
				return False
			
			firebase_tokens = [token.firebase_token for token in tokens]
			return self._send_to_tokens(firebase_tokens, title, body, data, click_action, image)
			
		except Exception as e:
			frappe.logger().error(f"Error sending notification to user {user}: {str(e)}")
			return False
	
	def send_notification_to_users(
		self, 
		users: List[str], 
		title: str, 
		body: str, 
		data: Optional[Dict] = None,
		click_action: Optional[str] = None,
		image: Optional[str] = None
	) -> bool:
		"""
		Gửi notification đến nhiều users
		
		Args:
			users: List User IDs
			title: Tiêu đề notification
			body: Nội dung notification
			data: Dữ liệu custom
			click_action: URL khi click vào notification
			image: URL hình ảnh
			
		Returns:
			bool: True nếu gửi thành công
		"""
		if not self.initialized:
			frappe.logger().error("Firebase service not initialized")
			return False
		
		try:
			# Lấy tokens của tất cả users
			from raven.raven.doctype.firebase_notification_token.firebase_notification_token import FirebaseNotificationToken
			token_docs = FirebaseNotificationToken.get_active_tokens_for_users(users)
			
			if not token_docs:
				frappe.logger().warning(f"No active Firebase tokens found for users: {users}")
				return False
			
			firebase_tokens = [token.firebase_token for token in token_docs]
			return self._send_to_tokens(firebase_tokens, title, body, data, click_action, image)
			
		except Exception as e:
			frappe.logger().error(f"Error sending notification to users {users}: {str(e)}")
			return False
	
	def send_notification_to_channel(
		self, 
		channel_id: str, 
		title: str, 
		body: str, 
		data: Optional[Dict] = None,
		click_action: Optional[str] = None,
		image: Optional[str] = None,
		exclude_user: Optional[str] = None
	) -> bool:
		"""
		Gửi notification đến tất cả members của một channel
		
		Args:
			channel_id: Channel ID
			title: Tiêu đề notification
			body: Nội dung notification
			data: Dữ liệu custom
			click_action: URL khi click vào notification
			image: URL hình ảnh
			exclude_user: User ID cần loại trừ (thường là người gửi)
			
		Returns:
			bool: True nếu gửi thành công
		"""
		try:
			# Lấy danh sách members trong channel
			from raven.utils import get_channel_members
			channel_members = get_channel_members(channel_id)
			
			users = []
			for member in channel_members.values():
				if member.get("allow_notifications") and member.get("user_id") != exclude_user:
					users.append(member.get("user_id"))
			
			if not users:
				return False
				
			return self.send_notification_to_users(users, title, body, data, click_action, image)
			
		except Exception as e:
			frappe.logger().error(f"Error sending notification to channel {channel_id}: {str(e)}")
			return False
	
	def _send_to_tokens(
		self, 
		tokens: List[str], 
		title: str, 
		body: str, 
		data: Optional[Dict] = None,
		click_action: Optional[str] = None,
		image: Optional[str] = None
	) -> bool:
		"""
		Gửi notification đến list tokens
		
		Args:
			tokens: List Firebase tokens
			title: Tiêu đề notification
			body: Nội dung notification
			data: Dữ liệu custom
			click_action: URL khi click vào notification
			image: URL hình ảnh
			
		Returns:
			bool: True nếu gửi thành công
		"""
		if not tokens:
			return False
		
		try:
			# Chuẩn bị notification payload
			notification = messaging.Notification(
				title=title,
				body=body,
				image=image
			)
			
			# Chuẩn bị data
			if data is None:
				data = {}
			data.update({
				"base_url": frappe.utils.get_url(),
				"sitename": frappe.local.site,
				"timestamp": str(frappe.utils.now())
			})
			
			# Add click_action vào data thay vì WebpushNotification
			if click_action:
				data["click_action"] = click_action
			else:
				data["click_action"] = frappe.utils.get_url() + "/raven"
			
			# Chuẩn bị web config - KHÔNG có click_action parameter
			web_config = messaging.WebpushConfig(
				notification=messaging.WebpushNotification(
					title=title,
					body=body,
					icon='/assets/raven/raven-logo.png',
					image=image
				)
			)
			
			# Tạo message
			message = messaging.MulticastMessage(
				notification=notification,
				data={k: str(v) for k, v in data.items()},  # Firebase chỉ nhận string values
				webpush=web_config,
				tokens=tokens
			)
			
			# Gửi message - try multicast first, fallback to individual sends
			try:
				response = messaging.send_multicast(message)
				frappe.logger().info(f"🔥 Multicast send successful")
			except Exception as multicast_error:
				frappe.logger().warning(f"🔥 Multicast failed, trying individual sends: {str(multicast_error)}")
				
				# Fallback: Send individual messages
				responses = []
				success_count = 0
				failure_count = 0
				
				for token in tokens:
					try:
						individual_message = messaging.Message(
							notification=notification,
							data={k: str(v) for k, v in data.items()},
							webpush=web_config,
							token=token
						)
						individual_response = messaging.send(individual_message)
						responses.append(type('Response', (), {'success': True, 'message_id': individual_response})())
						success_count += 1
						frappe.logger().info(f"🔥 Individual send successful: {individual_response}")
					except Exception as individual_error:
						responses.append(type('Response', (), {'success': False, 'exception': individual_error})())
						failure_count += 1
						frappe.logger().error(f"🔥 Individual send failed: {str(individual_error)}")
				
				# Create mock response object
				response = type('MockResponse', (), {
					'success_count': success_count,
					'failure_count': failure_count,
					'responses': responses
				})()
			
			# Log chi tiết response
			frappe.logger().info(f"Firebase notification sent. Success: {response.success_count}, Failed: {response.failure_count}")
			frappe.logger().info(f"Firebase response details: {[r.message_id if r.success else str(r.exception) for r in response.responses]}")
			
			# Xử lý invalid tokens
			if response.failure_count > 0:
				self._handle_failed_tokens(tokens, response.responses)
			
			# Return True nếu có ít nhất 1 response (success hoặc failure)
			# Vì đôi khi Firebase trả về message ID nhưng success_count = 0
			has_responses = len(response.responses) > 0
			any_message_id = any(r.message_id for r in response.responses if r.success)
			
			frappe.logger().info(f"Firebase final result: has_responses={has_responses}, any_message_id={any_message_id}, success_count={response.success_count}")
			
			# Return True nếu có message ID hoặc success_count > 0
			return any_message_id or response.success_count > 0
			
		except Exception as e:
			frappe.logger().error(f"Error sending Firebase notification: {str(e)}")
			return False
	
	def _handle_failed_tokens(self, tokens: List[str], responses: List):
		"""Xử lý các token không hợp lệ"""
		try:
			from raven.raven.doctype.firebase_notification_token.firebase_notification_token import FirebaseNotificationToken
			
			for i, response in enumerate(responses):
				if not response.success and i < len(tokens):
					token = tokens[i]
					error_code = response.exception.code if response.exception else 'unknown'
					
					# Deactivate invalid tokens
					if error_code in ['registration-token-not-registered', 'invalid-registration-token']:
						FirebaseNotificationToken.deactivate_token(token)
						frappe.logger().info(f"Deactivated invalid Firebase token: {token}")
					
		except Exception as e:
			frappe.logger().error(f"Error handling failed tokens: {str(e)}")


# Singleton instance
firebase_service = FirebaseService()


# Helper functions để sử dụng dễ dàng hơn
def send_firebase_notification_to_user(user: str, title: str, body: str, **kwargs) -> bool:
	"""Helper function để gửi notification đến user"""
	return firebase_service.send_notification_to_user(user, title, body, **kwargs)


def send_firebase_notification_to_users(users: List[str], title: str, body: str, **kwargs) -> bool:
	"""Helper function để gửi notification đến nhiều users"""
	return firebase_service.send_notification_to_users(users, title, body, **kwargs)


def send_firebase_notification_to_channel(channel_id: str, title: str, body: str, **kwargs) -> bool:
	"""Helper function để gửi notification đến channel"""
	return firebase_service.send_notification_to_channel(channel_id, title, body, **kwargs) 
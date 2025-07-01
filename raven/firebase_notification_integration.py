import frappe
from frappe import _
from raven.firebase_service import send_firebase_notification_to_user, send_firebase_notification_to_channel


def send_firebase_notification_for_message(message):
	"""
	Gửi Firebase notification cho một tin nhắn
	Thay thế cho hàm send_notification_for_message gốc
	
	Args:
		message: RavenMessage document
	"""
	try:
		frappe.logger().info(f"🔥 Firebase notification integration called for message {message.name} in channel {message.channel_id}")
		
		channel_doc = frappe.get_cached_doc("Raven Channel", message.channel_id)
		
		# Không gửi notification cho self message
		if channel_doc.is_self_message:
			frappe.logger().info(f"🔥 Skipping self message for {message.name}")
			return
		
		# Không gửi cho system messages
		if message.message_type == "System":
			return
		
		# Xử lý DM vs Channel messages
		if channel_doc.is_direct_message:
			frappe.logger().info(f"🔥 Sending DM notification for message {message.name}")
			_send_firebase_notification_for_direct_message(message, channel_doc)
		else:
			frappe.logger().info(f"🔥 Sending channel notification for message {message.name}")
			_send_firebase_notification_for_channel_message(message, channel_doc)
			
	except Exception as e:
		frappe.logger().error(f"Error sending Firebase notification for message: {str(e)}")


def _send_firebase_notification_for_direct_message(message, channel_doc):
	"""
	Gửi Firebase notification cho tin nhắn DM
	
	Args:
		message: RavenMessage document
		channel_doc: RavenChannel document
	"""
	try:
		# Lấy user đối tác trong DM
		peer_raven_user = frappe.db.get_value(
			"Raven Channel Member",
			{"channel_id": message.channel_id, "user_id": ("!=", message.owner)},
			"user_id",
		)
		
		if not peer_raven_user:
			return
		
		peer_raven_user_doc = frappe.get_cached_doc("Raven User", peer_raven_user)
		
		# Không gửi notification cho bot
		if peer_raven_user_doc.type == "Bot":
			return
		
		# Chuẩn bị nội dung notification
		content = message.get_notification_message_content()
		owner_name, owner_image = message.get_message_owner_details()
		
		# URL để mở channel
		url = frappe.utils.get_url() + "/raven/channels/" + channel_doc.name + "/"
		
		# Gửi Firebase notification
		send_firebase_notification_to_user(
			user=peer_raven_user_doc.user,
			title=owner_name,
			body=content,
			data={
				"message_id": message.name,
				"channel_id": message.channel_id,
				"raven_message_type": message.message_type,
				"channel_type": "DM",
				"content": message.content if message.message_type == "Text" else message.file,
				"from_user": message.owner,
				"type": "New message",
				"creation": str(message.creation),
			},
			click_action=url,
			image=_get_absolute_image_url(owner_image)
		)
		
	except Exception as e:
		frappe.logger().error(f"Error sending Firebase notification for DM: {str(e)}")


def _send_firebase_notification_for_channel_message(message, channel_doc):
	"""
	Gửi Firebase notification cho tin nhắn channel
	
	Args:
		message: RavenMessage document  
		channel_doc: RavenChannel document
	"""
	try:
		content = message.get_notification_message_content()
		owner_name, owner_image = message.get_message_owner_details()
		
		# Tạo title phù hợp
		if channel_doc.is_thread:
			title = f"{owner_name} trong thread"
		else:
			title = f"{owner_name} trong #{channel_doc.channel_name}"
		
		# URL để mở channel
		workspace = "" if channel_doc.is_dm_thread else channel_doc.workspace
		url = frappe.utils.get_url() + "/raven/"
		if workspace:
			url += f"{workspace}/"
		else:
			url += "channels/"
		
		if channel_doc.is_thread:
			url += f"thread/{channel_doc.name}/"
		else:
			url += f"{channel_doc.name}/"
		
		# Gửi Firebase notification đến channel (sẽ exclude người gửi)
		frappe.logger().info(f"🔥 Calling send_firebase_notification_to_channel for {message.channel_id}, exclude_user: {message.owner}")
		result = send_firebase_notification_to_channel(
			channel_id=message.channel_id,
			title=title,
			body=content,
			data={
				"message_id": message.name,
				"channel_id": message.channel_id,
				"raven_message_type": message.message_type,
				"channel_type": "Channel",
				"content": message.content if message.message_type == "Text" else message.file,
				"from_user": message.owner,
				"type": "New message",
				"is_thread": "1" if channel_doc.is_thread else "0",
				"creation": str(message.creation),
			},
			click_action=url,
			image=_get_absolute_image_url(owner_image),
			exclude_user=message.owner  # Không gửi cho người gửi
		)
		frappe.logger().info(f"🔥 send_firebase_notification_to_channel result: {result}")
		
	except Exception as e:
		frappe.logger().error(f"Error sending Firebase notification for channel: {str(e)}")


def _get_absolute_image_url(image_path):
	"""
	Chuyển đổi image path thành absolute URL
	
	Args:
		image_path: Path của hình ảnh
		
	Returns:
		str: Absolute URL hoặc None
	"""
	if not image_path:
		return None
	
	if image_path.startswith("/"):
		return frappe.utils.get_url() + image_path
	else:
		return image_path


def send_firebase_notification_for_mention(mentioned_user, message, channel_doc):
	"""
	Gửi Firebase notification khi user được mention
	
	Args:
		mentioned_user: User được mention
		message: RavenMessage document
		channel_doc: RavenChannel document
	"""
	try:
		content = message.get_notification_message_content()
		owner_name, owner_image = message.get_message_owner_details()
		
		channel_name = f" trong #{channel_doc.channel_name}"
		if channel_doc.is_thread:
			channel_name = " trong thread"
		elif channel_doc.is_direct_message:
			channel_name = ""
		
		title = f"{owner_name} đã mention bạn{channel_name}"
		
		# URL để mở channel
		workspace = "" if channel_doc.is_dm_thread else channel_doc.workspace
		url = frappe.utils.get_url() + "/raven/"
		if workspace:
			url += f"{workspace}/"
		else:
			url += "channels/"
		
		if channel_doc.is_thread:
			url += f"thread/{channel_doc.name}/"
		else:
			url += f"{channel_doc.name}/"
		
		send_firebase_notification_to_user(
			user=mentioned_user,
			title=title,
			body=content,
			data={
				"message_id": message.name,
				"channel_id": message.channel_id,
				"raven_message_type": message.message_type,
				"channel_type": "Mention",
				"content": message.content if message.message_type == "Text" else message.file,
				"from_user": message.owner,
				"type": "Mention",
				"creation": str(message.creation),
			},
			click_action=url,
			image=_get_absolute_image_url(owner_image)
		)
		
	except Exception as e:
		frappe.logger().error(f"Error sending Firebase notification for mention: {str(e)}")


def send_firebase_notification_for_reply(replied_user, message, channel_doc):
	"""
	Gửi Firebase notification khi user được reply
	
	Args:
		replied_user: User được reply
		message: RavenMessage document
		channel_doc: RavenChannel document
	"""
	try:
		content = message.get_notification_message_content()
		owner_name, owner_image = message.get_message_owner_details()
		
		channel_name = f" trong #{channel_doc.channel_name}"
		if channel_doc.is_thread:
			channel_name = " trong thread"
		elif channel_doc.is_direct_message:
			channel_name = ""
		
		title = f"{owner_name} đã reply bạn{channel_name}"
		
		# URL để mở channel
		workspace = "" if channel_doc.is_dm_thread else channel_doc.workspace
		url = frappe.utils.get_url() + "/raven/"
		if workspace:
			url += f"{workspace}/"
		else:
			url += "channels/"
		
		if channel_doc.is_thread:
			url += f"thread/{channel_doc.name}/"
		else:
			url += f"{channel_doc.name}/"
		
		send_firebase_notification_to_user(
			user=replied_user,
			title=title,
			body=content,
			data={
				"message_id": message.name,
				"channel_id": message.channel_id,
				"raven_message_type": message.message_type,
				"channel_type": "Reply",
				"content": message.content if message.message_type == "Text" else message.file,
				"from_user": message.owner,
				"type": "Reply",
				"creation": str(message.creation),
			},
			click_action=url,
			image=_get_absolute_image_url(owner_image)
		)
		
	except Exception as e:
		frappe.logger().error(f"Error sending Firebase notification for reply: {str(e)}") 
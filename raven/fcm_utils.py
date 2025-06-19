import json
import frappe
from firebase_admin import credentials, messaging, initialize_app, get_app
from frappe.utils import get_url, get_datetime

# Biến global để track Firebase đã được khởi tạo chưa
_firebase_initialized = False

# Khởi tạo Firebase Admin SDK
def initialize_firebase_admin():
    """Khởi tạo Firebase Admin SDK với service account"""
    global _firebase_initialized
    
    try:
        # Kiểm tra xem đã khởi tạo chưa
        if _firebase_initialized:
            try:
                get_app()
                return True
            except ValueError:
                # App đã bị xóa, cần khởi tạo lại
                _firebase_initialized = False
        
        # Lấy service account key từ site config
        service_account_key = frappe.get_site_config().get('firebase_service_account')
        if not service_account_key:
            frappe.log_error("Firebase service account key not found in site config", "FCM Error")
            return False
            
        # Parse service account key
        if isinstance(service_account_key, str):
            try:
                service_account_key = json.loads(service_account_key)
            except json.JSONDecodeError as e:
                frappe.log_error(f"Invalid JSON in firebase_service_account: {str(e)}", "FCM Error")
                return False
        
        # Kiểm tra các trường bắt buộc
        required_fields = ['type', 'project_id', 'private_key_id', 'private_key', 'client_email']
        for field in required_fields:
            if field not in service_account_key:
                frappe.log_error(f"Missing required field '{field}' in firebase_service_account", "FCM Error")
                return False
        
        # Xử lý private key - chuyển đổi \n thành newline thực sự
        if 'private_key' in service_account_key:
            private_key = service_account_key['private_key']
            # Xử lý nhiều trường hợp escape
            private_key = private_key.replace('\\n', '\n')
            private_key = private_key.replace('\\\\n', '\\n')
            service_account_key['private_key'] = private_key
            
        # Log thông tin project để debug
        frappe.logger().info(f"Initializing Firebase for project: {service_account_key.get('project_id')}")
        frappe.logger().info(f"Client email: {service_account_key.get('client_email')}")
        frappe.logger().info(f"Private key starts with: {service_account_key.get('private_key', '')[:50]}...")
        frappe.logger().info(f"Private key ends with: ...{service_account_key.get('private_key', '')[-50:]}")
            
        # Khởi tạo Firebase Admin SDK
        cred = credentials.Certificate(service_account_key)
        initialize_app(cred)
        _firebase_initialized = True
        frappe.logger().info("Firebase Admin SDK initialized successfully")
        return True
    except Exception as e:
        frappe.log_error(f"Failed to initialize Firebase Admin SDK: {str(e)}", "FCM Error")
        _firebase_initialized = False
        return False

def send_fcm_notification_to_token(token, title, body, data=None, image=None):
    """
    Gửi notification tới một FCM token cụ thể
    
    Args:
        token (str): FCM token
        title (str): Tiêu đề notification
        body (str): Nội dung notification
        data (dict): Dữ liệu bổ sung
        image (str): URL hình ảnh
    """
    try:
        if not initialize_firebase_admin():
            return False
            
        # Tạo message đơn giản
        message = messaging.Message(
            notification=messaging.Notification(
                title=title,
                body=body,
                image=image
            ),
            data=data or {},
            token=token
        )
        
        # Gửi message
        response = messaging.send(message)
        frappe.logger().info(f"FCM notification sent successfully: {response}")
        return True
        
    except Exception as e:
        frappe.log_error(f"Failed to send FCM notification: {str(e)}", "FCM Error")
        return False

def send_fcm_notification_to_tokens(tokens, title, body, data=None, image=None):
    """
    Gửi notification tới nhiều FCM tokens
    
    Args:
        tokens (list): Danh sách FCM tokens
        title (str): Tiêu đề notification
        body (str): Nội dung notification
        data (dict): Dữ liệu bổ sung
        image (str): URL hình ảnh
    """
    try:
        frappe.logger().info(f"Starting FCM multicast notification to {len(tokens)} tokens")
        
        if not initialize_firebase_admin():
            frappe.logger().error("Failed to initialize Firebase Admin SDK")
            return False
            
        if not tokens:
            frappe.logger().info("No tokens provided, skipping notification")
            return True
            
        # Log token info (ẩn một phần để bảo mật)
        for i, token in enumerate(tokens[:3]):  # Chỉ log 3 token đầu
            frappe.logger().info(f"Token {i+1}: {token[:20]}...{token[-10:]}")
        
        # Tạo message đơn giản
        message = messaging.MulticastMessage(
            notification=messaging.Notification(
                title=title,
                body=body,
                image=image
            ),
            data=data or {},
            tokens=tokens
        )
        
        frappe.logger().info(f"Sending FCM multicast message: title='{title}', body='{body}'")
        
        # Gửi message - sử dụng send_each_for_multicast thay vì send_multicast (deprecated)
        response = messaging.send_each_for_multicast(message)
        frappe.logger().info(f"FCM multicast notification sent: {response.success_count} successful, {response.failure_count} failed")
        
        # Log chi tiết từng response
        for idx, result in enumerate(response.responses):
            if result.success:
                frappe.logger().info(f"Token {idx} success: {result.message_id}")
            else:
                frappe.logger().error(f"Token {idx} failed: {result.exception}")
                frappe.logger().error(f"Token {idx} error type: {type(result.exception).__name__}")
                frappe.logger().error(f"Token {idx} error details: {str(result.exception)}")
        
        # Log failed tokens
        if response.failure_count > 0:
            failed_tokens = []
            for idx, result in enumerate(response.responses):
                if not result.success:
                    failed_tokens.append(tokens[idx])
                    frappe.logger().error(f"Failed token {idx}: {result.exception}")
            
            # Log failed tokens với độ dài giới hạn
            failed_tokens_short = [token[:20] + "..." + token[-10:] if len(token) > 30 else token for token in failed_tokens]
            frappe.log_error(f"Failed FCM tokens: {failed_tokens_short}", "FCM Error")
            
        return True
        
    except Exception as e:
        frappe.log_error(f"Failed to send FCM multicast notification: {str(e)}", "FCM Error")
        frappe.logger().error(f"FCM Error details: {type(e).__name__}: {str(e)}")
        return False

def send_message_notification(message_doc):
    """
    Gửi notification cho tin nhắn mới
    
    Args:
        message_doc: Raven Message document
    """
    try:
        # Lấy thông tin channel
        channel_doc = frappe.get_doc("Raven Channel", message_doc.channel_id)
        
        # Không gửi notification cho tin nhắn hệ thống hoặc tin nhắn gửi cho chính mình
        if (message_doc.message_type == "System" or 
            channel_doc.is_self_message or
            hasattr(message_doc, 'flags') and message_doc.flags.get('send_silently')):
            return
            
        # Lấy tokens của các user trong channel
        tokens = get_fcm_tokens_for_channel(message_doc.channel_id)
        
        # Lọc bỏ token của người gửi tin nhắn
        if not message_doc.is_bot_message:
            tokens = [token for token in tokens if token.get('user') != message_doc.owner]
            
        if not tokens:
            return
            
        # Chuẩn bị nội dung notification
        content = get_notification_content(message_doc)
        owner_name, owner_image = get_message_owner_details(message_doc)
        
        # Chuẩn bị data
        notification_data = {
            'message_id': message_doc.name,
            'channel_id': message_doc.channel_id,
            'msg_type': message_doc.message_type,
            'channel_type': 'DM' if channel_doc.is_direct_message else 'Channel',
            'content': message_doc.content or '',
            'from_user': message_doc.owner,
            'type': 'New message',
            'is_thread': '1' if channel_doc.is_thread else '0',
            'creation': str(int(get_datetime(message_doc.creation).timestamp() * 1000)),
            'base_url': get_url(),
            'sitename': frappe.local.site
        }
        
        # Chuẩn bị title
        if channel_doc.is_direct_message:
            title = owner_name
        elif channel_doc.is_thread:
            title = f"{owner_name} in thread"
        else:
            title = f"{owner_name} in #{channel_doc.channel_name}"
            
        # Gửi notification
        fcm_tokens = [token['fcm_token'] for token in tokens]
        send_fcm_notification_to_tokens(
            tokens=fcm_tokens,
            title=title,
            body=content,
            data=notification_data,
            image=get_image_url(owner_image)
        )
        
    except Exception as e:
        frappe.log_error(f"Failed to send message notification: {str(e)}", "FCM Error")

def get_fcm_tokens_for_channel(channel_id):
    """
    Lấy FCM tokens của tất cả user trong channel
    """
    try:
        # Query để lấy tokens
        tokens = frappe.db.sql("""
            SELECT DISTINCT fcm.fcm_token, fcm.user
            FROM `tabFCM Token` fcm
            INNER JOIN `tabRaven User` ru ON ru.user = fcm.user
            INNER JOIN `tabRaven Channel Member` rcm ON rcm.user_id = ru.name
            WHERE rcm.channel_id = %s
            AND ru.type = 'User'
            AND rcm.allow_notifications = 1
            AND fcm.fcm_token IS NOT NULL
            AND fcm.fcm_token != ''
        """, (channel_id,), as_dict=True)
        
        return tokens
    except Exception as e:
        frappe.log_error(f"Failed to get FCM tokens for channel: {str(e)}", "FCM Error")
        return []

def get_notification_content(message_doc):
    """
    Lấy nội dung notification từ message
    """
    if message_doc.message_type == "File":
        return f"📄 Sent a file - {message_doc.content or ''}"
    elif message_doc.message_type == "Image":
        return "📷 Sent a photo"
    elif message_doc.message_type == "Poll":
        return "📊 Sent a poll"
    elif message_doc.text:
        return message_doc.content or "Sent a message"
    else:
        return "Sent a message"

def get_message_owner_details(message_doc):
    """
    Lấy thông tin người gửi tin nhắn
    """
    if message_doc.is_bot_message:
        bot_doc = frappe.get_doc("Raven User", message_doc.bot)
        return bot_doc.full_name, bot_doc.user_image
    else:
        user_doc = frappe.get_doc("Raven User", message_doc.owner)
        return user_doc.full_name, user_doc.user_image

def get_image_url(image_path):
    """
    Lấy URL tuyệt đối của hình ảnh
    """
    if not image_path:
        return None
        
    if image_path.startswith("/"):
        return get_url() + image_path
    else:
        return image_path 
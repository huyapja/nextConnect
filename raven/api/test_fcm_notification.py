import frappe
from frappe import _
from frappe.utils import get_url

@frappe.whitelist(allow_guest=True)
def test_fcm_notification(fcm_token=None, title=None, body=None):
    """
    API test để gửi FCM notification thủ công
    
    Args:
        fcm_token (str): FCM token để gửi notification
        title (str): Tiêu đề notification
        body (str): Nội dung notification
    """
    try:
        from raven.fcm_utils import send_fcm_notification_to_token
        
        # Nếu không có token, lấy token đầu tiên từ database
        if not fcm_token:
            fcm_docs = frappe.get_all("FCM Token", limit=1)
            if not fcm_docs:
                return {
                    "success": False,
                    "message": "Không tìm thấy FCM token nào trong database"
                }
            fcm_doc = frappe.get_doc("FCM Token", fcm_docs[0].name)
            fcm_token = fcm_doc.fcm_token
            
        # Nếu không có title/body, sử dụng giá trị mặc định
        if not title:
            title = "Test Notification"
        if not body:
            body = "Đây là notification test từ Raven"
            
        # Data bổ sung
        data = {
            "type": "test",
            "message_id": "test_message",
            "channel_id": "test_channel",
            "base_url": get_url(),
            "sitename": frappe.local.site
        }
        
        # Gửi notification
        success = send_fcm_notification_to_token(
            token=fcm_token,
            title=title,
            body=body,
            data=data
        )
        
        if success:
            return {
                "success": True,
                "message": "FCM notification đã được gửi thành công",
                "token": fcm_token[:20] + "..." if len(fcm_token) > 20 else fcm_token
            }
        else:
            return {
                "success": False,
                "message": "Không thể gửi FCM notification"
            }
            
    except Exception as e:
        frappe.log_error(f"Test FCM notification error: {str(e)}", "FCM Test Error")
        return {
            "success": False,
            "message": f"Lỗi: {str(e)}"
        }

@frappe.whitelist(allow_guest=True)
def get_fcm_tokens():
    """
    API để lấy danh sách FCM tokens
    """
    try:
        tokens = frappe.get_all("FCM Token", fields=["name", "user", "fcm_token", "platform", "creation"])
        
        # Ẩn một phần token để bảo mật
        for token in tokens:
            if token.fcm_token and len(token.fcm_token) > 20:
                token.fcm_token = token.fcm_token[:20] + "..."
                
        return {
            "success": True,
            "tokens": tokens
        }
        
    except Exception as e:
        frappe.log_error(f"Get FCM tokens error: {str(e)}", "FCM Error")
        return {
            "success": False,
            "message": f"Lỗi: {str(e)}"
        }

@frappe.whitelist(allow_guest=True)
def send_test_message_notification(channel_id=None):
    """
    API để gửi test notification cho một channel cụ thể
    """
    try:
        from raven.fcm_utils import get_fcm_tokens_for_channel, send_fcm_notification_to_tokens
        
        # Nếu không có channel_id, lấy channel đầu tiên
        if not channel_id:
            channel_docs = frappe.get_all("Raven Channel", limit=1)
            if not channel_docs:
                return {
                    "success": False,
                    "message": "Không tìm thấy channel nào"
                }
            channel_id = channel_docs[0].name
            
        # Lấy tokens của channel
        tokens = get_fcm_tokens_for_channel(channel_id)
        
        if not tokens:
            return {
                "success": False,
                "message": f"Không tìm thấy FCM token nào cho channel {channel_id}"
            }
            
        # Chuẩn bị notification
        title = "Test Message Notification"
        body = f"Đây là notification test cho channel {channel_id}"
        
        data = {
            "type": "test_message",
            "channel_id": channel_id,
            "message_id": "test_message_id",
            "msg_type": "Text",
            "base_url": get_url(),
            "sitename": frappe.local.site
        }
        
        # Gửi notification
        fcm_tokens = [token['fcm_token'] for token in tokens]
        success = send_fcm_notification_to_tokens(
            tokens=fcm_tokens,
            title=title,
            body=body,
            data=data
        )
        
        if success:
            return {
                "success": True,
                "message": f"Đã gửi test notification tới {len(tokens)} tokens trong channel {channel_id}"
            }
        else:
            return {
                "success": False,
                "message": "Không thể gửi test notification"
            }
            
    except Exception as e:
        frappe.log_error(f"Send test message notification error: {str(e)}", "FCM Error")
        return {
            "success": False,
            "message": f"Lỗi: {str(e)}"
        } 
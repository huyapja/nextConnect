import frappe
from raven.fcm_utils import send_fcm_notification_to_token

@frappe.whitelist(allow_guest=True)
def test_simple_fcm():
    """Test FCM đơn giản"""
    try:
        # Lấy token đầu tiên từ database
        fcm_docs = frappe.get_all("FCM Token", limit=1)
        if not fcm_docs:
            return {
                "success": False,
                "message": "Không tìm thấy FCM token nào"
            }
        
        fcm_doc = frappe.get_doc("FCM Token", fcm_docs[0].name)
        fcm_token = fcm_doc.fcm_token
        
        # Gửi notification
        success = send_fcm_notification_to_token(
            token=fcm_token,
            title="Test Simple",
            body="Test notification đơn giản"
        )
        
        if success:
            return {
                "success": True,
                "message": "Gửi notification thành công"
            }
        else:
            return {
                "success": False,
                "message": "Không thể gửi notification"
            }
            
    except Exception as e:
        return {
            "success": False,
            "message": f"Lỗi: {str(e)}"
        } 
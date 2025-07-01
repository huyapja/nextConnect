import frappe
from frappe import _
from frappe.utils import now_datetime, get_datetime
import json

@frappe.whitelist()
def create_missed_call(caller_id, callee_id, call_type="audio"):
    """
    Tạo missed call record khi có cuộc gọi nhỡ
    """
    try:
        # Lấy thông tin caller
        caller_info = frappe.get_cached_value("Raven User", caller_id, ["full_name", "first_name", "user_image"], as_dict=True)
        caller_name = caller_info.get("full_name") or caller_info.get("first_name") or caller_id
        
        # Tạo missed call record
        missed_call = frappe.get_doc({
            "doctype": "Raven Missed Call",
            "caller_id": caller_id,
            "callee_id": callee_id,
            "caller_name": caller_name,
            "caller_image": caller_info.get("user_image"),
            "call_type": call_type,
            "is_read": False,
            "creation": now_datetime()
        })
        
        missed_call.insert(ignore_permissions=True)
        
        # Gửi real-time notification
        frappe.publish_realtime(
            event="missed_call_created",
            message={
                "missed_call_id": missed_call.name,
                "caller_id": caller_id,
                "caller_name": caller_name,
                "call_type": call_type
            },
            user=callee_id
        )
        
        print(f"📞 [API] Created missed call: {caller_name} -> {callee_id}")
        
        return {
            "success": True,
            "missed_call_id": missed_call.name
        }
        
    except Exception as e:
        frappe.log_error(f"Error creating missed call: {str(e)}")
        print(f"❌ [API] Error creating missed call: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }

@frappe.whitelist()
def get_missed_calls():
    """
    Lấy danh sách missed calls của user hiện tại
    """
    try:
        current_user = frappe.session.user
        
        # Lấy missed calls trong 7 ngày gần đây
        missed_calls = frappe.db.sql("""
            SELECT 
                name,
                caller_id,
                caller_name,
                caller_image,
                call_type,
                is_read,
                creation
            FROM `tabRaven Missed Call`
            WHERE callee_id = %(user_id)s
            AND DATEDIFF(NOW(), creation) <= 7
            ORDER BY creation DESC
        """, {"user_id": current_user}, as_dict=True)
        
        print(f"📞 [API] Found {len(missed_calls)} missed calls for {current_user}")
        
        return missed_calls
        
    except Exception as e:
        frappe.log_error(f"Error getting missed calls: {str(e)}")
        print(f"❌ [API] Error getting missed calls: {str(e)}")
        return []

@frappe.whitelist(methods=["POST"])
def mark_as_read(call_id):
    """
    Đánh dấu missed call đã đọc
    """
    try:
        current_user = frappe.session.user
        
        # Kiểm tra quyền
        missed_call = frappe.get_doc("Raven Missed Call", call_id)
        if missed_call.callee_id != current_user:
            frappe.throw(_("Bạn không có quyền đánh dấu cuộc gọi này"))
        
        # Cập nhật is_read
        missed_call.is_read = True
        missed_call.save(ignore_permissions=True)
        
        # Gửi real-time notification
        frappe.publish_realtime(
            event="missed_call_read",
            message={
                "missed_call_id": call_id
            },
            user=current_user
        )
        
        print(f"📞 [API] Marked missed call as read: {call_id}")
        
        return {"success": True}
        
    except Exception as e:
        frappe.log_error(f"Error marking missed call as read: {str(e)}")
        print(f"❌ [API] Error marking as read: {str(e)}")
        frappe.throw(_("Không thể đánh dấu đã đọc"))

@frappe.whitelist(methods=["POST"])
def mark_all_as_read():
    """
    Đánh dấu tất cả missed calls đã đọc
    """
    try:
        current_user = frappe.session.user
        
        # Cập nhật tất cả unread missed calls
        frappe.db.sql("""
            UPDATE `tabRaven Missed Call`
            SET is_read = 1
            WHERE callee_id = %(user_id)s AND is_read = 0
        """, {"user_id": current_user})
        
        frappe.db.commit()
        
        # Gửi real-time notification
        frappe.publish_realtime(
            event="missed_call_read",
            message={
                "all_read": True
            },
            user=current_user
        )
        
        print(f"📞 [API] Marked all missed calls as read for {current_user}")
        
        return {"success": True}
        
    except Exception as e:
        frappe.log_error(f"Error marking all missed calls as read: {str(e)}")
        print(f"❌ [API] Error marking all as read: {str(e)}")
        frappe.throw(_("Không thể đánh dấu tất cả đã đọc"))

@frappe.whitelist()
def get_missed_call_count():
    """
    Lấy số lượng missed calls chưa đọc
    """
    try:
        current_user = frappe.session.user
        
        count = frappe.db.count("Raven Missed Call", {
            "callee_id": current_user,
            "is_read": False
        })
        
        return {"count": count}
        
    except Exception as e:
        frappe.log_error(f"Error getting missed call count: {str(e)}")
        return {"count": 0}

@frappe.whitelist(methods=["POST"])
def delete_missed_call(call_id):
    """
    Xóa missed call
    """
    try:
        current_user = frappe.session.user
        
        # Kiểm tra quyền
        missed_call = frappe.get_doc("Raven Missed Call", call_id)
        if missed_call.callee_id != current_user:
            frappe.throw(_("Bạn không có quyền xóa cuộc gọi này"))
        
        # Xóa record
        frappe.delete_doc("Raven Missed Call", call_id, ignore_permissions=True)
        
        print(f"📞 [API] Deleted missed call: {call_id}")
        
        return {"success": True}
        
    except Exception as e:
        frappe.log_error(f"Error deleting missed call: {str(e)}")
        frappe.throw(_("Không thể xóa cuộc gọi"))

@frappe.whitelist(methods=["POST"]) 
def cleanup_old_missed_calls():
    """
    Dọn dẹp missed calls cũ (>30 ngày)
    """
    try:
        # Xóa missed calls cũ hơn 30 ngày
        frappe.db.sql("""
            DELETE FROM `tabRaven Missed Call`
            WHERE DATEDIFF(NOW(), creation) > 30
        """)
        
        frappe.db.commit()
        
        print(f"📞 [API] Cleaned up old missed calls")
        
        return {"success": True}
        
    except Exception as e:
        frappe.log_error(f"Error cleaning up old missed calls: {str(e)}")
        return {"success": False, "error": str(e)} 
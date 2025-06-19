# Copyright (c) 2025, The Commit Company (Algocode Technologies Pvt. Ltd.) and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.utils import now


@frappe.whitelist(allow_guest=False)
def save_fcm_token(fcm_token=None, platform="Web"):
    """
    Lưu FCM token cho user hiện tại
    """
    user = frappe.session.user
    
    # Xử lý cả JSON và form data
    if not fcm_token:
        # Thử lấy từ request data
        if frappe.request and hasattr(frappe.request, 'get_json'):
            try:
                data = frappe.request.get_json()
                fcm_token = data.get('fcm_token')
                platform = data.get('platform', 'Web')
            except:
                pass
    
    if not fcm_token:
        frappe.throw(_("FCM token is required"))
    
    if not user or user == "Guest":
        frappe.throw(_("User must be logged in"))
    
    try:
        # Chỉ insert nếu chưa có token này cho user
        existing = frappe.get_all(
            "FCM Token",
            filters={"user": user, "fcm_token": fcm_token},
            limit=1
        )
        if existing:
            frappe.logger().info(f"FCM token already exists for user: {user}")
            return {"success": True, "message": "FCM token already exists"}

        # Nếu chưa có thì insert mới
        doc = frappe.new_doc("FCM Token")
        doc.user = user
        doc.fcm_token = fcm_token
        doc.platform = platform
        doc.insert(ignore_permissions=True)
        frappe.logger().info(f"FCM token saved for user: {user}")
        return {"success": True, "message": "FCM token saved successfully"}
            
    except Exception as e:
        frappe.log_error(f"Error saving FCM token: {str(e)}", "FCM Token Error")
        frappe.throw(_(f"Error saving FCM token: {str(e)}"))


@frappe.whitelist(allow_guest=False)
def delete_fcm_token(fcm_token=None):
    """
    Xóa FCM token khi user logout
    """
    user = frappe.session.user
    
    # Xử lý cả JSON và form data
    if not fcm_token:
        if frappe.request and hasattr(frappe.request, 'get_json'):
            try:
                data = frappe.request.get_json()
                fcm_token = data.get('fcm_token')
            except:
                pass
    
    if not fcm_token:
        frappe.throw(_("FCM token is required"))
    
    if not user or user == "Guest":
        frappe.throw(_("User must be logged in"))
    
    try:
        # Tìm và xóa token
        existing = frappe.get_all(
            "FCM Token", 
            filters={"user": user, "fcm_token": fcm_token},
            limit=1
        )
        
        if existing:
            frappe.delete_doc("FCM Token", existing[0].name, ignore_permissions=True)
            frappe.logger().info(f"FCM token deleted for user: {user}")
            return {"success": True, "message": "FCM token deleted successfully"}
        else:
            frappe.logger().info(f"FCM token not found for user: {user}")
            return {"success": True, "message": "FCM token not found"}
            
    except Exception as e:
        frappe.log_error(f"Error deleting FCM token: {str(e)}", "FCM Token Error")
        frappe.throw(_(f"Error deleting FCM token: {str(e)}")) 
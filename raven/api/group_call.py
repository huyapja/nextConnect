import frappe
import json
from frappe import _
from typing import Dict, Any, List, Optional
from frappe.utils import now
import uuid

@frappe.whitelist()
def create_group_call(channel_id: str) -> Dict[str, Any]:
    """
    Tạo phòng gọi nhóm và gửi thông báo vào channel
    """
    try:
        # Kiểm tra xem channel có tồn tại không
        channel = frappe.get_doc("Raven Channel", channel_id)
        if not channel:
            frappe.throw(_("Channel not found"))
        
        # Kiểm tra xem user có quyền trong channel không
        if not has_channel_permission(channel_id, frappe.session.user):
            frappe.throw(_("You don't have permission to create group call in this channel"))
        
        # Tạo group call room ID
        room_id = f"group_call_{channel_id}_{uuid.uuid4().hex[:8]}"
        
        # Tạo GroupCall message
        message_doc = frappe.get_doc({
            "doctype": "Raven Message",
            "channel_id": channel_id,
            "text": f"{frappe.get_cached_value('User', frappe.session.user, 'full_name')} đã tạo phòng gọi nhóm",
            "message_type": "GroupCall",
            "group_call_room_id": room_id,
            "group_call_status": "active",
            "group_call_participants": json.dumps([frappe.session.user])
        })
        
        message_doc.insert()
        
        # Cập nhật last_message_details cho channel
        last_message = {
            "message_id": message_doc.name,
            "content": message_doc.text,
            "owner": message_doc.owner,
            "message_type": "GroupCall",
            "is_bot_message": 0,
            "bot": None,
        }
        
        frappe.db.set_value("Raven Channel", channel_id, {
            "last_message_details": frappe.as_json(last_message),
            "last_message_timestamp": message_doc.creation
        })
        
        # Gửi realtime event cho các thành viên khác
        members = frappe.get_all("Raven Channel Member", filters={"channel_id": channel_id}, pluck="user_id")
        for member in members:
            if member != frappe.session.user:
                frappe.publish_realtime(
                    event="new_message",
                    message={
                        "channel_id": channel_id,
                        "user": frappe.session.user,
                        "seen_at": frappe.utils.now_datetime(),
                    },
                    user=member
                )
        
        return {
            "success": True,
            "room_id": room_id,
            "message_id": message_doc.name,
            "message": "Group call created successfully"
        }
        
    except Exception as e:
        frappe.log_error(f"Error creating group call: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }

@frappe.whitelist()
def join_group_call(message_id: str) -> Dict[str, Any]:
    """
    Tham gia vào phòng gọi nhóm
    """
    try:
        # Lấy thông tin message
        message_doc = frappe.get_doc("Raven Message", message_id)
        if not message_doc or message_doc.message_type != "GroupCall":
            frappe.throw(_("Group call message not found"))
        
        # Kiểm tra trạng thái group call
        if message_doc.group_call_status != "active":
            frappe.throw(_("Group call has ended"))
        
        # Thêm user vào danh sách participants
        current_participants = json.loads(message_doc.group_call_participants or "[]")
        if frappe.session.user not in current_participants:
            current_participants.append(frappe.session.user)
            
            # Cập nhật message
            message_doc.group_call_participants = json.dumps(current_participants)
            message_doc.save(ignore_permissions=True)
        
        return {
            "success": True,
            "room_id": message_doc.group_call_room_id,
            "participants": current_participants
        }
        
    except Exception as e:
        frappe.log_error(f"Error joining group call: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }

@frappe.whitelist()
def leave_group_call(message_id: str) -> Dict[str, Any]:
    """
    Rời khỏi phòng gọi nhóm
    """
    try:
        # Lấy thông tin message
        message_doc = frappe.get_doc("Raven Message", message_id)
        if not message_doc or message_doc.message_type != "GroupCall":
            frappe.throw(_("Group call message not found"))
        
        # Xóa user khỏi danh sách participants
        current_participants = json.loads(message_doc.group_call_participants or "[]")
        if frappe.session.user in current_participants:
            current_participants.remove(frappe.session.user)
            
            # Nếu không còn ai trong phòng, kết thúc cuộc gọi
            if not current_participants:
                message_doc.group_call_status = "ended"
                
                # Gửi thông báo kết thúc cuộc gọi
                end_message = frappe.get_doc({
                    "doctype": "Raven Message",
                    "channel_id": message_doc.channel_id,
                    "text": "Cuộc gọi nhóm đã kết thúc",
                    "message_type": "Text"
                })
                end_message.insert()
            
            # Cập nhật message
            message_doc.group_call_participants = json.dumps(current_participants)
            message_doc.save(ignore_permissions=True)
        
        return {
            "success": True,
            "participants": current_participants,
            "call_ended": message_doc.group_call_status == "ended"
        }
        
    except Exception as e:
        frappe.log_error(f"Error leaving group call: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }

@frappe.whitelist()
def get_group_call_participants(message_id: str) -> Dict[str, Any]:
    """
    Lấy danh sách participants trong group call
    """
    try:
        message_doc = frappe.get_doc("Raven Message", message_id)
        if not message_doc or message_doc.message_type != "GroupCall":
            frappe.throw(_("Group call message not found"))
        
        participants = json.loads(message_doc.group_call_participants or "[]")
        
        # Lấy thông tin chi tiết của participants
        participant_details = []
        for user_id in participants:
            user_info = frappe.get_cached_value('User', user_id, ['full_name', 'user_image'], as_dict=True)
            if user_info:
                participant_details.append({
                    "user_id": user_id,
                    "full_name": user_info.full_name,
                    "user_image": user_info.user_image
                })
        
        return {
            "success": True,
            "participants": participant_details,
            "room_id": message_doc.group_call_room_id,
            "status": message_doc.group_call_status
        }
        
    except Exception as e:
        frappe.log_error(f"Error getting group call participants: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }

def has_channel_permission(channel_id: str, user_id: str) -> bool:
    """
    Kiểm tra xem user có quyền trong channel không
    """
    try:
        # Kiểm tra xem user có phải là thành viên của channel không
        member = frappe.db.exists("Raven Channel Member", {
            "channel_id": channel_id,
            "user_id": user_id
        })
        return bool(member)
    except:
        return False 
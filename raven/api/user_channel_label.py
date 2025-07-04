import frappe
from frappe import _

def _fail(title: str, message: str, code: int = 417):
    frappe.local.response.http_status_code = code
    frappe.local.response.type = "json"
    frappe.local.response.message = {
        "status": "error",
        "title": title,
        "message": message
    }
    raise frappe.ValidationError


@frappe.whitelist()
def add_label_to_multiple_channels(label_id, channel_ids):
    import json
    user = frappe.session.user

    if not label_id or not channel_ids:
        return _fail(
            title=_("Thiếu dữ liệu"),
            message=_("Cần cung cấp label_id và danh sách channel.")
        )

    try:
        channel_ids = json.loads(channel_ids)
    except Exception:
        return _fail(
            title=_("Dữ liệu không hợp lệ"),
            message=_("channel_ids phải là định dạng JSON list.")
        )

    if not isinstance(channel_ids, list):
        return _fail(
            title=_("Sai kiểu dữ liệu"),
            message=_("channel_ids phải là danh sách (list).")
        )

    duplicated_channels = []

    for channel_id in channel_ids:
        exists = frappe.db.exists("User Channel Label", {
            "label": label_id,
            "channel_id": channel_id,
            "user": user
        })
        if exists:
            channel_name = frappe.db.get_value("Raven Channel", channel_id, "channel_name") or channel_id
            duplicated_channels.append(channel_name)

    if duplicated_channels:
        return _fail(
            title=_("Không thể gán nhãn"),
            message=_("Các kênh sau đã được gán nhãn trước đó: {0}").format(", ".join(duplicated_channels)),
            code=409
        )

    for channel_id in channel_ids:
        frappe.get_doc({
            "doctype": "User Channel Label",
            "user": user,
            "channel_id": channel_id,
            "label": label_id
        }).insert(ignore_permissions=True)

    return {"status": "success"}


@frappe.whitelist()
def create_or_assign_label(label, channel_ids):
    import json
    user = frappe.session.user

    # Validate
    if not label or not channel_ids:
        return _fail(
            title=_("Thiếu dữ liệu"),
            message=_("Cần cung cấp tên nhãn và danh sách channel.")
        )

    try:
        channel_ids = json.loads(channel_ids)
    except Exception:
        return _fail(
            title=_("Dữ liệu không hợp lệ"),
            message=_("channel_ids phải là định dạng JSON list.")
        )

    if not isinstance(channel_ids, list):
        return _fail(
            title=_("Sai kiểu dữ liệu"),
            message=_("channel_ids phải là danh sách (list).")
        )

    trimmed_label = label.strip()
    if not trimmed_label:
        return _fail(title=_("Nhãn rỗng"), message=_("Vui lòng nhập tên nhãn hợp lệ."))

    if len(trimmed_label) > 60:
        return _fail(
            title=_("Nhãn quá dài"),
            message=_("Tên nhãn không vượt quá 60 ký tự.")
        )

    # Kiểm tra nhãn có tồn tại chưa
    existing_label = frappe.db.exists("User Label", {
        "label": trimmed_label,
        "owner": user
    })

    if not existing_label:
        new_label = frappe.get_doc({
            "doctype": "User Label",
            "label": trimmed_label,
            "owner": user
        })
        new_label.insert(ignore_permissions=True)
        label_id = new_label.name
    else:
        return {
            "status": "error",
            "message": "Label name already exists"
        }

    # Lọc channel chưa có nhãn để tránh lỗi duplicated
    new_assignments = []
    for channel_id in channel_ids:
        exists = frappe.db.exists("User Channel Label", {
            "label": label_id,
            "channel_id": channel_id,
            "user": user
        })
        if not exists:
            new_assignments.append(channel_id)

    # Gán nhãn cho các channel chưa có
    for channel_id in new_assignments:
        frappe.get_doc({
            "doctype": "User Channel Label",
            "user": user,
            "channel_id": channel_id,
            "label": label_id
        }).insert(ignore_permissions=True)

    return {
        "status": "success",
        "label_id": label_id,
        "assigned": new_assignments,
        "skipped": list(set(channel_ids) - set(new_assignments))
    }


@frappe.whitelist()
def remove_channel_from_label(label_id: str, channel_id: str):
    user = frappe.session.user

    frappe.db.delete('User Channel Label', {
        'user': user,
        'label': label_id,
        'channel_id': channel_id
    })

    return {'message': 'Đã xoá channel khỏi nhãn'}

import json
from datetime import timedelta
import frappe
from frappe import _
from frappe.query_builder import JoinType, Order
from frappe.query_builder.functions import Coalesce, Count, Max, Coalesce
from raven.api.raven_channel import create_direct_message_channel, get_peer_user_id
from raven.utils import get_channel_member, is_channel_member, track_channel_visit
import datetime
from frappe.utils import now_datetime, get_datetime
from pypika import Case

@frappe.whitelist(methods=["POST"])
def send_message(
    channel_id,
    text,
    is_reply=False,
    linked_message=None,
    json_content=None,
    send_silently=False,
    client_id=None  # <== Thêm client_id ở đây
):
    # Tạo tin nhắn mới
    doc_fields = {
        "doctype": "Raven Message",
        "channel_id": channel_id,
        "text": text,
        "message_type": "Text",
        "json": json_content,
    }

    if is_reply:
        doc_fields.update({
            "is_reply": True,
            "linked_message": linked_message
        })

    doc = frappe.get_doc(doc_fields)

    if send_silently:
        doc.flags.send_silently = True

    doc.insert()

    # ✅ RESET lại is_done = 0 cho các user đã từng đánh dấu là xong
    done_members = frappe.get_all(
        "Raven Channel Member",
        filters={"channel_id": channel_id, "is_done": 1},
        fields=["name", "user_id"]
    )

    if done_members:
        for member in done_members:
            frappe.db.set_value("Raven Channel Member", member.name, "is_done", 0)

            frappe.publish_realtime(
                event="raven:channel_done_updated",
                message={
                    "channel_id": channel_id,
                    "is_done": 0
                },
                user=member.user_id,
                after_commit=True
            )

    # ✅ Cập nhật nội dung cuối cùng của channel
    message_type = doc.message_type or "Text"
    content = text

    if message_type in ["File", "Image"] and json_content:
        filename = json_content.get("filename") or json_content.get("name") or "Tập tin"
        content = filename

    last_message = {
        "message_id": doc.name,
        "content": content,
        "owner": doc.owner,
        "message_type": message_type,
        "is_bot_message": 0,
        "bot": None,
    }

    frappe.db.set_value("Raven Channel", channel_id, {
        "last_message_details": frappe.as_json(last_message),
        "last_message_timestamp": doc.creation
    })

    # ✅ Gửi sự kiện realtime tới các user khác trong channel (không gửi cho người gửi)
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

    # ✅ Trả về message + client_id
    return {
        "message": doc.as_dict(),
        "client_id": client_id
    }

@frappe.whitelist()
def fetch_recent_files(channel_id):
	"""
	Fetches recently sent files in a channel
	Check if the user has permission to view the channel
	"""
	if not frappe.has_permission("Raven Channel", doc=channel_id):
		frappe.throw(_("You don't have permission to view this channel"), frappe.PermissionError)
	files = frappe.db.get_all(
		"Raven Message",
		filters={"channel_id": channel_id, "message_type": ["in", ["Image", "File"]]},
		fields=["name", "file", "owner", "creation", "message_type"],
		order_by="creation desc",
		limit_page_length=10,
	)

	return files


def get_messages(channel_id):

	messages = frappe.db.get_all(
		"Raven Message",
		filters={"channel_id": channel_id},
		fields=[
			"name",
			"owner",
			"creation",
			"modified",
			"text",
			"file",
			"message_type",
			"message_reactions",
			"is_reply",
			"linked_message",
			"_liked_by",
			"channel_id",
			"thumbnail_width",
			"thumbnail_height",
			"file_thumbnail",
			"link_doctype",
			"link_document",
			"replied_message_details",
			"content",
			"is_edited",
			"is_thread",
			"is_forwarded",
		],
		order_by="creation asc",
	)

	return messages


@frappe.whitelist()
def save_message(message_id, add=False, thread_id=None):
	from frappe.desk.like import toggle_like
	import json

	# Gắn cờ hoặc bỏ cờ
	toggle_like("Raven Message", message_id, add)

	# Lấy danh sách user đã like
	liked_by = frappe.db.get_value("Raven Message", message_id, "_liked_by")

	# Phát sự kiện realtime
	frappe.publish_realtime(
		"message_saved",
		{
			"message_id": message_id,
			"liked_by": liked_by,
		},
		user=frappe.session.user,
	)

	# ✅ Nếu là hành động Save và có thread_id -> ghi vào json.saved_from_thread
	if thread_id and not add == "No":
		doc = frappe.get_doc("Raven Message", message_id)
		json_data = doc.json or {}

		if isinstance(json_data, str):
			try:
				json_data = json.loads(json_data)
			except Exception:
				json_data = {}

		# Chỉ lưu nếu chưa có
		if "saved_from_thread" not in json_data:
			json_data["saved_from_thread"] = thread_id
			doc.json = json_data
			doc.flags.ignore_version = True
			doc.save(ignore_permissions=True)

	# ✅ Lấy message sau khi cập nhật
	message = frappe.db.get_value(
		"Raven Message",
		message_id,
		[
			"name", "owner", "creation", "text", "channel_id", "file", "message_type",
			"message_reactions", "_liked_by", "thumbnail_width", "thumbnail_height",
			"is_bot_message", "bot", "content", "json"
		],
		as_dict=True,
	)

	# ✅ Nếu có thread_id, thay thế channel_id trả về thành channel của message thread cha
	if thread_id and message:
		parent_channel_id = frappe.db.get_value("Raven Message", thread_id, "channel_id")
		if parent_channel_id:
			message["channel_id"] = parent_channel_id

	# ✅ Lấy workspace của channel_id (sau khi chỉnh sửa)
	if message and message.get("channel_id"):
		message["workspace"] = frappe.db.get_value("Raven Channel", message["channel_id"], "workspace")

	# ✅ Bóc saved_from_thread từ json ra ngoài response
	if message and message.get("json"):
		try:
			json_data = json.loads(message["json"]) if isinstance(message["json"], str) else message["json"]
			saved_from_thread = json_data.get("saved_from_thread")
			if saved_from_thread:
				message["saved_from_thread"] = saved_from_thread
		except Exception:
			pass

	# ✅ Xóa trường json khỏi response nếu không cần
	message.pop("json", None)

	return message

@frappe.whitelist()
def get_pinned_messages(channel_id):

	# check if the user has permission to view the channel
	frappe.has_permission("Raven Channel", doc=channel_id, ptype="read", throw=True)

	pinnedMessagesString = frappe.db.get_value("Raven Channel", channel_id, "pinned_messages_string")
	pinnedMessages = pinnedMessagesString.split("\n") if pinnedMessagesString else []

	return frappe.db.get_all(
		"Raven Message",
		filters={"name": ["in", pinnedMessages]},
		fields=[
			"name",
			"owner",
			"creation",
			"bot",
			"text",
			"file",
			"message_type",
			"message_reactions",
			"_liked_by",
			"channel_id",
			"thumbnail_width",
			"thumbnail_height",
			"file_thumbnail",
			"link_doctype",
			"link_document",
			"replied_message_details",
			"hide_link_preview",
			"is_bot_message",
			"content",
			"is_edited",
			"is_thread",
			"is_forwarded",
		],
		order_by="creation asc",
	)
import frappe
from pypika.enums import JoinType

@frappe.whitelist()
def get_saved_messages():
	"""
	Lấy danh sách tất cả các tin nhắn được đánh dấu (liked/flagged) bởi người dùng hiện tại.
	Không sắp xếp để giữ đúng thứ tự lưu trong hệ thống (nếu cần thứ tự khác, xử lý tại frontend).
	"""

	raven_message = frappe.qb.DocType("Raven Message")
	raven_channel = frappe.qb.DocType("Raven Channel")
	raven_channel_member = frappe.qb.DocType("Raven Channel Member")

	query = (
		frappe.qb.from_(raven_message)
		.join(raven_channel, JoinType.left)
		.on(raven_message.channel_id == raven_channel.name)
		.join(raven_channel_member, JoinType.left)
		.on(raven_channel.name == raven_channel_member.channel_id)
		.select(
			raven_message.name,
			raven_message.owner,
			raven_message.creation,
			Case()
			.when(raven_message.is_retracted == 1, None)
			.else_(raven_message.text)
			.as_('text'),
			raven_message.channel_id,
			raven_message.file,
			raven_message.message_type,
			raven_message.message_reactions,
			raven_message._liked_by,
			raven_channel.workspace,
			raven_message.thumbnail_width,
			raven_message.thumbnail_height,
			raven_message.is_bot_message,
			raven_message.bot,
			Case()
			.when(raven_message.is_retracted == 1, None)
			.else_(raven_message.content)
			.as_('content'),
			raven_message.is_retracted,
			raven_message.json
		)
		.where(raven_message._liked_by.like(f"%{frappe.session.user}%"))
		.where(
			(raven_channel.type.isin(["Open", "Public"]))
			| (raven_channel_member.user_id == frappe.session.user)
		)
		.distinct()
	)

	messages = query.run(as_dict=True)

	# Parse thêm saved_from_thread
	for msg in messages:
		json_data = msg.get("json")
		if isinstance(json_data, str):
			try:
				json_data = json.loads(json_data)
			except Exception:
				json_data = {}
		elif not isinstance(json_data, dict):
			json_data = {}

		saved_from_thread = json_data.get("saved_from_thread")
		msg["saved_from_thread"] = saved_from_thread
		msg.pop("json", None)

		if saved_from_thread:
			parent_channel_id = frappe.get_cached_value("Raven Message", saved_from_thread, "channel_id")
			if parent_channel_id:
				msg["channel_id"] = parent_channel_id

	return messages


def parse_messages(messages):

	messages_with_date_header = []
	previous_message = None

	for i in range(len(messages)):
		message = messages[i]
		is_continuation = (
			previous_message
			and message["owner"] == previous_message["owner"]
			and (message["creation"] - previous_message["creation"]) < timedelta(minutes=2)
		)
		message["is_continuation"] = int(bool(is_continuation))

		if i == 0 or message["creation"].date() != previous_message["creation"].date():
			messages_with_date_header.append({"block_type": "date", "data": message["creation"].date()})

		messages_with_date_header.append({"block_type": "message", "data": message})

		previous_message = message

	return messages_with_date_header


def check_permission(channel_id):
	if frappe.get_cached_value("Raven Channel", channel_id, "type") == "Private":
		if is_channel_member(channel_id):
			pass
		elif frappe.session.user == "Administrator":
			pass
		else:
			frappe.throw(_("You don't have permission to view this channel"), frappe.PermissionError)


@frappe.whitelist()
def get_messages_with_dates(channel_id):
	check_permission(channel_id)
	messages = get_messages(channel_id)
	track_channel_visit(channel_id=channel_id, publish_event_for_user=True, commit=True)
	return parse_messages(messages)


@frappe.whitelist()
def get_unread_count_for_channels():
    """
    Trả về danh sách các channel mà user đang tham gia,
    kèm theo số lượng tin nhắn chưa đọc và nội dung message mới nhất.
    """
    user = frappe.session.user

    # Define DocTypes
    channel = frappe.qb.DocType("Raven Channel")
    channel_member = frappe.qb.DocType("Raven Channel Member")
    message = frappe.qb.DocType("Raven Message")

    # --- Query 1: Lấy số lượng tin nhắn chưa đọc ---
    unread_query = (
        frappe.qb.from_(channel)
        .left_join(channel_member).on(
            (channel.name == channel_member.channel_id) & (channel_member.user_id == user)
        )
        .left_join(message).on(
            (channel.name == message.channel_id)
            & (message.message_type != "System")
            & (message.creation > Coalesce(channel_member.last_visit, "2000-11-11"))
        )
        .where(channel_member.user_id == user)
        .where(channel.is_archived == 0)
        .where(channel.is_thread == 0)
        .select(
            channel.name.as_("channel"),
            channel.is_direct_message,
            Count(message.name).as_("unread_count")
        )
        .groupby(channel.name, channel.is_direct_message)
    ).run(as_dict=True)

    # --- Query 2: Lấy message mới nhất (chỉ content) cho mỗi channel ---
    latest_messages = (
        frappe.qb.from_(message)
        .select(
            message.channel_id,
            message.content,
            Max(message.creation).as_("latest_time")
        )
        .where(message.message_type != "System")
        .groupby(message.channel_id, message.content)
    ).run(as_dict=True)

    # Convert to dict: {channel_id: content}
    latest_content_map = {}
    for msg in latest_messages:
        cid = msg["channel_id"]
        if cid not in latest_content_map or msg["latest_time"] > latest_content_map[cid]["latest_time"]:
            latest_content_map[cid] = {
                "content": msg["content"],
                "latest_time": msg["latest_time"]
            }

    # Gộp kết quả
    for row in unread_query:
        row["name"] = row.pop("channel")
        row["last_message_content"] = latest_content_map.get(row["name"], {}).get("content", "")
    # Lọc chỉ lấy những channel có unread_count > 0
    filtered_result = [row for row in unread_query if row["unread_count"] > 0]

    return filtered_result

# @frappe.whitelist()
# def get_unread_count_for_channels():
#     """
#     Trả về danh sách các channel mà user đang tham gia,
#     kèm theo:
#       - số lượng tin nhắn chưa đọc
#       - nội dung tin nhắn mới nhất
#       - thời gian gửi tin nhắn mới nhất (last_message_timestamp)
#       - peer_user_id nếu là tin nhắn riêng (DM)
#       - tên channel (channel_name)
#     """
#     user = frappe.session.user

#     # Define DocTypes
#     channel = frappe.qb.DocType("Raven Channel")
#     channel_member = frappe.qb.DocType("Raven Channel Member")
#     message = frappe.qb.DocType("Raven Message")

#     # --- Query 1: Lấy số lượng tin nhắn chưa đọc ---
#     unread_query = (
#         frappe.qb.from_(channel)
#         .left_join(channel_member).on(
#             (channel.name == channel_member.channel_id) & (channel_member.user_id == user)
#         )
#         .left_join(message).on(
#             (channel.name == message.channel_id)
#             & (message.message_type != "System")
#             & (message.creation > Coalesce(channel_member.last_visit, "2000-11-11"))
#         )
#         .where(channel_member.user_id == user)
#         .where(channel.is_archived == 0)
#         .where(channel.is_thread == 0)
#         .select(
#             channel.name.as_("channel"),
#             channel.channel_name.as_("channel_name"),
#             channel.is_direct_message,
#             Count(message.name).as_("unread_count")
#         )
#         .groupby(channel.name, channel.channel_name, channel.is_direct_message)
#     ).run(as_dict=True)

#     # --- Query 2: Lấy nội dung và thời gian của tin nhắn mới nhất mỗi channel ---
#     latest_messages = (
#         frappe.qb.from_(message)
#         .select(
#             message.channel_id,
#             message.content,
#             Max(message.creation).as_("latest_time")
#         )
#         .where(message.message_type != "System")
#         .groupby(message.channel_id, message.content)
#     ).run(as_dict=True)

#     # Dựng map: channel_id -> { content, latest_time }
#     latest_content_map = {}
#     for msg in latest_messages:
#         cid = msg["channel_id"]
#         if cid not in latest_content_map or msg["latest_time"] > latest_content_map[cid]["latest_time"]:
#             latest_content_map[cid] = {
#                 "content": msg["content"],
#                 "latest_time": msg["latest_time"]
#             }

#     # --- Tổng hợp kết quả ---
#     result = []
#     for row in unread_query:
#         row["name"] = row.pop("channel")

#         latest_info = latest_content_map.get(row["name"], {})
#         row["last_message_content"] = latest_info.get("content", "")
#         row["last_message_timestamp"] = latest_info.get("latest_time", None)

#         # Nếu là direct message, lấy peer_user_id
#         if row["is_direct_message"] == 1:
#             peer_user = frappe.db.get_value(
#                 "Raven Channel Member",
#                 {
#                     "channel_id": row["name"],
#                     "user_id": ["!=", user]
#                 },
#                 "user_id"
#             )
#             row["peer_user_id"] = peer_user
#         else:
#             row["peer_user_id"] = None

#         if row["unread_count"] > 0:
#             result.append(row)

#     # Sort the result by last_message_timestamp (newest first)
#     result.sort(key=lambda x: x["last_message_timestamp"], reverse=True)

#     return result


# @frappe.whitelist()
# def get_unread_count_for_channel(channel_id):
# 	channel_member = get_channel_member(channel_id=channel_id)
# 	if channel_member:
# 		last_timestamp = frappe.get_cached_value(
# 			"Raven Channel Member", channel_member["name"], "last_visit"
# 		)

# 		return frappe.db.count(
# 			"Raven Message",
# 			filters={
# 				"channel_id": channel_id,
# 				"creation": (">", last_timestamp),
# 				"message_type": ["!=", "System"],
# 			},
# 		)
# 	else:
# 		if frappe.get_cached_value("Raven Channel", channel_id, "type") == "Open":
# 			return frappe.db.count(
# 				"Raven Message",
# 				filters={
# 					"channel_id": channel_id,
# 					"message_type": ["!=", "System"],
# 				},
# 			)
# 		else:
# 			return 0

@frappe.whitelist()
def get_unread_count_for_channel(channel_id):
    user = frappe.session.user

    # Lấy thông tin channel
    channel_doc = frappe.get_cached_doc("Raven Channel", channel_id)

    # Lấy thời gian last_visit
    last_visit = frappe.db.get_value(
        "Raven Channel Member",
        {"channel_id": channel_id, "user_id": user},
        "last_visit"
    ) or "2000-11-11"

    # Tính số tin chưa đọc
    if channel_doc.is_direct_message or frappe.db.exists("Raven Channel Member", {"channel_id": channel_id, "user_id": user}):
        unread_count = frappe.db.count(
            "Raven Message",
            filters={
                "channel_id": channel_id,
                "creation": (">", last_visit),
                "message_type": ["!=", "System"],
            },
        )
    elif channel_doc.type == "Open":
        unread_count = frappe.db.count(
            "Raven Message",
            filters={
                "channel_id": channel_id,
                "message_type": ["!=", "System"],
            },
        )
    else:
        unread_count = 0

    # Lấy message mới nhất
    latest_msg = frappe.db.sql(
        """
        SELECT content, creation, owner
        FROM `tabRaven Message`
        WHERE channel_id = %s AND message_type != 'System'
        ORDER BY creation DESC
        LIMIT 1
        """,
        (channel_id,),
        as_dict=True,
    )
    latest = latest_msg[0] if latest_msg else {}
    content = latest.get("content", "")
    timestamp = latest.get("creation")
    sender_id = latest.get("owner")

    sender_name = None
    sender_image = None
    if sender_id:
        user_doc = frappe.get_cached_doc("Raven User", sender_id)
        sender_name = user_doc.full_name
        sender_image = user_doc.user_image

    # Xây dựng kết quả
    result = {
        "name": channel_id,
        "channel_name": channel_doc.channel_name,
        "unread_count": unread_count,
        "last_message_content": content,
        "last_message_timestamp": timestamp,
        "last_message_sender_id": sender_id,
        "last_message_sender_name": sender_name,
        "last_message_sender_image": sender_image,
        "is_direct_message": 1 if channel_doc.is_direct_message else 0,
    }

    # Nếu là DM thì lấy peer_user_id, nếu là group thì lấy danh sách peer_user_ids
    if channel_doc.is_direct_message:
        peer_user_id = frappe.db.get_value(
            "Raven Channel Member",
            filters={"channel_id": channel_id, "user_id": ["!=", user]},
            fieldname="user_id"
        )
        result["peer_user_id"] = peer_user_id
    else:
        peer_user_ids = frappe.get_all(
            "Raven Channel Member",
            filters={"channel_id": channel_id, "user_id": ["!=", user]},
            pluck="user_id"
        )
        result["peer_user_ids"] = peer_user_ids

    return result


@frappe.whitelist()
def get_timeline_message_content(doctype, docname):
	channel = frappe.qb.DocType("Raven Channel")
	channel_member = frappe.qb.DocType("Raven Channel Member")
	message = frappe.qb.DocType("Raven Message")
	user = frappe.qb.DocType("User")
	query = (
		frappe.qb.from_(message)
		.select(
			message.creation,
			message.owner,
			message.name,
			message.text,
			message.file,
			channel.name.as_("channel_id"),
			channel.channel_name,
			channel.type,
			channel.is_direct_message,
			user.full_name,
			channel.is_self_message,
		)
		.join(channel)
		.on(message.channel_id == channel.name)
		.join(channel_member)
		.on(
			(message.channel_id == channel_member.channel_id) & (message.owner == channel_member.user_id)
		)
		.join(user)
		.on(message.owner == user.name)
		.where((channel.type != "Private") | (channel_member.user_id == frappe.session.user))
		.where(message.link_doctype == doctype)
		.where(message.link_document == docname)
	)
	data = query.run(as_dict=True)

	timeline_contents = []
	for log in data:

		if log.is_direct_message:
			peer_user_id = get_peer_user_id(log.channel_id, log.is_direct_message, log.is_self_message)
			if peer_user_id:
				log["peer_user"] = frappe.db.get_value("User", peer_user_id, "full_name")
		timeline_contents.append(
			{
				"icon": "share",
				"is_card": True,
				"creation": log.creation,
				"template": "send_message",
				"template_data": log,
			}
		)

	return timeline_contents


file_extensions = {
	"doc": [
		"doc",
		"docx",
		"odt",
		"ott",
		"rtf",
		"txt",
		"dot",
		"dotx",
		"docm",
		"dotm",
		"pages",
	],
	"ppt": [
		"ppt",
		"pptx",
		"odp",
		"otp",
		"pps",
		"ppsx",
		"pot",
		"potx",
		"pptm",
		"ppsm",
		"potm",
		"ppam",
		"ppa",
		"key",
	],
	"xls": [
		"xls",
		"xlsx",
		"csv",
		"ods",
		"ots",
		"xlsb",
		"xlsm",
		"xlt",
		"xltx",
		"xltm",
		"xlam",
		"xla",
		"numbers",
	],
}


@frappe.whitelist()
def get_all_files_shared_in_channel(
	channel_id, file_name=None, file_type=None, start_after=0, page_length=None
):

	# check if the user has permission to view the channel
	check_permission(channel_id)

	message = frappe.qb.DocType("Raven Message")
	user = frappe.qb.DocType("Raven User")
	file = frappe.qb.DocType("File")

	query = (
		frappe.qb.from_(message)
		.join(file)
		.on(message.name == file.attached_to_name)
		.join(user)
		.on(message.owner == user.name)
		.select(
			file.name,
			file.file_name,
			file.file_type,
			file.file_size,
			file.file_url,
			message.owner,
			message.creation,
			message.message_type,
			message.thumbnail_width,
			message.thumbnail_height,
			message.file_thumbnail,
			user.full_name,
			user.user_image,
			message.name.as_("message_id"),
		)
		.where(message.channel_id == channel_id)
	)

	# search for file name
	if file_name:
		query = query.where(file.file_name.like("%" + file_name + "%"))

	# search for file type
	if file_type:
		if file_type == "image":
			query = query.where(message.message_type == "Image")
		elif file_type == "file":
			query = query.where(message.message_type == "File")
		elif file_type == "pdf":
			query = query.where(file.file_type == "pdf")
		else:
			# Get the list of extensions for the given file type
			extensions = file_extensions.get(file_type)
			if extensions:
				query = query.where((file.file_type).isin(extensions))
	else:
		query = query.where(message.message_type.isin(["Image", "File"]))

	files = (
		query.orderby(message.creation, order=Order["desc"])
		.limit(page_length)
		.offset(start_after)
		.run(as_dict=True)
	)

	return files


@frappe.whitelist()
def get_count_for_pagination_of_files(channel_id, file_name=None, file_type=None):

	# check if the user has permission to view the channel
	check_permission(channel_id)

	message = frappe.qb.DocType("Raven Message")
	# user = frappe.qb.DocType("Raven User")
	file = frappe.qb.DocType("File")

	query = (
		frappe.qb.from_(message)
		.join(file, JoinType.left)
		.on(message.name == file.attached_to_name)
		.select(Count(message.name).as_("count"))
		.where(message.channel_id == channel_id)
	)

	# search for file name
	if file_name:
		query = query.where(file.file_name.like("%" + file_name + "%"))

	# search for file type
	if file_type:
		if file_type == "image":
			query = query.where(message.message_type == "Image")
		elif file_type == "pdf":
			query = query.where(file.file_type == "pdf")
		else:
			# Get the list of extensions for the given file type
			extensions = file_extensions.get(file_type)
			if extensions:
				query = query.where((file.file_type).isin(extensions))
	else:
		query = query.where(message.message_type.isin(["Image", "File"]))
	count = query.run(as_dict=True)

	return count[0]["count"]


@frappe.whitelist(methods=["POST"])
def forward_message(message_receivers, forwarded_message):
	"""
	Forward a message to multiple users/ or in multiple channels
	"""
	for receiver in message_receivers:
		if receiver["type"] == "User":
			# send forwarded message as a DM to the user
			# get DM channel ID, create a copy of the message and send it to the channel, change the message owner to current sender
			dm_channel_id = create_direct_message_channel(receiver["name"])
			add_forwarded_message_to_channel(dm_channel_id, forwarded_message)
		else:
			# send forwarded message to the channel
			add_forwarded_message_to_channel(receiver["name"], forwarded_message)

	return "messages forwarded"

def add_forwarded_message_to_channel(channel_id, forwarded_message):
    """
    Forward a message to a channel - copy over the message,
    change the owner to the current user and timestamp to now,
    mark it as forwarded
    """
    # Thời gian hiện tại dùng đồng nhất
    now_ts = frappe.utils.now_datetime()

    # Nếu có file → bỏ ?fid
    if forwarded_message.get("file"):
        forwarded_message["file"] = forwarded_message["file"].split("?")[0]

    # Tạo bản sao message mới
    doc = frappe.get_doc(
        {
            "doctype": "Raven Message",
            **forwarded_message,
            "channel_id": channel_id,
            "name": None,
            "owner": frappe.session.user,
            "creation": now_ts,
            "modified": now_ts,
            "is_continuation": 0,
            "is_edited": 0,
            "is_reply": 0,
            "is_forwarded": 1,
            "is_thread": 0,
            "replied_message_details": None,
            "message_reactions": None,
        }
    )
    doc.insert()

    # ✅ Batch RESET is_done = 0 (1 query)
    done_members = frappe.get_all(
        "Raven Channel Member",
        filters={"channel_id": channel_id, "is_done": 1},
        fields=["user_id"]
    )

    if done_members:
        frappe.db.sql("""
            UPDATE `tabRaven Channel Member`
            SET is_done = 0
            WHERE channel_id = %s AND is_done = 1
        """, (channel_id,))

        for member in done_members:
            frappe.publish_realtime(
                event="raven:channel_done_updated",
                message={"channel_id": channel_id, "is_done": 0},
                user=member.user_id,
                after_commit=True
            )

    # ✅ Chuẩn bị nội dung hiển thị
    message_type = doc.message_type or "Text"
    content = doc.text or "tin nhắn forward"  # fallback tránh rỗng

    if message_type in ["File", "Image"] and doc.json:
        json_content = frappe.parse_json(doc.json)
        filename = json_content.get("filename") or json_content.get("name") or "Tập tin"
        content = filename

    last_message = {
        "message_id": doc.name,
        "content": content,
        "owner": doc.owner,
        "message_type": message_type,
        "is_bot_message": 0,
        "bot": None,
    }

    # ✅ Update Raven Channel
    frappe.db.set_value("Raven Channel", channel_id, {
        "last_message_details": frappe.as_json(last_message),
        "last_message_timestamp": now_ts
    })

    # ✅ Bắn realtime new_message cho các user khác (trừ sender)
    members = frappe.get_all("Raven Channel Member", filters={"channel_id": channel_id}, pluck="user_id")
    other_members = [user for user in members if user != frappe.session.user]

    for member in other_members:
        frappe.publish_realtime(
            event="new_message",
            message={
                "channel_id": channel_id,
                "user": frappe.session.user,
                "seen_at": now_ts,
            },
            user=member
        )
        
    return "message forwarded"


@frappe.whitelist()
def retract_message(message_id: str):

    message = frappe.get_doc("Raven Message", message_id)

    if message.is_retracted:
        frappe.throw(_("Tin nhắn đã được thu hồi trước đó."))

    message_time = get_datetime(message.creation)
    current_time = now_datetime()
    time_difference = current_time - message_time

    if time_difference.total_seconds() > 3 * 3600:
        frappe.throw(_("Bạn chỉ có thể thu hồi tin nhắn trong vòng 3 giờ sau khi gửi."))

    last_message_id = frappe.db.get_value(
        "Raven Message",
        filters={
            "channel_id": message.channel_id,
            "is_retracted": 0
        },
        fieldname="name",
        order_by="creation desc"
    )
    is_last_message = last_message_id == message.name

    message.db_set("is_retracted", 1)
    if is_last_message:
        fallback_message = {
            "message_id": message.name,
            "content": "Tin nhắn đã được thu hồi",
            "owner": message.owner,
            "message_type": message.message_type,
            "is_bot_message": 0,
            "bot": None,
        }

        frappe.db.set_value("Raven Channel", message.channel_id, {
            "last_message_details": frappe.as_json(fallback_message),
            "last_message_timestamp": message.creation
        })

    frappe.publish_realtime(
        event="raven_message_retracted",
        message={
            "message_id": message.name,
            "channel_id": message.channel_id,
            "is_thread": message.is_thread,
            "is_last_message": is_last_message,
            "owner": message.owner,
            "message_type": message.message_type,
            "is_bot_message": message.is_bot_message,
            "bot": message.bot,
            "timestamp": message.creation.isoformat()
        },
        doctype="Raven Channel",
        after_commit=True
    )

    return {"message": "Đã thu hồi tin nhắn"}


@frappe.whitelist(methods=["POST"])
def send_call_history_message(channel_id, call_type, call_status, duration=None):
    """
    Gửi tin nhắn lịch sử cuộc gọi vào channel
    
    Args:
        channel_id: ID của channel
        call_type: "audio" hoặc "video" 
        call_status: "completed", "missed", "rejected", "ended"
        duration: Thời lượng cuộc gọi (giây) nếu cuộc gọi thành công
    """
    
    # Tạo nội dung tin nhắn với icon và format đẹp
    if call_type == "audio":
        icon = "📞"
        call_type_text = "Audio"
    else:
        icon = "📹" 
        call_type_text = "Video"
    
    if call_status == "missed":
        # Cuộc gọi nhỡ - màu đỏ
        content = f'<div style="color: #e74c3c; font-weight: 500;">{icon} Cuộc gọi {call_type_text.lower()} nhỡ</div>'
        text_content = f"{icon} Cuộc gọi {call_type_text.lower()} nhỡ"
    elif call_status in ["completed", "ended"] and duration:
        # Cuộc gọi thành công - màu xanh lá  
        duration_formatted = format_call_duration(duration)
        content = f'<div style="color: #27ae60; font-weight: 500;">{icon} Gọi {call_type_text.lower()} - {duration_formatted}</div>'
        text_content = f"{icon} Gọi {call_type_text.lower()} - {duration_formatted}"
    else:
        # Cuộc gọi bị từ chối hoặc kết thúc - màu xám
        content = f'<div style="color: #7f8c8d; font-weight: 500;">{icon} Cuộc gọi {call_type_text.lower()} đã kết thúc</div>'
        text_content = f"{icon} Cuộc gọi {call_type_text.lower()} đã kết thúc"

    # Tạo tin nhắn với type System để không tính vào unread count
    doc_fields = {
        "doctype": "Raven Message",
        "channel_id": channel_id,
        "text": text_content,
        "content": content,
        "message_type": "System",  # Sử dụng System type để hiển thị khác biệt
    }

    doc = frappe.get_doc(doc_fields)
    doc.flags.send_silently = True  # Gửi thầm lặng, không notification
    doc.insert()

    # Cập nhật last message của channel
    last_message = {
        "message_id": doc.name,
        "content": text_content,
        "owner": doc.owner,
        "message_type": "System",
        "is_bot_message": 0,
        "bot": None,
    }

    frappe.db.set_value("Raven Channel", channel_id, {
        "last_message_details": frappe.as_json(last_message),
        "last_message_timestamp": doc.creation
    })

    # Gửi realtime event để update UI
    frappe.publish_realtime(
        "new_message",
        {
            "channel_id": channel_id,
            "message_id": doc.name,
            "user": frappe.session.user,
            "type": "call_history"
        },
        doctype="Raven Channel",
        docname=channel_id,
        after_commit=True
    )

    return {"message_id": doc.name, "success": True}

def format_call_duration(duration_seconds):
    """Format thời lượng cuộc gọi từ giây sang MM:SS"""
    if not duration_seconds:
        return "00:00"
    
    minutes = int(duration_seconds // 60)
    seconds = int(duration_seconds % 60)
    return f"{minutes:02d}:{seconds:02d}"

@frappe.whitelist(methods=["POST"])
def find_dm_channel_between_users(user1, user2):
    """
    Tìm DM channel giữa 2 user, tự động convert Raven User ID sang Frappe User ID nếu cần
    
    Args:
        user1: User ID (có thể là Raven User ID hoặc Frappe User ID)
        user2: User ID (có thể là Raven User ID hoặc Frappe User ID)
    
    Returns:
        channel_id hoặc None nếu không tìm thấy
    """
    def get_frappe_user_id(user_id):
        """Convert Raven User ID to Frappe User ID if needed"""
        # Nếu đã là Frappe User ID (có @ hoặc là Administrator), trả về nguyên
        if '@' in user_id or user_id == 'Administrator' or user_id == 'Guest':
            return user_id
            
        # Nếu là Raven User ID, tìm Frappe User ID tương ứng
        frappe_user = frappe.db.get_value("Raven User", user_id, "user")
        return frappe_user if frappe_user else user_id
    
    # Convert cả 2 user ID sang Frappe User ID
    frappe_user1 = get_frappe_user_id(user1)
    frappe_user2 = get_frappe_user_id(user2)
    
    if not frappe_user1 or not frappe_user2:
        return None
    
    # Tìm channel với 2 format có thể có
    channel_id = frappe.db.get_value(
        "Raven Channel",
        filters={
            "is_direct_message": 1,
            "channel_name": [
                "in",
                [frappe_user1 + " _ " + frappe_user2, frappe_user2 + " _ " + frappe_user1],
            ],
        },
        fieldname="name",
    )
    
    return channel_id

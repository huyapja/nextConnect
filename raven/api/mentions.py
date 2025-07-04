import frappe
from frappe import _
from frappe.query_builder import Order
from frappe.query_builder.functions import Count


@frappe.whitelist(methods=["POST"])
def get_mentions(limit: int = 10, start: int = 0):
	"""
	Get the messages where the current user is mentioned - ordered by creation date
	Also update the last mention viewed date if the start is 0
	"""

	# Max number of mentions that we will return is 100
	if start >= 100:
		return []

	mention = frappe.qb.DocType("Raven Mention")
	message = frappe.qb.DocType("Raven Message")
	channel = frappe.qb.DocType("Raven Channel")
	channel_member = frappe.qb.DocType("Raven Channel Member")

	query = (
		frappe.qb.from_(mention)
		.select(
			mention.name.as_("mention_id"),
			message.name,
			message.channel_id,
			channel.type.as_("channel_type"),
			channel.channel_name,
			channel.workspace,
			channel.is_thread,
			channel.is_direct_message,
			message.creation,
			message.message_type,
			message.owner,
			message.text,
			mention.is_hidden,
			mention.is_read
		)
		.left_join(message)
		.on(mention.parent == message.name)
		.left_join(channel)
		.on(message.channel_id == channel.name)
		.left_join(channel_member)
		.on(
			(channel.name == channel_member.channel_id) & (channel_member.user_id == frappe.session.user)
		)
		.where(mention.user == frappe.session.user)
		.where(message.owner != frappe.session.user)
		.where(channel_member.user_id == frappe.session.user)
		.where(mention.is_hidden != 1)
		.where(message.is_retracted != 1)
		.orderby(message.creation, order=Order.desc)
		.limit(limit)
		.offset(start)
	)

	result = query.run(as_dict=True)

	# if start == 0:
	# 	frappe.db.set_value(
	# 		"Raven User",
	# 		{"user": frappe.session.user},
	# 		"last_mention_viewed_on",
	# 		frappe.utils.get_datetime(),
	# 		update_modified=False,
	# 	)
	return result


@frappe.whitelist(methods=["GET"])
def get_unread_mention_count():
	"""
	Get the number of unread mentions (is_read = 0)
	"""

	mention = frappe.qb.DocType("Raven Mention")
	message = frappe.qb.DocType("Raven Message")
	channel = frappe.qb.DocType("Raven Channel")
	channel_member = frappe.qb.DocType("Raven Channel Member")

	query = (
		frappe.qb.from_(mention)
		.select(Count(mention.name).as_("mention_count"))
		.left_join(message).on(mention.parent == message.name)
		.left_join(channel).on(message.channel_id == channel.name)
		.left_join(channel_member).on(
			(channel.name == channel_member.channel_id)
			& (channel_member.user_id == frappe.session.user)
		)
		.where(mention.user == frappe.session.user)
		.where(mention.is_read != 1)
        .where(mention.is_hidden != 1)
		.where(channel_member.user_id == frappe.session.user)
		.where(message.owner != frappe.session.user)
		.where(message.is_retracted != 1)
	)

	result = query.run(as_dict=True)
	return result[0].mention_count if result else 0

@frappe.whitelist(methods=["POST"])
def toggle_mention_hidden():
    data = frappe.request.json or {}
    mention_id = data.get("mention_id")

    if not mention_id:
        frappe.throw("Missing mention_id")

    current_status = frappe.db.get_value("Raven Mention", mention_id, "is_hidden")
    if current_status is None:
        frappe.throw(f"Mention {mention_id} not found")

    new_status = 0 if current_status else 1

    frappe.db.set_value("Raven Mention", mention_id, "is_hidden", new_status)

    return {
        "status": "success",
        "mention_id": mention_id,
        "is_hidden": new_status
    }

@frappe.whitelist(methods=["POST"])
def mark_mention_as_read():
    data = frappe.request.json or {}
    mention_id = data.get("mention_id")

    if not mention_id:
        frappe.throw("Missing mention_id")

    frappe.db.set_value("Raven Mention", mention_id, "is_read", 1)

    return {
        "status": "success",
        "mention_id": mention_id,
        "is_read": 1
    }

@frappe.whitelist(methods=["POST"])
def hide_all_mentions():
    """Ẩn nhanh toàn bộ lượt nhắc của người dùng hiện tại."""
    # Update tất cả mention chưa ẩn thành ẩn
    frappe.db.sql(
        """
        UPDATE `tabRaven Mention`
        SET is_hidden = 1
        WHERE `user` = %s AND IFNULL(is_hidden, 0) != 1
        """,
        (frappe.session.user,),
    )

    # Reset bộ đếm cache (nếu có) – tuỳ triển khai cụ thể
    return {
        "status": "success",
    }

@frappe.whitelist(methods=["POST"])
def mark_channel_mentions_as_read():
    """Đánh dấu toàn bộ lượt nhắc của người dùng hiện tại trong 1 kênh là đã đọc."""
    data = frappe.request.json or {}
    channel_id = data.get("channel_id")

    if not channel_id:
        frappe.throw("Missing channel_id")

    # Cập nhật tất cả mention thuộc channel và user chưa đọc => đã đọc
    frappe.db.sql(
        """
        UPDATE `tabRaven Mention` rm
        JOIN `tabRaven Message` msg ON rm.parent = msg.name
        SET rm.is_read = 1
        WHERE rm.user = %s
          AND msg.channel_id = %s
          AND IFNULL(rm.is_read, 0) != 1
          AND IFNULL(rm.is_hidden, 0) != 1
        """,
        (frappe.session.user, channel_id),
    )

    return {"status": "success"}

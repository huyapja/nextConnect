import frappe
from pypika import JoinType


@frappe.whitelist()
def get_search_result(
    filter_type,
    search_text=None,
    from_user=None,
    in_channel=None,
    saved=False,
    date=None,
    file_type=None,
    message_type=None,
    channel_type=None,
    my_channel_only=False,
):
    user = frappe.session.user

    def get_file_extensions():
        return {
            "pdf": ["pdf"],
            "doc": ["doc", "docx", "odt", "ott", "rtf", "txt", "dot", "dotx", "docm", "dotm", "pages"],
            "ppt": ["ppt", "pptx", "odp", "otp", "pps", "ppsx", "pot", "potx", "pptm", "ppsm", "potm", "ppam", "ppa", "key"],
            "xls": ["xls", "xlsx", "csv", "ods", "ots", "xlsb", "xlsm", "xlt", "xltx", "xltm", "xlam", "xla", "numbers"],
        }

    def apply_common_filters(query):
        if from_user:
            query = query.where(message.owner == from_user)
        if in_channel:
            query = query.where(message.channel_id == in_channel)
        if date:
            query = query.where(message.creation > date)
        if message_type:
            query = query.where(message.message_type == message_type)
        if channel_type:
            query = query.where(channel.type == channel_type)
        if saved == "true":
            query = query.where(message._liked_by.like(f"%{user}%"))
        if my_channel_only == "true":
            query = query.where((channel.type == "Open") | (channel_member.user_id == user))
        return query

    # DocTypes
    message = frappe.qb.DocType("Raven Message")
    channel = frappe.qb.DocType("Raven Channel")
    channel_member = frappe.qb.DocType("Raven Channel Member")
    file_doc = frappe.qb.DocType("File")

    # Handle channel search
    if filter_type == "Channel":
        query = (
            frappe.qb.from_(channel)
            .select(
                channel.name,
                channel.owner,
                channel.creation,
                channel.type,
                channel.channel_name,
                channel.channel_description,
                channel.is_archived,
            )
            .join(channel_member, JoinType.left)
            .on(channel_member.channel_id == channel.name)
            .where(channel.is_direct_message == 0)
            .where((channel.type != "Private") | (channel_member.user_id == user))
            .distinct()
        )
        if search_text:
            query = query.where(channel.channel_name.like(f"%{search_text}%"))
        return query.limit(20).offset(0).run(as_dict=True)

    # Base query for messages
    query = (
        frappe.qb.from_(message)
        .select(
            message.name,
            message.file,
            message.owner,
            message.creation,
            message.message_type,
            message.channel_id,
            message.text,
            message.content,
            channel.workspace,
        )
        .join(channel, JoinType.left)
        .on(message.channel_id == channel.name)
        .join(channel_member, JoinType.left)
        .on(channel_member.channel_id == message.channel_id)
        .join(file_doc, JoinType.left)
        .on(message.name == file_doc.attached_to_name)
        .where(channel_member.user_id == user)
    )

    # Filter by search type
    if filter_type == "Message":
        query = query.where(message.message_type == "Text")
        if search_text:
            query = query.where(message.content.like(f"%{search_text}%"))

    elif filter_type == "File":
        query = query.where(message.message_type == "File")
        if search_text:
            query = query.where(message.file.like(f"/private/files/%{search_text}%"))
        if file_type:
            if file_type == "pdf":
                query = query.where(file_doc.file_type == "pdf")
            else:
                extensions = get_file_extensions().get(file_type)
                if extensions:
                    query = query.where(file_doc.file_type.isin(extensions))

    elif filter_type == "Media":
        query = query.where(message.message_type.isin(["Image", "Video"]))
        if search_text:
            query = query.where(message.file.like(f"/private/files/%{search_text}%"))

    elif filter_type == "Link":
        query = query.where(message.message_type == "Text")
        # Detect presence of URL
        query = query.where((message.content.like("%http://%")) | (message.content.like("%https://%")))
        if search_text:
            query = query.where(message.content.like(f"%{search_text}%"))

    else:
        return []

    query = apply_common_filters(query)

    return query.limit(20).offset(0).run(as_dict=True)

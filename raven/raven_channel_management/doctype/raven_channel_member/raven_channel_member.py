# Copyright (c) 2023, The Commit Company and contributors
# For license information, please see license.txt

"""Raven Channel Member DocType – stubbed for static analysis.
This header suppresses IDE/linter complaints when `frappe` is unavailable.
"""

# pyright: reportMissingImports=false, reportMissingModuleSource=false, reportAttributeAccessIssue=false

from typing import Any, TYPE_CHECKING

try:
	import frappe  # type: ignore
	from frappe import _  # type: ignore
	from frappe.model.document import Document  # type: ignore
except ModuleNotFoundError:  # pragma: no cover
	class _Stub:  # noqa: D401 – generic stub object
		def __getattr__(self, name: str) -> Any:  # type: ignore
			return self

		def __call__(self, *args: Any, **kwargs: Any) -> Any:  # type: ignore
			return self

	frappe = _Stub()  # type: ignore

	def _(txt: str) -> str:  # type: ignore
		return txt

	Document = type("Document", (), {})  # type: ignore

# Comment: Frappe push notification service - được thay thế bởi Firebase
# from raven.notification import subscribe_user_to_topic, unsubscribe_user_to_topic
from raven.utils import delete_channel_members_cache


class RavenChannelMember(Document):  # type: ignore[misc]
	# begin: auto-generated types
	# This code is auto-generated. Do not modify anything in this block.

	if TYPE_CHECKING:
		from frappe.types import DF

		allow_notifications: DF.Check
		channel_id: DF.Link
		is_admin: DF.Check
		is_synced: DF.Check
		last_visit: DF.Datetime
		linked_doctype: DF.Link | None
		linked_document: DF.DynamicLink | None
		user_id: DF.Link
	# end: auto-generated types

	def validate(self):
		if (
			self.has_value_changed("is_admin")
			and not self.flags.in_insert
			and not self.flags.ignore_permissions
		):
			# Check if the user is an existing admin of the channel
			if not frappe.db.exists(
				"Raven Channel Member",
				{"channel_id": self.channel_id, "user_id": frappe.session.user, "is_admin": 1},
			):
				frappe.throw(
					_("You cannot make yourself an admin of a channel. Please ask another admin to do this."),
					frappe.PermissionError,
				)

	def before_insert(self):
		self.last_visit = frappe.utils.now()
		# 1. A user cannot be a member of a channel more than once
		if frappe.db.exists(
			"Raven Channel Member", {"channel_id": self.channel_id, "user_id": self.user_id}
		):
			frappe.throw(_("You are already a member of this channel"), frappe.DuplicateEntryError)
		# if there are no members in the channel, then the member becomes admin
		if frappe.db.count("Raven Channel Member", {"channel_id": self.channel_id}) == 0:
			self.is_admin = 1

		self.allow_notifications = 1

	def after_delete(self):

		member_name = frappe.get_cached_value("Raven User", self.user_id, "full_name")

		current_user_name = frappe.get_cached_value("Raven User", frappe.session.user, "full_name")

		is_thread = self.is_thread()

		if not is_thread:
			# Update the channel list for the user who left the channel
			frappe.publish_realtime(
				"channel_list_updated",
				{
					"channel_id": self.channel_id,
				},
				user=self.user_id,
				after_commit=True,
			)
		else:
			# ✅ Nếu là thread, thông báo cập nhật thread list cho user rời (ngay lập tức)
			frappe.publish_realtime(
				"thread_list_updated",
				{
					"channel_id": self.channel_id,
					"action": "removed"
				},
				user=self.user_id,
			)
			# ✅ Cũng gửi với after_commit để đảm bảo
			frappe.publish_realtime(
				"thread_list_updated",
				{
					"channel_id": self.channel_id,
					"action": "removed"
				},
				user=self.user_id,
				after_commit=True,
			)

		# Check remaining member count
		remaining_members_count = frappe.db.count("Raven Channel Member", {"channel_id": self.channel_id})

		# If this was the last member of a private channel, handle cleanup
		if remaining_members_count == 0:
			channel_type = frappe.db.get_value("Raven Channel", self.channel_id, "type")
			if channel_type == "Private":
				if is_thread:
					# ✅ Nếu là thread và không còn member nào, xóa luôn thread channel và message gốc
					try:
						# Xóa thread channel sẽ tự động xóa các message trong thread (xem on_trash của RavenChannel)
						thread_channel = frappe.get_doc("Raven Channel", self.channel_id)
						thread_channel.delete(ignore_permissions=True)
						
						# Không cần thông báo thread list update nữa vì thread đã bị xóa
						return
					except Exception as e:
						frappe.log_error(f"Error deleting empty thread channel {self.channel_id}: {str(e)}")
						# Fallback: archive the channel
						frappe.db.set_value("Raven Channel", self.channel_id, "is_archived", 1)
				else:
					# Archive regular private channel
					frappe.db.set_value("Raven Channel", self.channel_id, "is_archived", 1)

		# If this member was the only admin, then make the next oldest member an admin
		if (
			self.get_admin_count() == 0
			and remaining_members_count > 0
		):
			first_member = frappe.db.get_value(
				"Raven Channel Member",
				{"channel_id": self.channel_id},
				["name", "user_id"],
				as_dict=1,
				order_by="creation asc",
			)
			frappe.db.set_value("Raven Channel Member", first_member.name, "is_admin", 1)

			first_member_name = frappe.get_cached_value("Raven User", first_member.user_id, "full_name")

			# ✅ Tạo system message với tiếng Việt
			system_message_text = f"Admin \"{member_name}\" đã rời khỏi Chủ đề này. \"{first_member_name}\" sẽ trở thành admin mới."
			
			# Add a system message to the channel mentioning the new admin
			message_doc = frappe.get_doc(
				{
					"doctype": "Raven Message",
					"channel_id": self.channel_id,
					"message_type": "System",
					"text": system_message_text,
				}
			)
			message_doc.insert(ignore_permissions=True)

			# ✅ Gửi realtime notification cho system message như tin nhắn thường
			frappe.publish_realtime(
				"message_created",
				{
					"channel_id": self.channel_id,
					"sender": "System",
					"message_id": message_doc.name,
					"message_details": {
						"text": system_message_text,
						"channel_id": self.channel_id,
						"content": system_message_text,
						"file": None,
						"message_type": "System",
						"is_edited": 0,
						"is_thread": 0,
						"is_forwarded": 0,
						"is_reply": 0,
						"poll_id": None,
						"creation": message_doc.creation,
						"owner": message_doc.owner,
						"modified_by": message_doc.modified_by,
						"modified": message_doc.modified,
						"linked_message": None,
						"replied_message_details": None,
						"link_doctype": None,
						"link_document": None,
						"message_reactions": None,
						"name": message_doc.name,
						"is_bot_message": 0,
						"bot": None,
						"hide_link_preview": 0,
					},
				},
				doctype="Raven Channel",
				docname=self.channel_id,
			)

			# ✅ Gửi realtime notification về thay đổi admin
			frappe.publish_realtime(
				"channel_members_updated",
				{
					"channel_id": self.channel_id,
					"new_admin": first_member.user_id,
					"old_admin": self.user_id,
					"message": "Admin changed"
				},
				doctype="Raven Channel",
				docname=self.channel_id,
			)
			
			# ✅ Cũng gửi event ngay lập tức không cần after_commit
			frappe.publish_realtime(
				"channel_members_updated",
				{
					"channel_id": self.channel_id,
				},
				doctype="Raven Channel",
				docname=self.channel_id,
			)
		else:
			# Add system message if there are still members (only for non-empty channels)
			if remaining_members_count > 0:
				# If the member who left is the current user, then add a system message to the channel mentioning that the user left
				if member_name == current_user_name:
					# Add a system message to the channel mentioning the member who left
					message_doc = frappe.get_doc(
						{
							"doctype": "Raven Message",
							"channel_id": self.channel_id,
							"message_type": "System",
							"text": f"{member_name} đã rời khỏi.",
						}
					)
					message_doc.insert(ignore_permissions=True)
					
					# ✅ Gửi realtime notification cho system message
					self.publish_system_message_realtime(message_doc, f"{member_name} đã rời khỏi.")
				else:
					# Add a system message to the channel mentioning the member who left
					message_doc = frappe.get_doc(
						{
							"doctype": "Raven Message",
							"channel_id": self.channel_id,
							"message_type": "System",
							"text": f"{current_user_name} đã xóa {member_name}.",
						}
					)
					message_doc.insert(ignore_permissions=True)
					
					# ✅ Gửi realtime notification cho system message
					self.publish_system_message_realtime(message_doc, f"{current_user_name} đã xóa {member_name}.")

	def publish_system_message_realtime(self, message_doc, text):
		"""
		Helper method to publish realtime notification for system messages
		"""
		frappe.publish_realtime(
			"message_created",
			{
				"channel_id": self.channel_id,
				"sender": "System",
				"message_id": message_doc.name,
				"message_details": {
					"text": text,
					"channel_id": self.channel_id,
					"content": text,
					"file": None,
					"message_type": "System",
					"is_edited": 0,
					"is_thread": 0,
					"is_forwarded": 0,
					"is_reply": 0,
					"poll_id": None,
					"creation": message_doc.creation,
					"owner": message_doc.owner,
					"modified_by": message_doc.modified_by,
					"modified": message_doc.modified,
					"linked_message": None,
					"replied_message_details": None,
					"link_doctype": None,
					"link_document": None,
					"message_reactions": None,
					"name": message_doc.name,
					"is_bot_message": 0,
					"bot": None,
					"hide_link_preview": 0,
				},
			},
			doctype="Raven Channel",
			docname=self.channel_id,
		)

	def on_trash(self):
		# Comment: Frappe push notification service - được thay thế bởi Firebase
		# unsubscribe_user_to_topic(self.channel_id, self.user_id)
		self.invalidate_channel_members_cache()

		# Gửi event realtime cho người bị xóa
		if self.user_id:
			frappe.publish_realtime(
				event='raven:member_removed',
				message={
					'channel_id': self.channel_id,
					'removed_user': self.user_id
				},
				user=self.user_id
			)

	def check_if_user_is_member(self):
		is_member = True
		channel = frappe.db.get_value("Raven Channel", self.channel_id, ["type", "owner"], as_dict=True)
		if channel.type == "Private":
			# A user can only add members to a private channel if they are themselves member of the channel or if they are the owner of a new channel
			if (
				channel.owner == frappe.session.user
				and frappe.db.count("Raven Channel Member", {"channel_id": self.channel_id}) == 0
			):
				# User is the owner of a channel and there are no members in the channel
				pass
			elif frappe.db.exists(
				"Raven Channel Member",
				{"channel_id": self.channel_id, "user_id": frappe.session.user},
			):
				# User is a member of the channel
				pass
			elif frappe.session.user == "Administrator":
				# User is Administrator
				pass
			else:
				is_member = False
		return is_member

	def after_insert(self):
		"""
		Subscribe the user to the topic if the channel is not a DM
		"""
		is_direct_message = frappe.get_cached_value(
			"Raven Channel", self.channel_id, "is_direct_message"
		)

		is_thread = self.is_thread()

		if not is_thread:
			# Update the channel list for the user who joined the channel
			frappe.publish_realtime(
				"channel_list_updated",
				{
					"channel_id": self.channel_id,
				},
				user=self.user_id,
				after_commit=True,
			)

		# Comment: Frappe push notification service - được thay thế bởi Firebase
		# if not is_direct_message and self.allow_notifications:
		# 	subscribe_user_to_topic(self.channel_id, self.user_id)

		if not is_direct_message:

			# Send a system message to the channel mentioning the member who joined
			if not is_thread:
				member_name = frappe.get_cached_value("Raven User", self.user_id, "full_name")
				if self.user_id == frappe.session.user:
					message_doc = frappe.get_doc(
						{
							"doctype": "Raven Message",
							"channel_id": self.channel_id,
							"message_type": "System",
							"text": f"{member_name} đã tham gia.",
						}
					)
					message_doc.insert(ignore_permissions=True)
					
					# ✅ Gửi realtime notification cho system message
					self.publish_system_message_realtime(message_doc, f"{member_name} đã tham gia.")
				else:
					current_user_name = frappe.get_cached_value("Raven User", frappe.session.user, "full_name")
					message_doc = frappe.get_doc(
						{
							"doctype": "Raven Message",
							"channel_id": self.channel_id,
							"message_type": "System",
							"text": f"{current_user_name} đã thêm {member_name}.",
						}
					)
					message_doc.insert(ignore_permissions=True)
					
					# ✅ Gửi realtime notification cho system message
					self.publish_system_message_realtime(message_doc, f"{current_user_name} đã thêm {member_name}.")

		self.invalidate_channel_members_cache()

	def on_update(self):
		"""
		Check if the notification preference is changed and update the subscription
		"""
		if self.has_value_changed("allow_notifications"):
			is_direct_message = frappe.get_cached_value(
				"Raven Channel", self.channel_id, "is_direct_message"
			)

			# Comment: Frappe push notification service - được thay thế bởi Firebase
			# if not is_direct_message:
			# 	if self.allow_notifications:
			# 		subscribe_user_to_topic(self.channel_id, self.user_id)
			# 	else:
			# 		unsubscribe_user_to_topic(self.channel_id, self.user_id)

		if self.has_value_changed("is_admin") and not self.flags.in_insert and not self.is_thread():
			# Send a system message to the channel mentioning the member who became admin
			member_name = frappe.get_cached_value("Raven User", self.user_id, "full_name")
			text = (
				f"{member_name} đã trở thành admin." if self.is_admin else f"{member_name} không còn là admin."
			)
			message_doc = frappe.get_doc(
				{
					"doctype": "Raven Message",
					"channel_id": self.channel_id,
					"message_type": "System",
					"text": text,
				}
			)
			message_doc.insert(ignore_permissions=True)
			
			# ✅ Gửi realtime notification cho system message
			self.publish_system_message_realtime(message_doc, text)

		self.invalidate_channel_members_cache()

	def get_admin_count(self):
		return frappe.db.count("Raven Channel Member", {"channel_id": self.channel_id, "is_admin": 1})

	def is_thread(self):
		return frappe.get_cached_value("Raven Channel", self.channel_id, "is_thread")

	def invalidate_channel_members_cache(self):
		if not self.flags.ignore_cache_invalidation:
			delete_channel_members_cache(self.channel_id)


def on_doctype_update():
	"""
	Add indexes to Raven Channel Member table
	"""
	# Index the selector (channel or message type) first for faster queries (less rows to sort in the next step)
	frappe.db.add_index("Raven Channel Member", ["channel_id", "user_id"])
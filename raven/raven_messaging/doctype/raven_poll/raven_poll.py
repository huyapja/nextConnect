# Copyright (c) 2024, The Commit Company and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class RavenPoll(Document):
	# begin: auto-generated types
	# This code is auto-generated. Do not modify anything in this block.

	from typing import TYPE_CHECKING

	if TYPE_CHECKING:
		from frappe.types import DF

		from raven.raven_messaging.doctype.raven_poll_option.raven_poll_option import RavenPollOption

		is_anonymous: DF.Check
		is_disabled: DF.Check
		is_multi_choice: DF.Check
		options: DF.Table[RavenPollOption]
		question: DF.SmallText
		total_votes: DF.Int
	# end: auto-generated types

	def validate(self):
		self.validate_question()
		self.validate_options()

	def validate_question(self):
		if not self.question or not self.question.strip():
			frappe.throw("Vui lòng nhập câu hỏi hợp lệ, không được để trống hoặc chỉ có dấu cách")

	def validate_options(self):
		if not self.options:
			frappe.throw("Vui lòng thêm ít nhất một lựa chọn cho cuộc thăm dò")
		
		for idx, option in enumerate(self.options, 1):
			if not option.option or not option.option.strip():
				frappe.throw(f"Lựa chọn #{idx}: Vui lòng nhập lựa chọn hợp lệ, không được để trống hoặc chỉ có dấu cách")

	def before_validate(self):
		# Total_votes is the sum of all votes in the poll per user
		poll_votes = frappe.get_all(
			"Raven Poll Vote", filters={"poll_id": self.name}, fields=["user_id"], group_by="user_id"
		)

		# count the number of unique users who voted
		self.total_votes = len(poll_votes) if poll_votes else 0

	def on_trash(self):
		# Delete all poll votes
		frappe.db.delete("Raven Poll Vote", {"poll_id": self.name})

	pass
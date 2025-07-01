# Copyright (c) 2024, The Commit Company and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document


class RavenPollVote(Document):
	# begin: auto-generated types
	# This code is auto-generated. Do not modify anything in this block.

	from typing import TYPE_CHECKING

	if TYPE_CHECKING:
		from frappe.types import DF

		option: DF.Data
		poll_id: DF.Link
		user_id: DF.Link
	# end: auto-generated types

	def before_insert(self):
		# check if the poll is still open
		poll = frappe.get_cached_doc("Raven Poll", self.poll_id)
		if poll.is_disabled:
			frappe.throw(_("Poll này đã kết thúc."))

		# check if the option is valid
		if not frappe.db.exists(
			"Raven Poll Option",
			{
				"parent": self.poll_id,
				"name": self.option,
			},
		):
			frappe.throw(_("Lựa chọn không hợp lệ."))

		# Note: Duplicate vote validation is now handled at API level
		# The add_vote API implements smart toggle/change vote logic

	def validate(self):
		# Check if the user_id is the same as the logged in user
		if self.user_id != frappe.session.user:
			frappe.throw(_("Bạn chỉ có thể vote cho chính mình."))

	def after_insert(self):
		update_poll_votes(self.poll_id)

	def after_delete(self):
		update_poll_votes(self.poll_id)


def update_poll_votes(poll_id):
	poll = frappe.get_cached_doc("Raven Poll", poll_id)
	# get votes for each option
	poll_votes = frappe.get_all(
		"Raven Poll Vote",
		filters={"poll_id": poll_id},
		fields=["option", "count(name) as votes"],
		group_by="option",
	)

	# update the votes for each option in the poll
	for option in poll.options:
		option.votes = 0
		for vote in poll_votes:
			if option.name == vote.option:
				option.votes = vote.votes
				break

	poll.save(ignore_permissions=True)
	
	# Publish realtime event to notify all users in the channel about poll vote update
	publish_poll_vote_update(poll_id)


def publish_poll_vote_update(poll_id):
	"""
	Publish realtime event to notify all users in the channel about poll vote update
	"""
	# Get the poll and its associated message to find the channel
	poll = frappe.get_cached_doc("Raven Poll", poll_id)
	
	# Find the message that contains this poll to get the channel_id
	message = frappe.get_value(
		"Raven Message", 
		{"poll_id": poll_id}, 
		["name", "channel_id"], 
		as_dict=True
	)
	
	if not message:
		return
	
	# Get current user votes for the poll
	current_user_votes = frappe.get_all(
		"Raven Poll Vote",
		filters={"poll_id": poll_id, "user_id": frappe.session.user},
		fields=["option"],
		pluck="option"
	)
	
	# Prepare poll data similar to get_poll API
	poll_data = {
		"poll": poll,
		"current_user_votes": [{"option": vote} for vote in current_user_votes]
	}
	
	# Publish realtime event to all users in the channel
	frappe.publish_realtime(
		"poll_vote_updated",
		{
			"channel_id": message.channel_id,
			"message_id": message.name,
			"poll_id": poll_id,
			"sender": frappe.session.user,
			"poll_data": poll_data,
		},
		doctype="Raven Channel",
		docname=message.channel_id,
		after_commit=True,
	)

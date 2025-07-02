import frappe
from frappe import _


@frappe.whitelist(methods=["POST"])
def create_poll(
	channel_id: str,
	question: str,
	options: list,
	is_multi_choice: bool = None,
	is_anonymous: bool = None,
) -> str:
	"""
	Create a new poll in the Raven Poll doctype.
	"""
	# Check if the current user has access to the channel to create a poll.
	if not frappe.has_permission(doctype="Raven Channel", doc=channel_id, ptype="read"):
		frappe.throw(_("Bạn không có quyền truy cập kênh này"), frappe.PermissionError)

	# Validate input data before creating poll
	if not question or not question.strip():
		frappe.throw(_("Câu hỏi không được để trống hoặc chỉ chứa dấu cách"))
	
	if not options or len(options) < 2:
		frappe.throw(_("Phải có ít nhất 2 lựa chọn"))
	
	# Validate each option
	valid_options = []
	for idx, option in enumerate(options):
		if not option.get('option') or not option.get('option').strip():
			frappe.throw(_("Lựa chọn thứ {0} không được để trống hoặc chỉ chứa dấu cách").format(idx + 1))
		valid_options.append(option)

	poll = frappe.get_doc(
		{
			"doctype": "Raven Poll",
			"question": question.strip(),
			"is_multi_choice": is_multi_choice,
			"is_anonymous": is_anonymous,
			"channel_id": channel_id,
		}
	)

	for option in valid_options:
		# Strip whitespace from option text
		option_copy = option.copy()
		option_copy['option'] = option_copy['option'].strip()
		poll.append("options", option_copy)

	poll.insert()

	# Poll message content is the poll question and options separated by a newline. (This would help with the searchability of the poll)
	poll_message_content = f"{question}\n"

	for index, option in enumerate(options):
		poll_message_content += f"{index + 1}. {option['option']}\n"

	# Send a message to the channel with type "poll" and the poll_id.
	message = frappe.get_doc(
		{
			"doctype": "Raven Message",
			"channel_id": channel_id,
			"text": "",
			"content": poll_message_content,
			"message_type": "Poll",
			"poll_id": poll.name,
		}
	)
	message.insert()

	return poll.name


@frappe.whitelist()
def get_poll(message_id):
	"""
	Get the poll data from the Raven Poll doctype.
	(Including the poll options, the number of votes for each option and the total number of votes.)
	"""

	# Check if the current user has access to the message.
	if not frappe.has_permission(doctype="Raven Message", doc=message_id, ptype="read"):
		frappe.throw(_("Bạn không có quyền truy cập tin nhắn này"), frappe.PermissionError)

	poll_id = frappe.get_cached_value("Raven Message", message_id, "poll_id")

	poll = frappe.get_cached_doc("Raven Poll", poll_id)

	# Check if the current user has already voted in the poll, if so, return the poll with the user's vote.
	current_user_vote = frappe.get_all(
		"Raven Poll Vote",
		filters={"poll_id": poll_id, "user_id": frappe.session.user},
		fields=["option"],
	)

	if current_user_vote:
		poll.current_user_vote = current_user_vote

	return {"poll": poll, "current_user_votes": current_user_vote}


@frappe.whitelist(methods=["POST"])
def add_vote(message_id, option_id):

	# Check if the current user has access to the message.
	if not frappe.has_permission(doctype="Raven Message", doc=message_id, ptype="read"):
		frappe.throw(_("Bạn không có quyền truy cập tin nhắn này"), frappe.PermissionError)

	poll_id = frappe.get_cached_value("Raven Message", message_id, "poll_id")
	is_poll_multi_choice = frappe.get_cached_value("Raven Poll", poll_id, "is_multi_choice")
	user = frappe.session.user

	if is_poll_multi_choice:
		# Multi-choice: toggle vote for each option
		for option in option_id:
			existing_vote = frappe.db.exists(
				"Raven Poll Vote",
				{
					"poll_id": poll_id,
					"user_id": user,
					"option": option,
				},
			)
			
			if existing_vote:
				# Vote exists → remove it (toggle off)
				frappe.delete_doc("Raven Poll Vote", existing_vote)
			else:
				# Vote doesn't exist → add it (toggle on)
				frappe.get_doc(
					{
						"doctype": "Raven Poll Vote",
						"poll_id": poll_id,
						"option": option,
						"user_id": user,
					}
				).insert()
	else:
		# Single-choice: change vote logic
		# First, remove any existing vote by this user
		existing_votes = frappe.get_all(
			"Raven Poll Vote", 
			filters={"poll_id": poll_id, "user_id": user}, 
			fields=["name", "option"]
		)
		
		# Check if user is voting for the same option they already voted for
		already_voted_this_option = any(vote.option == option_id for vote in existing_votes)
		
		if already_voted_this_option:
			# User clicked same option → toggle off (remove vote)
			for vote in existing_votes:
				if vote.option == option_id:
					frappe.delete_doc("Raven Poll Vote", vote.name)
		else:
			# User is changing vote or voting for first time
			# Remove all existing votes first
			for vote in existing_votes:
				frappe.delete_doc("Raven Poll Vote", vote.name)
			
			# Add new vote
			frappe.get_doc(
				{
					"doctype": "Raven Poll Vote",
					"poll_id": poll_id,
					"option": option_id,
					"user_id": user,
				}
			).insert()

	return "Cập nhật vote thành công."


@frappe.whitelist(methods=["POST"])
def retract_vote(poll_id):
	# delete all votes by the user for the poll (this takes care of the case where the user has voted for multiple options in the same poll)
	user = frappe.session.user
	votes = frappe.get_all(
		"Raven Poll Vote", filters={"poll_id": poll_id, "user_id": user}, fields=["name"]
	)
	if not votes:
		frappe.throw(_("Bạn chưa vote cho bất kỳ lựa chọn nào trong poll này."))
	else:
		for vote in votes:
			frappe.delete_doc("Raven Poll Vote", vote.name)


@frappe.whitelist()
def get_all_votes(poll_id):

	# Check if the current user has access to the poll
	if not frappe.has_permission(doctype="Raven Poll", doc=poll_id, ptype="read"):
		frappe.throw(_("Bạn không có quyền truy cập poll này"), frappe.PermissionError)

	poll_doc = frappe.get_cached_doc("Raven Poll", poll_id)

	if poll_doc.is_anonymous:
		frappe.throw(
			_("Poll này ẩn danh. Bạn không có quyền truy cập các votes."),
			frappe.PermissionError,
		)
	else:
		# Get all votes for this poll
		votes = frappe.get_all(
			"Raven Poll Vote", filters={"poll_id": poll_id}, fields=["name", "option", "user_id"]
		)

		# Initialize results dictionary
		results = {
			option.name: {"users": [], "count": option.votes} for option in poll_doc.options if option.votes
		}

		# Process votes
		for vote in votes:
			option = vote["option"]
			results[option]["users"].append(vote["user_id"])

		# Calculate total votes
		total_votes = sum(result["count"] for result in results.values())

		# Calculate percentages
		for result in results.values():
			result["percentage"] = (result["count"] / total_votes) * 100

		return results

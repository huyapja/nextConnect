# Copyright (c) 2024, The Commit Company and Contributors
# See license.txt

import frappe
from frappe.tests.utils import FrappeTestCase


class TestRavenPoll(FrappeTestCase):
	# 1. Only the poll creator is allowed to view the poll in the Raven Poll list view.

	# 2. Only the poll creator is allowed to edit the poll.

	# 3. Only the poll creator is allowed to delete the poll.

	# 4. Only the poll creator is allowed to disable (close) the poll.

	# 5. All users who are part of the channel wherein the poll was created should be allowed to vote on the poll.

	# 6. If poll has option to allow multiple choices (is_multi_choice is checked), users should be allowed to vote on multiple options.
	# But each user should be allowed to vote only once on each option.

	# 7. If poll is not multi-choice, users should be allowed to vote only once.

	# 8. Users should not be able to edit or delete votes cast by other users/themselves but can view votes if the poll is not anonymous.

	# 9. If the poll is anonymous (is_anonymous is checked), all users including the poll creator should not be able to access Raven Poll
	# Vote list view for that poll.

	# 10. If poll is closed (is_disabled is checked), no more votes should be allowed.

	def test_question_validation_with_spaces_only(self):
		"""Test that a poll cannot be created with a question containing only spaces"""
		with self.assertRaises(frappe.ValidationError):
			poll = frappe.get_doc({
				"doctype": "Raven Poll",
				"question": "   ",  # Only spaces
				"options": [
					{"option": "Option 1"},
					{"option": "Option 2"}
				]
			})
			poll.insert()

	def test_question_validation_with_empty_string(self):
		"""Test that a poll cannot be created with an empty question"""
		with self.assertRaises(frappe.ValidationError):
			poll = frappe.get_doc({
				"doctype": "Raven Poll",
				"question": "",  # Empty string
				"options": [
					{"option": "Option 1"},
					{"option": "Option 2"}
				]
			})
			poll.insert()

	def test_option_validation_with_spaces_only(self):
		"""Test that a poll cannot be created with options containing only spaces"""
		with self.assertRaises(frappe.ValidationError):
			poll = frappe.get_doc({
				"doctype": "Raven Poll",
				"question": "Valid Question",
				"options": [
					{"option": "Valid Option"},
					{"option": "   "}  # Only spaces
				]
			})
			poll.insert()

	def test_option_validation_with_empty_string(self):
		"""Test that a poll cannot be created with empty options"""
		with self.assertRaises(frappe.ValidationError):
			poll = frappe.get_doc({
				"doctype": "Raven Poll",
				"question": "Valid Question",
				"options": [
					{"option": "Valid Option"},
					{"option": ""}  # Empty string
				]
			})
			poll.insert()

	def test_valid_poll_creation(self):
		"""Test that a poll can be created with valid question and options"""
		poll = frappe.get_doc({
			"doctype": "Raven Poll",
			"question": "What is your favorite color?",
			"options": [
				{"option": "Red"},
				{"option": "Blue"},
				{"option": "Green"}
			]
		})
		poll.insert()
		self.assertTrue(poll.name)  # Should have a name if created successfully
		
		# Clean up
		poll.delete()

	pass

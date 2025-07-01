# Copyright (c) 2025, The Commit Company (Algocode Technologies Pvt. Ltd.) and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class FirebaseNotificationToken(Document):
	# begin: auto-generated types
	# This code is auto-generated. Do not modify anything in this block.

	from typing import TYPE_CHECKING

	if TYPE_CHECKING:
		from frappe.types import DF

		device_information: DF.Data | None
		environment: DF.Literal["Web", "Mobile"]
		firebase_token: DF.SmallText
		is_active: DF.Check
		user: DF.Link
	# end: auto-generated types

	def validate(self):
		"""Validate the Firebase token"""
		if not self.firebase_token:
			frappe.throw("Firebase token is required")
		
		# Check for duplicate active tokens for same user and environment
		existing = frappe.get_all(
			"Firebase Notification Token",
			filters={
				"user": self.user,
				"firebase_token": self.firebase_token,
				"is_active": 1,
				"name": ("!=", self.name) if not self.is_new() else ""
			}
		)
		
		if existing:
			frappe.throw("This Firebase token is already registered for this user")

	def after_insert(self):
		"""Actions after inserting a new token"""
		frappe.logger().info(f"Firebase token registered for user: {self.user}")

	def on_trash(self):
		"""Actions before deleting a token"""
		frappe.logger().info(f"Firebase token removed for user: {self.user}")

	@classmethod
	def get_active_tokens_for_user(cls, user):
		"""Get all active Firebase tokens for a user"""
		return frappe.get_all(
			"Firebase Notification Token",
			filters={
				"user": user,
				"is_active": 1
			},
			fields=["firebase_token", "environment", "device_information"]
		)

	@classmethod
	def get_active_tokens_for_users(cls, users):
		"""Get all active Firebase tokens for multiple users"""
		if not users:
			return []
			
		return frappe.get_all(
			"Firebase Notification Token",
			filters={
				"user": ("in", users),
				"is_active": 1
			},
			fields=["firebase_token", "user", "environment", "device_information"]
		)

	@classmethod
	def deactivate_token(cls, firebase_token, user=None):
		"""Deactivate a specific Firebase token"""
		filters = {"firebase_token": firebase_token}
		if user:
			filters["user"] = user
			
		tokens = frappe.get_all("Firebase Notification Token", filters=filters)
		for token in tokens:
			doc = frappe.get_doc("Firebase Notification Token", token.name)
			doc.is_active = 0
			doc.save(ignore_permissions=True) 
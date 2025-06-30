# Copyright (c) 2024, The Commit Company (Algocode Technologies Pvt. Ltd.) and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from datetime import datetime


class RavenCallSession(Document):
	def before_insert(self):
		"""Set start time when call session is created"""
		if not self.start_time:
			self.start_time = datetime.now()
	
	def on_update(self):
		"""Update end time and duration when call ends"""
		if self.status in ["ended", "missed", "rejected"] and not self.end_time:
			self.end_time = datetime.now()
			if self.start_time:
				duration = (self.end_time - self.start_time).total_seconds()
				self.duration = int(duration)
				self.save()
	
	def validate(self):
		"""Validate call session data"""
		if self.caller_id == self.callee_id:
			frappe.throw("Người gọi và người nhận không thể giống nhau")
		
		# Kiểm tra xem có cuộc gọi đang diễn ra không
		active_calls = frappe.get_all(
			"Raven Call Session",
			filters={
				"name": ["!=", self.name],
				"status": ["in", ["initiated", "ringing", "answered"]],
				"caller_id": ["in", [self.caller_id, self.callee_id]],
				"callee_id": ["in", [self.caller_id, self.callee_id]]
			}
		)
		
		if active_calls:
			frappe.throw("Đã có cuộc gọi đang diễn ra giữa hai người dùng này") 
import frappe
from frappe.model.document import Document

class RavenMissedCall(Document):
    """
    Document controller for Raven Missed Call
    """
    
    def before_insert(self):
        """
        Set caller name and image if not provided
        """
        if not self.caller_name:
            caller_info = frappe.get_cached_value(
                "Raven User", 
                self.caller_id, 
                ["full_name", "first_name"], 
                as_dict=True
            )
            self.caller_name = caller_info.get("full_name") or caller_info.get("first_name") or self.caller_id
        
        if not self.caller_image:
            self.caller_image = frappe.get_cached_value("Raven User", self.caller_id, "user_image")
    
    def after_insert(self):
        """
        Send real-time notification after insert
        """
        frappe.publish_realtime(
            event="missed_call_created",
            message={
                "missed_call_id": self.name,
                "caller_id": self.caller_id,
                "caller_name": self.caller_name,
                "call_type": self.call_type
            },
            user=self.callee_id
        )
    
    def validate(self):
        """
        Validate missed call data
        """
        # Ensure caller and callee are different
        if self.caller_id == self.callee_id:
            frappe.throw("Caller và Callee không thể giống nhau")
        
        # Validate call type
        if self.call_type not in ["audio", "video"]:
            frappe.throw("Call type phải là 'audio' hoặc 'video'") 
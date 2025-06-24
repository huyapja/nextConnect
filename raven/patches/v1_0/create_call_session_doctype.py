import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def execute():
    """Create Raven Call Session DocType"""
    
    # Check if DocType already exists
    if not frappe.db.exists("DocType", "Raven Call Session"):
        # Create the DocType
        frappe.get_doc({
            "doctype": "DocType",
            "name": "Raven Call Session",
            "module": "Raven",
            "custom": 0,
            "is_submittable": 0,
            "track_changes": 1,
            "fields": [
                {
                    "fieldname": "session_id",
                    "fieldtype": "Data",
                    "label": "Session ID",
                    "reqd": 1,
                    "unique": 1
                },
                {
                    "fieldname": "caller_id",
                    "fieldtype": "Link",
                    "label": "Caller",
                    "options": "Raven User",
                    "reqd": 1
                },
                {
                    "fieldname": "callee_id",
                    "fieldtype": "Link",
                    "label": "Callee",
                    "options": "Raven User",
                    "reqd": 1
                },
                {
                    "fieldname": "call_type",
                    "fieldtype": "Select",
                    "label": "Call Type",
                    "options": "audio\nvideo",
                    "reqd": 1
                },
                {
                    "fieldname": "status",
                    "fieldtype": "Select",
                    "label": "Status",
                    "options": "initiated\nringing\nanswered\nended\nmissed\nrejected",
                    "reqd": 1
                },
                {
                    "fieldname": "channel_id",
                    "fieldtype": "Data",
                    "label": "Channel ID"
                },
                {
                    "fieldname": "start_time",
                    "fieldtype": "Datetime",
                    "label": "Start Time"
                },
                {
                    "fieldname": "end_time",
                    "fieldtype": "Datetime",
                    "label": "End Time"
                },
                {
                    "fieldname": "duration",
                    "fieldtype": "Int",
                    "label": "Duration (seconds)"
                }
            ],
            "permissions": [
                {
                    "role": "System Manager",
                    "read": 1,
                    "write": 1,
                    "create": 1,
                    "delete": 1
                }
            ]
        }).insert()
        
        print("Created Raven Call Session DocType")
    else:
        print("Raven Call Session DocType already exists") 
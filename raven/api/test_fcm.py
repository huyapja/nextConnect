import frappe
from raven.fcm_utils import initialize_firebase_admin

@frappe.whitelist(allow_guest=True)
def test_firebase_init():
    """Test Firebase initialization"""
    try:
        result = initialize_firebase_admin()
        if result:
            return {
                "success": True,
                "message": "Firebase Admin SDK initialized successfully"
            }
        else:
            return {
                "success": False,
                "message": "Failed to initialize Firebase Admin SDK"
            }
    except Exception as e:
        return {
            "success": False,
            "message": f"Error: {str(e)}"
        } 
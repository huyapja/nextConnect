import jwt
import time
import frappe

API_KEY_SID = frappe.conf.get("stringee_api_key_sid")
API_KEY_SECRET = frappe.conf.get("stringee_api_key_secret")

def generate_stringee_token(user_id):
    payload = {
        "jti": f"{user_id}-{int(time.time())}",
        "iss": API_KEY_SID,
        "userId": user_id,
        "exp": int(time.time()) + 3600,
        "scope": {
            "app": {
                "calls": [
                    "outbound",
                    "inbound"
                ],
                "messaging": [
                    "send",
                    "receive"
                ]
            }
        }
    }
    return jwt.encode(payload, API_KEY_SECRET, algorithm="HS256")

@frappe.whitelist()
def get_stringee_token():
    user_id = frappe.session.user
    token = generate_stringee_token(user_id)
    return {"token": token, "userId": user_id}
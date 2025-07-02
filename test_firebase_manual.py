#!/usr/bin/env python3
"""
Script test Firebase notification thủ công
Chạy: bench --site react.test execute apps/raven/test_firebase_manual.py
"""

import frappe
from raven.firebase_service import firebase_service
from raven.firebase_message_integration import patch_raven_message

def test_firebase_notification():
    """Test Firebase notification thủ công"""
    print("🔥 Testing Firebase Notification Manual...")
    
    # 1. Patch RavenMessage trước
    print("📱 Patching RavenMessage...")
    patch_raven_message()
    
    # 2. Kiểm tra Firebase service
    print(f"🔧 Firebase service initialized: {firebase_service.initialized}")
    
    # 3. Kiểm tra tokens
    tokens = frappe.get_all("Firebase Notification Token", fields=["*"])
    print(f"🎫 Found {len(tokens)} Firebase tokens:")
    for token in tokens:
        print(f"   - User: {token.user}, Environment: {token.environment}, Active: {token.is_active}")
    
    # 4. Test gửi notification trực tiếp
    print("📨 Testing direct Firebase notification...")
    result = firebase_service.send_notification_to_user(
        user="Administrator",
        title="🔥 Test Firebase Manual",
        body="Đây là test notification từ script manual",
        data={
            "test": "manual_script",
            "timestamp": str(frappe.utils.now())
        }
    )
    print(f"📤 Direct notification result: {result}")
    
    # 5. Test tạo RavenMessage với Firebase
    print("💬 Testing RavenMessage with Firebase...")
    
    # Tìm DM channel
    dm_channel = frappe.get_value("Raven Channel", {"is_direct_message": 1}, "name")
    if dm_channel:
        print(f"📞 Using DM channel: {dm_channel}")
        
        # Tạo message với owner khác để trigger notification
        test_message = frappe.get_doc({
            "doctype": "Raven Message",
            "channel_id": dm_channel,
            "text": "<p>🔥 Test Firebase notification từ script manual</p>",
            "message_type": "Text",
            "owner": "Administrator"  # Gửi từ Administrator
        })
        
        print("💾 Inserting test message...")
        test_message.insert()
        frappe.db.commit()
        
        print(f"✅ Test message created: {test_message.name}")
    else:
        print("❌ No DM channel found for testing")
    
    print("✅ Firebase test completed!")

if __name__ == "__main__":
    test_firebase_notification() 
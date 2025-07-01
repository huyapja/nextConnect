import frappe
from raven.firebase_service import send_firebase_notification_to_user, firebase_service


def test_firebase_service():
    """
    Test Firebase service functionality
    """
    try:
        print("🔥 Testing Firebase Service...")
        
        # Test 1: Check if Firebase service is initialized
        print(f"Firebase initialized: {firebase_service.initialized}")
        
        # Test 2: Send test notification to Administrator
        print("📨 Sending test notification to Administrator...")
        
        result = send_firebase_notification_to_user(
            user="Administrator",
            title="🧪 Test Firebase Notification",
            body="Đây là test notification từ Firebase service",
            data={
                "type": "test",
                "timestamp": frappe.utils.now(),
                "test_id": "firebase_integration_test",
                "click_action": frappe.utils.get_url() + "/raven"
            }
        )
        
        print(f"Notification sent successfully: {result}")
        
        # Test 3: Check registered tokens
        tokens = frappe.get_all("Firebase Notification Token", fields=["user", "firebase_token", "is_active"])
        print(f"Found {len(tokens)} Firebase tokens in database")
        
        for token in tokens:
            print(f"  - User: {token.user}, Active: {token.is_active}")
        
        return {
            "success": True,
            "message": "Firebase integration test completed successfully",
            "tokens_count": len(tokens),
            "notification_sent": result
        }
        
    except Exception as e:
        print(f"❌ Firebase test failed: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }


def test_firebase_notification_for_channel():
    """
    Test Firebase notification for channel message
    """
    try:
        print("🔥 Testing Firebase notification for channel...")
        
        # Get a test channel
        channels = frappe.get_all("Raven Channel", limit=1)
        if not channels:
            return {"success": False, "error": "No channels found for testing"}
        
        channel_id = channels[0].name
        
        # Simulate sending notification to channel
        from raven.firebase_service import send_firebase_notification_to_channel
        
        result = send_firebase_notification_to_channel(
            channel_id=channel_id,
            title="🧪 Test Channel Notification",
            body="Test notification cho channel",
            data={
                "type": "channel_test",
                "channel_id": channel_id
            }
        )
        
        print(f"Channel notification sent: {result}")
        
        return {
            "success": True,
            "channel_id": channel_id,
            "notification_sent": result
        }
        
    except Exception as e:
        print(f"❌ Channel notification test failed: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }


if __name__ == "__main__":
    # Run tests
    print("=" * 50)
    print("🚀 Firebase Integration Tests")
    print("=" * 50)
    
    test1 = test_firebase_service()
    print("\n" + "=" * 30)
    print(f"Test 1 Result: {test1}")
    
    test2 = test_firebase_notification_for_channel()
    print("\n" + "=" * 30)
    print(f"Test 2 Result: {test2}")
    
    print("\n" + "=" * 50)
    print("�� Tests completed!") 
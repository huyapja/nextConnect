import frappe
from frappe import _


@frappe.whitelist()
def debug_firebase_status():
    """
    Debug Firebase service status
    """
    try:
        from raven.firebase_service import firebase_service, send_firebase_notification_to_user
        
        # Check Firebase service status
        status = {
            "firebase_initialized": firebase_service.initialized,
            "firebase_service_loaded": True
        }
        
        # Check tokens in database
        tokens = frappe.get_all(
            "Firebase Notification Token", 
            fields=["user", "firebase_token", "is_active"],
            limit=5
        )
        
        status["tokens_count"] = len(tokens)
        status["tokens"] = []
        
        for token in tokens:
            status["tokens"].append({
                "user": token.user,
                "token_preview": token.firebase_token[:50] + "..." if token.firebase_token else "No token",
                "is_active": token.is_active
            })
        
        return {
            "success": True,
            "status": status
        }
        
    except Exception as e:
        frappe.logger().error(f"Firebase debug error: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }


@frappe.whitelist()
def debug_send_test_notification():
    """
    Send a test Firebase notification
    """
    try:
        from raven.firebase_service import send_firebase_notification_to_user
        
        # Get current user or Administrator
        user = frappe.session.user if frappe.session.user != "Guest" else "Administrator"
        
        # Send test notification
        result = send_firebase_notification_to_user(
            user=user,
            title="🔥 Debug Test Notification",
            body=f"Test notification gửi lúc {frappe.utils.now()}",
            data={
                "type": "debug_test",
                "timestamp": frappe.utils.now(),
                "from": "debug_api",
                "click_action": frappe.utils.get_url() + "/raven"
            }
        )
        
        return {
            "success": True,
            "result": result,
            "user": user,
            "message": "Test notification sent"
        }
        
    except Exception as e:
        frappe.logger().error(f"Firebase test notification error: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "error": str(e)
        }


@frappe.whitelist()
def debug_raven_message_integration():
    """
    Check if RavenMessage integration is working
    """
    try:
        # Check if firebase_message_integration is imported
        integration_loaded = False
        try:
            import raven.firebase_message_integration
            integration_loaded = True
        except ImportError:
            pass
        
        # Check if RavenMessage class has been patched
        raven_message_patched = False
        try:
            from raven.raven_messaging.doctype.raven_message.raven_message import RavenMessage
            if hasattr(RavenMessage, '_original_send_push_notification'):
                raven_message_patched = True
        except:
            pass
        
        return {
            "success": True,
            "integration_loaded": integration_loaded,
            "raven_message_patched": raven_message_patched,
            "startup_executed": True  # If this API runs, startup was executed
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@frappe.whitelist()
def debug_firebase_detailed():
    """
    Debug Firebase messaging chi tiết
    """
    try:
        from raven.firebase_service import firebase_service
        import firebase_admin
        from firebase_admin import messaging
        
        debug_info = {
            "firebase_admin_apps": len(firebase_admin._apps),
            "firebase_service_initialized": firebase_service.initialized,
            "firebase_app_exists": firebase_service._app is not None
        }
        
        # Test messaging import
        try:
            debug_info["messaging_module_loaded"] = True
            debug_info["messaging_module_path"] = messaging.__file__
        except Exception as e:
            debug_info["messaging_module_loaded"] = False
            debug_info["messaging_error"] = str(e)
        
        # Get user token để test trực tiếp
        user = frappe.session.user if frappe.session.user != "Guest" else "Administrator"
        tokens = frappe.get_all(
            "Firebase Notification Token",
            filters={"user": user, "is_active": 1},
            fields=["firebase_token"],
            limit=1
        )
        
        if tokens:
            test_token = tokens[0].firebase_token
            debug_info["test_token_available"] = True
            debug_info["test_token_preview"] = test_token[:50] + "..."
            
            # Test gửi notification trực tiếp với Firebase Admin SDK
            try:
                notification = messaging.Notification(
                    title="🧪 Direct Firebase Test",
                    body=f"Direct test từ debug API - {frappe.utils.now()}"
                )
                
                message = messaging.Message(
                    notification=notification,
                    token=test_token,
                    data={
                        "type": "direct_test",
                        "timestamp": str(frappe.utils.now())
                    }
                )
                
                response = messaging.send(message)
                debug_info["direct_send_success"] = True
                debug_info["direct_send_response"] = response
                
            except Exception as send_error:
                debug_info["direct_send_success"] = False
                debug_info["direct_send_error"] = str(send_error)
                import traceback
                debug_info["direct_send_traceback"] = traceback.format_exc()
        else:
            debug_info["test_token_available"] = False
        
        return {
            "success": True,
            "debug_info": debug_info
        }
        
    except Exception as e:
        frappe.logger().error(f"Firebase detailed debug error: {str(e)}")
        import traceback
        return {
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc()
        }


@frappe.whitelist()
def test_manual_firebase_send():
    """
    Test gửi Firebase notification manual để bypass RavenMessage
    """
    try:
        from raven.firebase_service import send_firebase_notification_to_user
        
        # Gửi direct user notification thay vì channel
        user = frappe.session.user if frappe.session.user != "Guest" else "Administrator"
        
        result = send_firebase_notification_to_user(
            user=user,
            title="🎯 Manual Firebase Test",
            body=f"Manual test notification gửi lúc {frappe.utils.now()}",
            data={
                "type": "manual_test",
                "timestamp": frappe.utils.now(),
                "from": "manual_debug_api",
                "click_action": frappe.utils.get_url() + "/raven"
            }
        )
        
        return {
            "success": True,
            "result": result,
            "message": "Manual Firebase test sent to user",
            "user": user
        }
        
    except Exception as e:
        frappe.logger().error(f"Manual Firebase test error: {str(e)}")
        import traceback
        return {
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc()
        }


@frappe.whitelist()
def get_recent_firebase_logs():
    """
    Lấy logs Firebase gần đây để debug
    """
    try:
        # Đọc logs gần đây
        import os
        import subprocess
        
        site_path = frappe.get_site_path()
        log_file = os.path.join(site_path, "logs", "frappe.log")
        
        # Lấy 100 dòng logs cuối có chứa Firebase
        cmd = f"tail -n 500 '{log_file}' | grep -i firebase | tail -20"
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        
        logs = []
        if result.stdout:
            for line in result.stdout.strip().split('\n'):
                if line.strip():
                    logs.append(line.strip())
        
        return {
            "success": True,
            "logs": logs,
            "total_lines": len(logs)
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@frappe.whitelist()
def test_real_message_notification():
    """
    Test gửi một message thật để xem Firebase notification có hoạt động
    """
    try:
        # Import để tạo message thật
        from raven.raven_messaging.doctype.raven_message.raven_message import RavenMessage
        
        # Lấy user hiện tại
        current_user = frappe.session.user
        
        # Tìm một channel để test (tạo DM với chính mình)
        channel_list = frappe.get_all("Raven Channel", 
            filters={"is_direct_message": 1, "is_self_message": 0}, 
            limit=1
        )
        
        if not channel_list:
            # Tạo DM test channel nếu chưa có
            channel_doc = frappe.new_doc("Raven Channel")
            channel_doc.name = f"dm_test_{current_user}_{frappe.utils.now()}"
            channel_doc.channel_name = "Firebase Test DM"
            channel_doc.is_direct_message = 1
            channel_doc.is_self_message = 0
            channel_doc.insert()
            channel_id = channel_doc.name
        else:
            channel_id = channel_list[0].name
        
        # Tạo message test 
        message_doc = frappe.new_doc("Raven Message")
        message_doc.channel_id = channel_id
        message_doc.text = f"🧪 Firebase Test Message - {frappe.utils.now()}"
        message_doc.message_type = "Text"
        message_doc.owner = current_user
        
        # Log để debug
        frappe.logger().info(f"🧪 Creating test message in channel {channel_id}")
        
        # Insert message - này sẽ trigger send_push_notification
        message_doc.insert()
        
        frappe.logger().info(f"🧪 Test message created: {message_doc.name}")
        
        # Manually trigger send_push_notification để test
        frappe.logger().info(f"🧪 Manually triggering send_push_notification")
        message_doc.send_push_notification()
        
        return {
            "success": True,
            "message": "Test message created and notification triggered",
            "channel_id": channel_id,
            "message_id": message_doc.name,
            "user": current_user
        }
        
    except Exception as e:
        frappe.logger().error(f"Error testing real message notification: {str(e)}")
        import traceback
        frappe.logger().error(traceback.format_exc())
        return {
            "success": False,
            "error": str(e)
        }


@frappe.whitelist()
def check_patch_status():
    """
    Kiểm tra xem RavenMessage có được patch cho Firebase không
    """
    try:
        from raven.raven_messaging.doctype.raven_message.raven_message import RavenMessage
        
        # Kiểm tra method có được patch không
        has_original_backup = hasattr(RavenMessage, '_original_send_push_notification')
        method_source = str(RavenMessage.send_push_notification)
        
        # Check if function is patched - look for "new_send_push_notification" in function name
        is_patched = (
            "new_send_push_notification" in method_source or 
            has_original_backup  # If backup exists, it's patched
        )
        
        # Test call method (dry run)
        try:
            # Tạo mock message để test
            mock_message = type('MockMessage', (), {
                'name': 'test_mock',
                'channel_id': 'test_channel',
                'message_type': 'Text',
                'flags': type('Flags', (), {'send_silently': False})(),
                'owner': frappe.session.user
            })()
            
            # Test method call (sẽ log nếu patch hoạt động)
            frappe.logger().info("🧪 Testing patched method call...")
            # RavenMessage.send_push_notification(mock_message)  # Comment để tránh error
            
        except Exception as e:
            frappe.logger().info(f"🧪 Mock test error (expected): {str(e)}")
        
        return {
            "success": True,
            "patch_info": {
                "has_original_backup": has_original_backup,
                "method_contains_firebase": is_patched,
                "method_source_preview": method_source[:200] + "..." if len(method_source) > 200 else method_source
            }
        }
        
    except Exception as e:
        frappe.logger().error(f"Error checking patch status: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        } 
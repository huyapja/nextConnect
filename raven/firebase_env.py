import os
import frappe
from pathlib import Path

def load_firebase_env():
    """
    Load Firebase environment variables từ common_site_config.json hoặc .firebase.env file
    Priority: common_site_config.json -> .firebase.env
    """
    # Method 1: Load từ common_site_config.json (priority)
    try:
        from frappe import conf
        if hasattr(conf, 'firebase_service_account') and hasattr(conf, 'firebase_web_config'):
            frappe.logger().info("🔥 Loading Firebase config from common_site_config.json")
            
            service_account = conf.firebase_service_account
            web_config = conf.firebase_web_config
            vapid_key = getattr(conf, 'firebase_vapid_key', '')
            
            env_vars = {
                # Web SDK config
                'FIREBASE_API_KEY': web_config.get('apiKey', ''),
                'FIREBASE_AUTH_DOMAIN': web_config.get('authDomain', ''),
                'FIREBASE_PROJECT_ID': web_config.get('projectId', ''),
                'FIREBASE_STORAGE_BUCKET': web_config.get('storageBucket', ''),
                'FIREBASE_MESSAGING_SENDER_ID': web_config.get('messagingSenderId', ''),
                'FIREBASE_APP_ID': web_config.get('appId', ''),
                'FIREBASE_MEASUREMENT_ID': web_config.get('measurementId', ''),
                
                # VAPID Key
                'FIREBASE_VAPID_KEY': vapid_key,
                
                # Service Account
                'FIREBASE_SERVICE_ACCOUNT_TYPE': service_account.get('type', ''),
                'FIREBASE_SERVICE_ACCOUNT_PROJECT_ID': service_account.get('project_id', ''),
                'FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY_ID': service_account.get('private_key_id', ''),
                'FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY': service_account.get('private_key', ''),
                'FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL': service_account.get('client_email', ''),
                'FIREBASE_SERVICE_ACCOUNT_CLIENT_ID': service_account.get('client_id', ''),
                'FIREBASE_SERVICE_ACCOUNT_AUTH_URI': service_account.get('auth_uri', ''),
                'FIREBASE_SERVICE_ACCOUNT_TOKEN_URI': service_account.get('token_uri', ''),
                'FIREBASE_SERVICE_ACCOUNT_AUTH_PROVIDER_X509_CERT_URL': service_account.get('auth_provider_x509_cert_url', ''),
                'FIREBASE_SERVICE_ACCOUNT_CLIENT_X509_CERT_URL': service_account.get('client_x509_cert_url', ''),
                'FIREBASE_SERVICE_ACCOUNT_UNIVERSE_DOMAIN': service_account.get('universe_domain', 'googleapis.com')
            }
            
            frappe.logger().info(f"✅ Loaded Firebase config from common_site_config.json")
            return env_vars
            
    except Exception as e:
        frappe.logger().warning(f"⚠️ Could not load from common_site_config.json: {str(e)}")
    
    # Method 2: Fallback to .firebase.env file
    app_path = frappe.get_app_path("raven")
    env_file = Path(app_path).parent / ".firebase.env"
    
    if not env_file.exists():
        frappe.logger().warning(f"🔸 Firebase env file not found: {env_file}")
        return {}
    
    env_vars = {}
    try:
        with open(env_file, 'r') as f:
            for line in f:
                line = line.strip()
                # Skip comments and empty lines
                if line and not line.startswith('#'):
                    if '=' in line:
                        key, value = line.split('=', 1)
                        # Remove quotes from value if present
                        value = value.strip('"').strip("'")
                        env_vars[key.strip()] = value
                        
        frappe.logger().info(f"📄 Loaded {len(env_vars)} Firebase environment variables from .firebase.env")
        return env_vars
        
    except Exception as e:
        frappe.logger().error(f"❌ Error loading Firebase env file: {str(e)}")
        return {}

def get_firebase_config():
    """
    Get Firebase Web SDK configuration from environment
    """
    env_vars = load_firebase_env()
    
    return {
        "apiKey": env_vars.get("FIREBASE_API_KEY", ""),
        "authDomain": env_vars.get("FIREBASE_AUTH_DOMAIN", ""),
        "projectId": env_vars.get("FIREBASE_PROJECT_ID", ""),
        "storageBucket": env_vars.get("FIREBASE_STORAGE_BUCKET", ""),
        "messagingSenderId": env_vars.get("FIREBASE_MESSAGING_SENDER_ID", ""),
        "appId": env_vars.get("FIREBASE_APP_ID", ""),
        "measurementId": env_vars.get("FIREBASE_MEASUREMENT_ID", "")
    }

def get_firebase_vapid_key():
    """
    Get Firebase VAPID key from environment
    """
    env_vars = load_firebase_env()
    return env_vars.get("FIREBASE_VAPID_KEY", "")

def get_firebase_service_account():
    """
    Get Firebase Service Account configuration from environment
    """
    env_vars = load_firebase_env()
    
    return {
        "type": env_vars.get("FIREBASE_SERVICE_ACCOUNT_TYPE", "service_account"),
        "project_id": env_vars.get("FIREBASE_SERVICE_ACCOUNT_PROJECT_ID", ""),
        "private_key_id": env_vars.get("FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY_ID", ""),
        "private_key": env_vars.get("FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY", "").replace('\\n', '\n'),
        "client_email": env_vars.get("FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL", ""),
        "client_id": env_vars.get("FIREBASE_SERVICE_ACCOUNT_CLIENT_ID", ""),
        "auth_uri": env_vars.get("FIREBASE_SERVICE_ACCOUNT_AUTH_URI", "https://accounts.google.com/o/oauth2/auth"),
        "token_uri": env_vars.get("FIREBASE_SERVICE_ACCOUNT_TOKEN_URI", "https://oauth2.googleapis.com/token"),
        "auth_provider_x509_cert_url": env_vars.get("FIREBASE_SERVICE_ACCOUNT_AUTH_PROVIDER_X509_CERT_URL", "https://www.googleapis.com/oauth2/v1/certs"),
        "client_x509_cert_url": env_vars.get("FIREBASE_SERVICE_ACCOUNT_CLIENT_X509_CERT_URL", ""),
        "universe_domain": env_vars.get("FIREBASE_SERVICE_ACCOUNT_UNIVERSE_DOMAIN", "googleapis.com")
    } 
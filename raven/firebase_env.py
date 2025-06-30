import os
import frappe
from pathlib import Path

def load_firebase_env():
    """
    Load Firebase environment variables từ .firebase.env file
    """
    # Path to .firebase.env file in app root
    app_path = frappe.get_app_path("raven")
    env_file = Path(app_path).parent / ".firebase.env"
    
    if not env_file.exists():
        frappe.logger().warning(f"Firebase env file not found: {env_file}")
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
                        
        frappe.logger().info(f"Loaded {len(env_vars)} Firebase environment variables")
        return env_vars
        
    except Exception as e:
        frappe.logger().error(f"Error loading Firebase env file: {str(e)}")
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
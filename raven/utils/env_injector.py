import frappe
import os

def inject_env_vars_to_frontend():
    """
    Inject biến môi trường vào frontend thông qua window.__ENV__
    """
    env_vars = {
        'FIREBASE_API_KEY': os.getenv('FIREBASE_API_KEY'),
        'FIREBASE_AUTH_DOMAIN': os.getenv('FIREBASE_AUTH_DOMAIN'),
        'FIREBASE_PROJECT_ID': os.getenv('FIREBASE_PROJECT_ID'),
        'FIREBASE_STORAGE_BUCKET': os.getenv('FIREBASE_STORAGE_BUCKET'),
        'FIREBASE_MESSAGING_SENDER_ID': os.getenv('FIREBASE_MESSAGING_SENDER_ID'),
        'FIREBASE_APP_ID': os.getenv('FIREBASE_APP_ID'),
        'FIREBASE_MEASUREMENT_ID': os.getenv('FIREBASE_MEASUREMENT_ID'),
        'VAPID_KEY': os.getenv('VAPID_KEY'),
        'TENOR_API_KEY': os.getenv('TENOR_API_KEY'),
        'STRINGEE_API_KEY_SID': os.getenv('STRINGEE_API_KEY_SID'),
        'STRINGEE_API_KEY_SECRET': os.getenv('STRINGEE_API_KEY_SECRET'),
    }
    
    # Lọc bỏ các giá trị None
    env_vars = {k: v for k, v in env_vars.items() if v is not None}
    
    # Tạo script để inject vào frontend
    script = f"""
    <script>
        window.__ENV__ = {frappe.as_json(env_vars)};
    </script>
    """
    
    return script

def add_env_meta_tags():
    """
    Thêm meta tags chứa biến môi trường
    """
    env_vars = {
        'FIREBASE_API_KEY': os.getenv('FIREBASE_API_KEY'),
        'FIREBASE_AUTH_DOMAIN': os.getenv('FIREBASE_AUTH_DOMAIN'),
        'FIREBASE_PROJECT_ID': os.getenv('FIREBASE_PROJECT_ID'),
        'FIREBASE_STORAGE_BUCKET': os.getenv('FIREBASE_STORAGE_BUCKET'),
        'FIREBASE_MESSAGING_SENDER_ID': os.getenv('FIREBASE_MESSAGING_SENDER_ID'),
        'FIREBASE_APP_ID': os.getenv('FIREBASE_APP_ID'),
        'FIREBASE_MEASUREMENT_ID': os.getenv('FIREBASE_MEASUREMENT_ID'),
        'VAPID_KEY': os.getenv('VAPID_KEY'),
        'TENOR_API_KEY': os.getenv('TENOR_API_KEY'),
        'STRINGEE_API_KEY_SID': os.getenv('STRINGEE_API_KEY_SID'),
        'STRINGEE_API_KEY_SECRET': os.getenv('STRINGEE_API_KEY_SECRET'),
    }
    
    meta_tags = []
    for key, value in env_vars.items():
        if value is not None:
            meta_tags.append(f'<meta name="{key}" content="{value}">')
    
    return '\n'.join(meta_tags) 
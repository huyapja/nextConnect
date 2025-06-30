#!/usr/bin/env python3

import os
import sys
from pathlib import Path

def debug_firebase_env():
    """Debug Firebase environment variables loading"""
    
    # Get .firebase.env path
    script_dir = Path(__file__).parent
    env_file = script_dir / ".firebase.env"
    
    print(f"🔍 Checking Firebase env file: {env_file}")
    print(f"📁 File exists: {env_file.exists()}")
    
    if not env_file.exists():
        print("❌ .firebase.env file not found!")
        return
    
    # Read and parse env file
    env_vars = {}
    try:
        with open(env_file, 'r') as f:
            lines = f.readlines()
            
        print(f"📄 Total lines: {len(lines)}")
        
        for i, line in enumerate(lines, 1):
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                value = value.strip('"').strip("'")
                env_vars[key.strip()] = value
                
                # Print key with masked value
                if 'PRIVATE_KEY' in key:
                    print(f"  {key}: ***PRIVATE_KEY*** (length: {len(value)})")
                elif 'API_KEY' in key or 'VAPID' in key:
                    print(f"  {key}: {value[:10]}***")
                else:
                    print(f"  {key}: {value}")
        
        print(f"\n✅ Loaded {len(env_vars)} environment variables")
        
        # Validate critical fields
        critical_fields = [
            'FIREBASE_PROJECT_ID',
            'FIREBASE_API_KEY', 
            'FIREBASE_VAPID_KEY',
            'FIREBASE_SERVICE_ACCOUNT_PROJECT_ID',
            'FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY',
            'FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL'
        ]
        
        print("\n🔍 Critical fields validation:")
        missing_fields = []
        for field in critical_fields:
            if field in env_vars and env_vars[field]:
                print(f"  ✅ {field}: OK")
            else:
                print(f"  ❌ {field}: MISSING or EMPTY")
                missing_fields.append(field)
        
        if missing_fields:
            print(f"\n❌ Missing critical fields: {missing_fields}")
        else:
            print("\n✅ All critical fields present")
        
        # Test private key format
        private_key = env_vars.get('FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY', '')
        if private_key:
            print(f"\n🔑 Private Key Analysis:")
            print(f"  Length: {len(private_key)}")
            print(f"  Starts with BEGIN: {private_key.startswith('-----BEGIN')}")
            print(f"  Ends with END: {private_key.endswith('-----')}")
            
            # Define newline character outside f-string to avoid syntax error
            newline_char = '\\n'
            print(f"  Contains newlines: {newline_char in private_key}")
            
            # Count newlines
            newline_count = private_key.count(newline_char)
            print(f"  Newline count: {newline_count}")
            
            if newline_count < 25:  # Typical private key has ~26-27 lines
                print("  ⚠️  Warning: Newline count seems low")
        
    except Exception as e:
        print(f"❌ Error reading env file: {e}")

if __name__ == "__main__":
    debug_firebase_env() 
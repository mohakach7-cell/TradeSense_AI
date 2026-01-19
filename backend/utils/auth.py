import os
from functools import wraps
from flask import request, jsonify
from supabase import create_client, Client

def get_supabase_client():
    url = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
    key = os.getenv("SUPABASE_ANON_KEY") or os.getenv("VITE_SUPABASE_PUBLISHABLE_KEY")
    if not url or not key:
        return None
    return create_client(url, key)

def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({"error": "Authentication required"}), 401
        
        token = auth_header.replace('Bearer ', '')
        supabase = get_supabase_client()
        if not supabase:
             return jsonify({"error": "Server configuration error"}), 500

        try:
            # Verify the token
            user_response = supabase.auth.get_user(token)
            if not user_response or not user_response.user:
                return jsonify({"error": "Invalid authentication"}), 401
            
            # You can attach user to request if needed
            # request.user = user_response.user
            
        except Exception as e:
            return jsonify({"error": str(e)}), 401
            
        return f(*args, **kwargs)
    return decorated

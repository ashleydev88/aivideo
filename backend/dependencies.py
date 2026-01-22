from fastapi import HTTPException, Header
from backend.db import supabase

def get_user_id_from_token(authorization: str = None) -> str:
    """
    Extract user_id from Supabase JWT token.
    Returns the user's UUID or raises HTTPException if invalid.
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
    
    # Extract token from "Bearer <token>" format
    token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
    
    try:
        # Use Supabase to verify the token and get user
        user_response = supabase.auth.get_user(token)
        if user_response and user_response.user:
            return str(user_response.user.id)
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    except Exception as e:
        print(f"❌ Auth Error: {e}")
        raise HTTPException(status_code=401, detail="Authentication failed")

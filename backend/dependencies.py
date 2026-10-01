"""
dependencies.py — FastAPI "dependencies" are reusable functions that
run automatically before a route's own code, given the incoming request.
We use them here for three things: knowing who's making the request,
rejecting the wrong role, and (for a few public-but-personalized
endpoints, like the announcement feed) knowing who's asking WITHOUT
requiring a login at all.
"""
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError

from auth import decode_access_token
from database import supabase

security = HTTPBearer()
security_optional = HTTPBearer(auto_error=False)


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    token = credentials.credentials
    try:
        payload = decode_access_token(token)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session. Please log in again.",
        )

    user_id = payload.get("sub")
    result = supabase.table("users").select("*").eq("id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User no longer exists.")

    return result.data[0]


def require_role(required_role: str):
    def role_checker(current_user: dict = Depends(get_current_user)) -> dict:
        if current_user["role"] != required_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This action requires the '{required_role}' role.",
            )
        return current_user
    return role_checker


def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_optional),
) -> Optional[dict]:
    """
    Like get_current_user, but never raises 401 — a missing, invalid, or
    expired token just means "anonymous visitor" instead of an error.
    Used by endpoints (like the announcement feed) that work for both
    logged-out visitors and logged-in users, showing different content
    to each rather than requiring a login at all.
    """
    if credentials is None:
        return None
    try:
        payload = decode_access_token(credentials.credentials)
    except JWTError:
        return None

    user_id = payload.get("sub")
    result = supabase.table("users").select("*").eq("id", user_id).execute()
    if not result.data:
        return None
    return result.data[0]
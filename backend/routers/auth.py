"""
routers/auth.py — signup and login. These are the only two routes
in the whole app that don't require an existing token (obviously —
you need login to GET a token in the first place).
"""
from fastapi import APIRouter, HTTPException, status

from database import supabase
from models import SignupRequest, LoginRequest, TokenResponse, UserOut
from auth import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])


def _to_user_out(row: dict) -> UserOut:
    return UserOut(
        id=row["id"],
        role=row["role"],
        first_name=row["first_name"],
        last_name=row["last_name"],
        middle_name=row.get("middle_name") or "",
        id_number=row["id_number"],
        year_level=row.get("year_level"),
        department=row.get("department"),
        course=row.get("course"),
    )


@router.post("/signup", response_model=TokenResponse)
def signup(data: SignupRequest):
    if data.role not in ("student", "teacher"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Role must be 'student' or 'teacher'.")

    if data.password != data.confirm_password:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Passwords do not match.")

    if len(data.password) < 6:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Password must be at least 6 characters.")

    existing = supabase.table("users").select("id").eq("id_number", data.id_number).execute()
    if existing.data:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "That ID number is already registered.")

    new_user = {
        "role": data.role,
        "first_name": data.first_name,
        "last_name": data.last_name,
        "middle_name": data.middle_name or "",
        "id_number": data.id_number,
        "password_hash": hash_password(data.password),
        "year_level": data.year_level if data.role == "student" else None,
        "department": data.department,
        "course": data.course if data.role == "student" else None,
    }

    result = supabase.table("users").insert(new_user).execute()
    created = result.data[0]

    token = create_access_token(user_id=created["id"], role=created["role"])
    return TokenResponse(access_token=token, user=_to_user_out(created))

@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest):
    result = supabase.table("users").select("*").eq("id_number", data.id_number).execute()

    if not result.data:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid ID number or password.")

    user = result.data[0]

    if not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid ID number or password.")

    token = create_access_token(user_id=user["id"], role=user["role"])
    return TokenResponse(access_token=token, user=_to_user_out(user))
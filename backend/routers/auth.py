"""
routers/auth.py — signup and login. These are the only two routes
in the whole app that don't require an existing token.
Professor accounts must use an ID number ending in the letter P
(e.g. 2020-12345P); students use their plain ID number.
"""
from fastapi import APIRouter, HTTPException, status

from database import supabase
from models import SignupRequest, LoginRequest, TokenResponse, UserOut
from auth import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])


def _to_user_out(row: dict) -> UserOut:
    return UserOut(
        id=row["id"], role=row["role"], first_name=row["first_name"], last_name=row["last_name"],
        middle_name=row.get("middle_name") or "", id_number=row["id_number"],
        year_level=row.get("year_level"), department=row.get("department"), course=row.get("course"),
        birthdate=row.get("birthdate"), gender=row.get("gender"), status=row.get("status"),
        valid_until=row.get("valid_until"), contact_number=row.get("contact_number"),
        address=row.get("address"), emergency_contact_name=row.get("emergency_contact_name"),
        emergency_contact_number=row.get("emergency_contact_number"), email=row.get("email"),
        personal_quote=row.get("personal_quote"),
        photo_id=row.get("photo_id"), created_at=row.get("created_at"),
    )


def _normalize_id(id_number: str) -> str:
    """Trim spaces and turn a trailing lowercase 'p' into 'P'."""
    id_number = id_number.strip()
    if id_number.endswith("p"):
        id_number = id_number[:-1] + "P"
    return id_number


@router.post("/signup", response_model=TokenResponse)
def signup(data: SignupRequest):
    if data.role not in ("student", "teacher"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Role must be 'student' or 'teacher'.")

    if data.password != data.confirm_password:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Passwords do not match.")

    if len(data.password) < 6:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Password must be at least 6 characters.")

    id_number = _normalize_id(data.id_number)
    if data.role == "teacher" and not id_number.endswith("P"):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Professor ID numbers must end with the letter P (e.g. 2020-12345P).",
        )

    existing = supabase.table("users").select("id").eq("id_number", id_number).execute()
    if existing.data:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "That ID number is already registered.")

    new_user = {
        "role": data.role,
        "first_name": data.first_name,
        "last_name": data.last_name,
        "middle_name": data.middle_name or "",
        "id_number": id_number,
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
    id_number = _normalize_id(data.id_number)
    result = supabase.table("users").select("*").eq("id_number", id_number).execute()

    if not result.data:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid ID number or password.")

    user = result.data[0]

    if not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid ID number or password.")

    token = create_access_token(user_id=user["id"], role=user["role"])
    return TokenResponse(access_token=token, user=_to_user_out(user))
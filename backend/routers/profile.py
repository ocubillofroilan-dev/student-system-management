"""
routers/profile.py — view/edit YOUR OWN profile. No route here ever
takes a user id as a parameter — "profile" always means "me."
"""
from fastapi import APIRouter, Depends, HTTPException

from database import supabase
from dependencies import get_current_user
from models import ProfileUpdateRequest, UserOut

router = APIRouter(prefix="/profile", tags=["profile"])


def _to_user_out(row: dict) -> UserOut:
    return UserOut(
        id=row["id"], role=row["role"], first_name=row["first_name"], last_name=row["last_name"],
        middle_name=row.get("middle_name") or "", id_number=row["id_number"],
        year_level=row.get("year_level"), department=row.get("department"), course=row.get("course"),
    )


@router.get("", response_model=UserOut)
def get_my_profile(current_user: dict = Depends(get_current_user)):
    return _to_user_out(current_user)


@router.put("", response_model=UserOut)
def update_my_profile(payload: ProfileUpdateRequest, current_user: dict = Depends(get_current_user)):
    updates = payload.dict()
    result = (
        supabase.table("users")
        .update(updates)
        .eq("id", current_user["id"])
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=500, detail="Could not update profile.")
    return _to_user_out(result.data[0])
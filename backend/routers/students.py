"""
routers/students.py — teacher-only list of all students, used to
populate the dropdown pickers on the attendance and grades pages.
"""
from fastapi import APIRouter, Depends

from database import supabase
from dependencies import require_role
from models import UserOut

router = APIRouter(prefix="/students", tags=["students"])


@router.get("", response_model=list[UserOut])
def list_students(teacher: dict = Depends(require_role("teacher"))):
    result = (
        supabase.table("users")
        .select("*")
        .eq("role", "student")
        .order("last_name")
        .execute()
    )
    return [
        UserOut(
            id=r["id"], role=r["role"], first_name=r["first_name"], last_name=r["last_name"],
            middle_name=r.get("middle_name") or "", id_number=r["id_number"],
            year_level=r.get("year_level"), department=r.get("department"), course=r.get("course"),
        )
        for r in result.data
    ]
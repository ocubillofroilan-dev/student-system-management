"""
routers/attendance.py — teachers see and record everyone's attendance;
students see ONLY their own. This filtering happens in the query
itself, not just at the "can you access this endpoint at all" level.
"""
from fastapi import APIRouter, Depends, HTTPException

from database import supabase
from dependencies import get_current_user, require_role
from models import AttendanceCreate

router = APIRouter(prefix="/attendance", tags=["attendance"])


@router.get("")
def list_attendance(current_user: dict = Depends(get_current_user)):
    # "attendance" has two foreign keys pointing at users (student_id AND
    # recorded_by), so we must name which relationship we mean.
    query = supabase.table("attendance").select(
        "*, courses(code), users!attendance_student_id_fkey(first_name, last_name)"
    )

    if current_user["role"] == "student":
        query = query.eq("student_id", current_user["id"])

    result = query.order("date", desc=True).execute()
    out = []
    for row in result.data:
        course = row.get("courses") or {}
        student = row.get("users") or {}
        out.append({
            "id": row["id"], "student_id": row["student_id"], "course_id": row["course_id"],
            "date": row["date"], "status": row["status"], "course_code": course.get("code"),
            "student_name": f"{student.get('first_name','')} {student.get('last_name','')}".strip() or None,
        })
    return out


@router.post("")
def record_attendance(payload: AttendanceCreate, teacher: dict = Depends(require_role("teacher"))):
    data = payload.dict()
    data["recorded_by"] = teacher["id"]
    result = supabase.table("attendance").insert(data).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Could not record attendance.")
    return result.data[0]
"""
routers/attendance.py — teachers see and record everyone's attendance;
students see ONLY their own. Saving a status for a student+course+date
that already has a record UPDATES it instead of creating a duplicate,
so the calendar's "edit this date" flow can be called repeatedly.
"""
from fastapi import APIRouter, Depends, HTTPException

from database import supabase
from dependencies import get_current_user, require_role
from models import AttendanceCreate

router = APIRouter(prefix="/attendance", tags=["attendance"])


@router.get("")
def list_attendance(current_user: dict = Depends(get_current_user)):
    query = supabase.table("attendance").select(
        "*, courses(code, title), users!attendance_student_id_fkey(first_name, last_name)"
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
            "date": row["date"], "status": row["status"],
            "course_code": course.get("code"), "course_title": course.get("title"),
            "student_name": f"{student.get('first_name','')} {student.get('last_name','')}".strip() or None,
        })
    return out


@router.post("")
def record_attendance(payload: AttendanceCreate, teacher: dict = Depends(require_role("teacher"))):
    existing = (
        supabase.table("attendance")
        .select("id")
        .eq("student_id", payload.student_id)
        .eq("course_id", payload.course_id)
        .eq("date", payload.date)
        .execute()
    )

    if existing.data:
        result = supabase.table("attendance").update({"status": payload.status}).eq("id", existing.data[0]["id"]).execute()
    else:
        data = payload.dict()
        data["recorded_by"] = teacher["id"]
        result = supabase.table("attendance").insert(data).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Could not save attendance.")
    return result.data[0]
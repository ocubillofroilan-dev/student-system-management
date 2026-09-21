"""
routers/schedule.py — teachers manage the full schedule. Students see
schedule entries only for courses they're actually ENROLLED in (via
the enrollments table), not just courses matching their program.
"""
from fastapi import APIRouter, Depends, HTTPException

from database import supabase
from dependencies import get_current_user, require_role
from models import ScheduleCreate

router = APIRouter(prefix="/schedule", tags=["schedule"])


@router.get("")
def list_schedule(current_user: dict = Depends(get_current_user)):
    result = (
        supabase.table("schedules")
        .select("*, courses(code, title, program), users!schedules_created_by_fkey(first_name, last_name)")
        .order("day_of_week")
        .execute()
    )

    enrolled_ids = None
    if current_user["role"] == "student":
        enrolled = supabase.table("enrollments").select("course_id").eq("student_id", current_user["id"]).execute()
        enrolled_ids = {row["course_id"] for row in enrolled.data}

    out = []
    for row in result.data:
        if enrolled_ids is not None and row["course_id"] not in enrolled_ids:
            continue
        course = row.get("courses") or {}
        professor = row.get("users") or {}
        out.append({
            "id": row["id"], "course_id": row["course_id"], "day_of_week": row["day_of_week"],
            "start_time": row["start_time"], "end_time": row["end_time"], "room": row.get("room") or "",
            "course_code": course.get("code"), "course_title": course.get("title"),
            "course_program": course.get("program"),
            "professor_name": f"{professor.get('first_name', '')} {professor.get('last_name', '')}".strip() or None,
        })
    return out


@router.post("")
def create_schedule(payload: ScheduleCreate, teacher: dict = Depends(require_role("teacher"))):
    data = payload.dict()
    data["created_by"] = teacher["id"]
    result = supabase.table("schedules").insert(data).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Could not create schedule entry.")
    return result.data[0]


@router.delete("/{schedule_id}")
def delete_schedule(schedule_id: str, teacher: dict = Depends(require_role("teacher"))):
    supabase.table("schedules").delete().eq("id", schedule_id).execute()
    return {"message": "Schedule entry deleted."}
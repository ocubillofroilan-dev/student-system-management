"""
routers/schedule.py — teachers manage the full schedule. Students see
only entries whose course belongs to their own department + program —
matched loosely (case-insensitive, trimmed), so "BS Computer Science"
and "bs computer science " still count as the same program.
"""
from fastapi import APIRouter, Depends, HTTPException

from database import supabase
from dependencies import get_current_user, require_role
from models import ScheduleCreate

router = APIRouter(prefix="/schedule", tags=["schedule"])


def _normalize(value: str) -> str:
    return (value or "").strip().lower()


@router.get("")
def list_schedule(current_user: dict = Depends(get_current_user)):
    result = (
        supabase.table("schedules")
        .select("*, courses(code, title, department, program), users!schedules_created_by_fkey(first_name, last_name)")
        .order("day_of_week")
        .execute()
    )

    my_dept = _normalize(current_user.get("department"))
    my_program = _normalize(current_user.get("course"))

    out = []
    for row in result.data:
        course = row.get("courses") or {}
        professor = row.get("users") or {}

        if current_user["role"] == "student":
            if _normalize(course.get("department")) != my_dept or _normalize(course.get("program")) != my_program:
                continue

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
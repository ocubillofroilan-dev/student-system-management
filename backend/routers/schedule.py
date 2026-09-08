"""
routers/schedule.py — anyone logged in can view the schedule;
only teachers can add or remove entries.
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
        .select("*, courses(code, title)")
        .order("day_of_week")
        .execute()
    )
    out = []
    for row in result.data:
        course = row.get("courses") or {}
        out.append({
            "id": row["id"], "course_id": row["course_id"], "day_of_week": row["day_of_week"],
            "start_time": row["start_time"], "end_time": row["end_time"], "room": row.get("room") or "",
            "course_code": course.get("code"), "course_title": course.get("title"),
        })
    return out


@router.post("")
def create_schedule(payload: ScheduleCreate, teacher: dict = Depends(require_role("teacher"))):
    result = supabase.table("schedules").insert(payload.dict()).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Could not create schedule entry.")
    return result.data[0]


@router.delete("/{schedule_id}")
def delete_schedule(schedule_id: str, teacher: dict = Depends(require_role("teacher"))):
    supabase.table("schedules").delete().eq("id", schedule_id).execute()
    return {"message": "Schedule entry deleted."}
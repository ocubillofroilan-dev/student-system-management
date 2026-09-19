"""
routers/courses.py — any logged-in user can view courses, but a
STUDENT only ever sees courses whose department + program match their
own — so a Calculus course added under Mechanical Engineering never
shows up for a Civil Engineering student. Teachers see and manage
every course, across every program.
"""
from fastapi import APIRouter, Depends, HTTPException

from database import supabase
from dependencies import get_current_user, require_role
from models import CourseCreate

router = APIRouter(prefix="/courses", tags=["courses"])


@router.get("")
def list_courses(current_user: dict = Depends(get_current_user)):
    query = supabase.table("courses").select("*")

    if current_user["role"] == "student":
        query = (
            query.eq("department", current_user.get("department") or "")
                 .eq("program", current_user.get("course") or "")
        )

    result = query.order("code").execute()
    return result.data


@router.post("")
def create_course(payload: CourseCreate, teacher: dict = Depends(require_role("teacher"))):
    result = supabase.table("courses").insert(payload.dict()).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Could not create course.")
    return result.data[0]


@router.put("/{course_id}")
def update_course(course_id: str, payload: CourseCreate, teacher: dict = Depends(require_role("teacher"))):
    result = supabase.table("courses").update(payload.dict()).eq("id", course_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Course not found.")
    return result.data[0]


@router.delete("/{course_id}")
def delete_course(course_id: str, teacher: dict = Depends(require_role("teacher"))):
    supabase.table("courses").delete().eq("id", course_id).execute()
    return {"message": "Course deleted."}
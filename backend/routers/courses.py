"""
routers/courses.py — teachers manage the full catalog. Students browse
"available" courses, enroll, and can also unenroll (remove) a course
they previously picked, which puts it back into "available".
"""
from fastapi import APIRouter, Depends, HTTPException

from database import supabase
from dependencies import get_current_user, require_role
from models import CourseCreate

router = APIRouter(prefix="/courses", tags=["courses"])


@router.get("")
def list_courses(current_user: dict = Depends(get_current_user)):
    if current_user["role"] == "student":
        result = (
            supabase.table("enrollments")
            .select("courses(*)")
            .eq("student_id", current_user["id"])
            .execute()
        )
        return [row["courses"] for row in result.data if row.get("courses")]

    result = supabase.table("courses").select("*").order("code").execute()
    return result.data


@router.get("/available")
def list_available_courses(student: dict = Depends(require_role("student"))):
    enrolled = supabase.table("enrollments").select("course_id").eq("student_id", student["id"]).execute()
    enrolled_ids = {row["course_id"] for row in enrolled.data}
    all_courses = supabase.table("courses").select("*").order("code").execute()
    return [c for c in all_courses.data if c["id"] not in enrolled_ids]


@router.post("/{course_id}/enroll")
def enroll_course(course_id: str, student: dict = Depends(require_role("student"))):
    existing = (
        supabase.table("enrollments").select("id")
        .eq("student_id", student["id"]).eq("course_id", course_id).execute()
    )
    if existing.data:
        raise HTTPException(status_code=400, detail="Already enrolled in this course.")
    result = supabase.table("enrollments").insert({"student_id": student["id"], "course_id": course_id}).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Could not enroll in this course.")
    return result.data[0]


@router.delete("/{course_id}/enroll")
def unenroll_course(course_id: str, student: dict = Depends(require_role("student"))):
    supabase.table("enrollments").delete().eq("student_id", student["id"]).eq("course_id", course_id).execute()
    return {"message": "Removed from your courses."}


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
"""
routers/grades.py — same access pattern as attendance: teachers see
everyone, students see only their own records.
"""
from fastapi import APIRouter, Depends, HTTPException

from database import supabase
from dependencies import get_current_user, require_role
from models import GradeCreate

router = APIRouter(prefix="/grades", tags=["grades"])


@router.get("")
def list_grades(current_user: dict = Depends(get_current_user)):
    query = supabase.table("grades").select(
        "*, courses(code, title), users!grades_student_id_fkey(first_name, last_name)"
    )

    if current_user["role"] == "student":
        query = query.eq("student_id", current_user["id"])

    result = query.execute()
    out = []
    for row in result.data:
        course = row.get("courses") or {}
        student = row.get("users") or {}
        out.append({
            "id": row["id"], "student_id": row["student_id"], "course_id": row["course_id"],
            "grading_period": row["grading_period"], "grade": row["grade"],
            "course_code": course.get("code"), "course_title": course.get("title"),
            "student_name": f"{student.get('first_name','')} {student.get('last_name','')}".strip() or None,
        })
    return out


@router.post("")
def record_grade(payload: GradeCreate, teacher: dict = Depends(require_role("teacher"))):
    data = payload.dict()
    data["recorded_by"] = teacher["id"]
    result = supabase.table("grades").insert(data).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Could not save grade.")
    return result.data[0]
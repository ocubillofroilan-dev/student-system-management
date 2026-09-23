"""
routers/grades.py — teachers see and record every student's grades.
Students see only their own, including which professor recorded it.
"grades" has two foreign keys into users (student_id, recorded_by),
so the professor join needs an alias to avoid colliding with the
student join, both of which come from the same "users" table.
"""
from fastapi import APIRouter, Depends, HTTPException

from database import supabase
from dependencies import get_current_user, require_role
from models import GradeCreate

router = APIRouter(prefix="/grades", tags=["grades"])


@router.get("")
def list_grades(current_user: dict = Depends(get_current_user)):
    query = supabase.table("grades").select(
        "*, courses(code, title), "
        "users!grades_student_id_fkey(first_name, last_name), "
        "professor:users!grades_recorded_by_fkey(first_name, last_name)"
    )

    if current_user["role"] == "student":
        query = query.eq("student_id", current_user["id"])

    result = query.execute()
    out = []
    for row in result.data:
        course = row.get("courses") or {}
        student = row.get("users") or {}
        professor = row.get("professor") or {}
        out.append({
            "id": row["id"], "student_id": row["student_id"], "course_id": row["course_id"],
            "grading_period": row["grading_period"], "grade": row["grade"],
            "course_code": course.get("code"), "course_title": course.get("title"),
            "student_name": f"{student.get('first_name','')} {student.get('last_name','')}".strip() or None,
            "professor_name": f"{professor.get('first_name','')} {professor.get('last_name','')}".strip() or None,
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
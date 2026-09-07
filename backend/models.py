"""
models.py — Pydantic models define the exact shape of data going
in and out of every endpoint. FastAPI uses these to validate
incoming requests automatically and to shape outgoing responses.
"""
from pydantic import BaseModel
from typing import Optional


class SignupRequest(BaseModel):
    role: str  # "student" or "teacher"
    first_name: str
    last_name: str
    middle_name: Optional[str] = ""
    id_number: str
    password: str
    confirm_password: str
    year_level: Optional[str] = None
    department: Optional[str] = None
    course: Optional[str] = None


class LoginRequest(BaseModel):
    id_number: str
    password: str


class UserOut(BaseModel):
    id: str
    role: str
    first_name: str
    last_name: str
    middle_name: Optional[str] = ""
    id_number: str
    year_level: Optional[str] = None
    department: Optional[str] = None
    course: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    user: UserOut


class ProfileUpdateRequest(BaseModel):
    first_name: str
    last_name: str
    middle_name: Optional[str] = ""
    department: Optional[str] = None
    year_level: Optional[str] = None
    course: Optional[str] = None


class AnnouncementCreate(BaseModel):
    title: str
    body: str


class CourseCreate(BaseModel):
    code: str
    title: str
    department: Optional[str] = ""
    units: Optional[int] = 3
    description: Optional[str] = ""

class ScheduleCreate(BaseModel):
    course_id: str
    day_of_week: str
    start_time: str
    end_time: str
    room: Optional[str] = ""


class AttendanceCreate(BaseModel):
    student_id: str
    course_id: str
    date: str
    status: str  # "present", "absent", or "late"


class GradeCreate(BaseModel):
    student_id: str
    course_id: str
    grading_period: str
    grade: str
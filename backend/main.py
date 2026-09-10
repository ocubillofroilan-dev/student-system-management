"""
main.py — the entry point. `uvicorn main:app --reload` runs this file
and serves the `app` object defined here. Everything else (config,
database, auth, routers) gets assembled together in this one place.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import CORS_ORIGINS
from routers import auth, profile, announcements, courses, schedule, attendance, grades, students

app = FastAPI(
    title="Northbridge College - Student System Management API",
    description="REST API for the Student System Management project (FastAPI + Supabase Postgres).",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(profile.router)
app.include_router(announcements.router)
app.include_router(courses.router)
app.include_router(schedule.router)
app.include_router(attendance.router)
app.include_router(grades.router)
app.include_router(students.router)


@app.get("/")
def root():
    return {"message": "Student System Management API is running. See /docs for the interactive API explorer."}
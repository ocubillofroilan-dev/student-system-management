"""
routers/announcements.py — public GET (shown on the homepage too),
teacher-only POST and DELETE.
"""
from fastapi import APIRouter, Depends, HTTPException

from database import supabase
from dependencies import require_role
from models import AnnouncementCreate

router = APIRouter(prefix="/announcements", tags=["announcements"])


@router.get("")
def list_announcements():
    result = (
        supabase.table("announcements")
        .select("*, users(first_name, last_name)")
        .order("created_at", desc=True)
        .execute()
    )
    out = []
    for row in result.data:
        poster = row.get("users") or {}
        out.append({
            "id": row["id"],
            "title": row["title"],
            "body": row["body"],
            "created_at": row.get("created_at"),
            "posted_by_name": f"{poster.get('first_name', '')} {poster.get('last_name', '')}".strip() or None,
        })
    return out


@router.post("")
def create_announcement(payload: AnnouncementCreate, teacher: dict = Depends(require_role("teacher"))):
    result = (
        supabase.table("announcements")
        .insert({**payload.dict(), "posted_by": teacher["id"]})
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=500, detail="Could not post announcement.")
    return result.data[0]


@router.delete("/{announcement_id}")
def delete_announcement(announcement_id: str, teacher: dict = Depends(require_role("teacher"))):
    supabase.table("announcements").delete().eq("id", announcement_id).execute()
    return {"message": "Announcement deleted."}
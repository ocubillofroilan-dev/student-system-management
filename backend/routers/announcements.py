"""
routers/announcements.py — public GET (shown on the homepage too),
teacher-only POST/DELETE for announcements themselves, and comments
that ANY logged-in user (student or teacher) can add or read.
"""
from fastapi import APIRouter, Depends, HTTPException

from database import supabase
from dependencies import get_current_user, require_role
from models import AnnouncementCreate, CommentCreate

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


@router.get("/{announcement_id}/comments")
def list_comments(announcement_id: str, current_user: dict = Depends(get_current_user)):
    result = (
        supabase.table("announcement_comments")
        .select("*, users(first_name, last_name, role)")
        .eq("announcement_id", announcement_id)
        .order("created_at")
        .execute()
    )
    out = []
    for row in result.data:
        author = row.get("users") or {}
        out.append({
            "id": row["id"],
            "body": row["body"],
            "created_at": row.get("created_at"),
            "author_name": f"{author.get('first_name', '')} {author.get('last_name', '')}".strip() or "Unknown",
            "author_role": author.get("role"),
        })
    return out


@router.post("/{announcement_id}/comments")
def create_comment(announcement_id: str, payload: CommentCreate, current_user: dict = Depends(get_current_user)):
    result = (
        supabase.table("announcement_comments")
        .insert({"announcement_id": announcement_id, "user_id": current_user["id"], "body": payload.body})
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=500, detail="Could not post comment.")
    return result.data[0]
"""
routers/announcements.py — the feed works for both anonymous visitors
and logged-in users, showing each a different slice: a post can be
targeted at "everyone" (target_department is null) or at one specific
department. Anonymous visitors (the public homepage) only ever see
"everyone" posts, since they have no department. Logged-in STUDENTS
see "everyone" posts plus posts targeted at their own department.
PROFESSORS see every post regardless of department, since they're
staff and may teach across departments, and can target a post at any
department when posting (not just their own).

Professors can post (with an optional photo or video), edit their OWN
posts, and delete posts. Any logged-in user can read replies and add
their own; you can edit or delete your OWN reply, and professors can
also delete any reply. Media files live in a public Supabase Storage
bucket; the database only stores each file's URL and type.
"""
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from database import supabase
from dependencies import get_current_user, get_optional_user, require_role
from models import AnnouncementCreate, CommentCreate

router = APIRouter(prefix="/announcements", tags=["announcements"])

BUCKET = "announcements"
IMAGE_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}
VIDEO_TYPES = {"video/mp4", "video/webm", "video/quicktime"}
MAX_IMAGE_BYTES = 8 * 1024 * 1024
MAX_VIDEO_BYTES = 40 * 1024 * 1024


def _now():
    return datetime.now(timezone.utc).isoformat()


def _storage_path(url):
    """Turn a public file URL back into its path inside the bucket."""
    if not url or f"/{BUCKET}/" not in url:
        return None
    return url.split(f"/{BUCKET}/", 1)[1].split("?")[0]


def _remove_media(url):
    path = _storage_path(url)
    if not path:
        return
    try:
        supabase.storage.from_(BUCKET).remove([path])
    except Exception:
        pass  # a leftover file is harmless; never fail a request over it


def _clean(payload: AnnouncementCreate) -> dict:
    title = (payload.title or "").strip()
    body = (payload.body or "").strip()

    if not body and not payload.media_url:
        raise HTTPException(status_code=400, detail="Write something or attach a photo/video.")

    if payload.media_url:
        if _storage_path(payload.media_url) is None:
            raise HTTPException(status_code=400, detail="Invalid media URL.")
        if payload.media_type not in ("image", "video"):
            raise HTTPException(status_code=400, detail="Invalid media type.")

    target = (payload.target_department or "").strip() or None

    return {
        "title": title,
        "body": body,
        "media_url": payload.media_url or None,
        "media_type": payload.media_type if payload.media_url else None,
        "target_department": target,
    }


@router.get("")
def list_announcements(current_user: Optional[dict] = Depends(get_optional_user)):
    result = (
        supabase.table("announcements")
        .select("*, users(first_name, last_name)")
        .order("created_at", desc=True)
        .execute()
    )
    out = []
    for row in result.data:
        target = row.get("target_department")

        if target:
            if current_user is None:
                continue  # anonymous visitors never see department-targeted posts
            if current_user["role"] == "student" and current_user.get("department") != target:
                continue  # professors see every department; students only their own

        poster = row.get("users") or {}
        out.append({
            "id": row["id"],
            "title": row["title"],
            "body": row["body"],
            "media_url": row.get("media_url"),
            "media_type": row.get("media_type"),
            "target_department": target,
            "created_at": row.get("created_at"),
            "edited_at": row.get("edited_at"),
            "posted_by": row.get("posted_by"),
            "posted_by_name": f"{poster.get('first_name', '')} {poster.get('last_name', '')}".strip() or None,
        })
    return out


@router.post("/upload")
def upload_media(file: UploadFile = File(...), teacher: dict = Depends(require_role("teacher"))):
    content_type = file.content_type or ""
    if content_type in IMAGE_TYPES:
        media_type, limit = "image", MAX_IMAGE_BYTES
    elif content_type in VIDEO_TYPES:
        media_type, limit = "video", MAX_VIDEO_BYTES
    else:
        raise HTTPException(
            status_code=400,
            detail="Only JPG, PNG, GIF, WEBP images and MP4, WEBM, MOV videos are allowed.",
        )

    data = file.file.read()
    if len(data) > limit:
        raise HTTPException(status_code=400, detail=f"File is too large (max {limit // (1024 * 1024)} MB).")

    filename = file.filename or ""
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "bin"
    path = f"{teacher['id']}/{uuid.uuid4().hex}.{ext}"

    try:
        supabase.storage.from_(BUCKET).upload(path, data, {"content-type": content_type})
    except Exception as err:
        raise HTTPException(status_code=500, detail=f"Upload failed: {err}")

    return {"url": supabase.storage.from_(BUCKET).get_public_url(path), "media_type": media_type}


@router.post("")
def create_announcement(payload: AnnouncementCreate, teacher: dict = Depends(require_role("teacher"))):
    fields = _clean(payload)
    fields["posted_by"] = teacher["id"]
    result = supabase.table("announcements").insert(fields).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Could not post announcement.")
    return result.data[0]


@router.put("/{announcement_id}")
def update_announcement(announcement_id: str, payload: AnnouncementCreate, teacher: dict = Depends(require_role("teacher"))):
    existing = supabase.table("announcements").select("*").eq("id", announcement_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Announcement not found.")
    row = existing.data[0]

    if row.get("posted_by") != teacher["id"]:
        raise HTTPException(status_code=403, detail="You can only edit your own announcements.")

    fields = _clean(payload)
    fields["edited_at"] = _now()
    result = supabase.table("announcements").update(fields).eq("id", announcement_id).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Could not update announcement.")

    if row.get("media_url") and row["media_url"] != fields["media_url"]:
        _remove_media(row["media_url"])
    return result.data[0]


@router.delete("/{announcement_id}")
def delete_announcement(announcement_id: str, teacher: dict = Depends(require_role("teacher"))):
    existing = supabase.table("announcements").select("media_url").eq("id", announcement_id).execute()
    if existing.data:
        _remove_media(existing.data[0].get("media_url"))
    supabase.table("announcements").delete().eq("id", announcement_id).execute()
    return {"message": "Announcement deleted."}


# ---------- replies (comments) ----------
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
            "user_id": row.get("user_id"),
            "body": row["body"],
            "created_at": row.get("created_at"),
            "edited_at": row.get("edited_at"),
            "author_name": f"{author.get('first_name', '')} {author.get('last_name', '')}".strip() or "Unknown",
            "author_role": author.get("role"),
        })
    return out


@router.post("/{announcement_id}/comments")
def create_comment(announcement_id: str, payload: CommentCreate, current_user: dict = Depends(get_current_user)):
    body = (payload.body or "").strip()
    if not body:
        raise HTTPException(status_code=400, detail="A reply can't be empty.")
    result = (
        supabase.table("announcement_comments")
        .insert({"announcement_id": announcement_id, "user_id": current_user["id"], "body": body})
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=500, detail="Could not post comment.")
    return result.data[0]


@router.put("/comments/{comment_id}")
def update_comment(comment_id: str, payload: CommentCreate, current_user: dict = Depends(get_current_user)):
    existing = supabase.table("announcement_comments").select("id, user_id").eq("id", comment_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Reply not found.")
    if existing.data[0].get("user_id") != current_user["id"]:
        raise HTTPException(status_code=403, detail="You can only edit your own replies.")

    body = (payload.body or "").strip()
    if not body:
        raise HTTPException(status_code=400, detail="A reply can't be empty.")

    result = (
        supabase.table("announcement_comments")
        .update({"body": body, "edited_at": _now()})
        .eq("id", comment_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=500, detail="Could not update reply.")
    return result.data[0]


@router.delete("/comments/{comment_id}")
def delete_comment(comment_id: str, current_user: dict = Depends(get_current_user)):
    existing = supabase.table("announcement_comments").select("id, user_id").eq("id", comment_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Reply not found.")

    is_author = existing.data[0].get("user_id") == current_user["id"]
    if not is_author and current_user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="You can only delete your own replies.")

    supabase.table("announcement_comments").delete().eq("id", comment_id).execute()
    return {"message": "Reply deleted."}
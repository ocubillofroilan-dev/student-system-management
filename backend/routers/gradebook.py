"""
routers/gradebook.py — a spreadsheet-style gradebook per course.

A course has CATEGORIES (e.g. "Assignments", "Exams"), each with a
WEIGHT (how much that category counts toward the final grade). Each
category has ITEMS (e.g. "Assignment 1", "Quiz 2"), each with a max
score. Each student gets a SCORE per item.

The final percentage per student is computed here, on the backend,
so the frontend never has to duplicate the math:
  for each category: category_percent = average of (score/max_score)
                      across that category's items the student has a
                      score for (items with no score yet are skipped,
                      not counted as zero)
  final = sum(category_percent * category_weight) / sum(weights actually used)
  (a category with no scored items yet contributes nothing, and the
  weights are re-normalized over only the categories that have data,
  so an unfinished gradebook doesn't show an artificially low total)

Teachers can add/remove categories and items, and set any student's
score. Students only ever see their own row, and cannot write.
"""
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException

from database import supabase
from dependencies import get_current_user, require_role
from models import CategoryCreate, ItemCreate, ScoreSet

router = APIRouter(prefix="/gradebook", tags=["gradebook"])


def _enrolled_students(course_id: str):
    rows = (
        supabase.table("enrollments")
        .select("users(id, first_name, last_name, id_number)")
        .eq("course_id", course_id)
        .execute()
    )
    students = [r["users"] for r in rows.data if r.get("users")]
    students.sort(key=lambda s: (s.get("last_name") or "", s.get("first_name") or ""))
    return students


def _compute_totals(categories: list, scores: dict, student_ids: list) -> dict:
    totals = {}
    for student_id in student_ids:
        weighted_sum = 0.0
        weight_used = 0.0
        for cat in categories:
            item_percents = []
            for item in cat["items"]:
                score = scores.get(item["id"], {}).get(student_id)
                if score is None:
                    continue
                max_score = item["max_score"] or 1
                item_percents.append(max(0.0, min(100.0, (score / max_score) * 100)))
            if item_percents:
                cat_percent = sum(item_percents) / len(item_percents)
                weighted_sum += cat_percent * cat["weight"]
                weight_used += cat["weight"]
        totals[student_id] = round(weighted_sum / weight_used, 2) if weight_used > 0 else None
    return totals


@router.get("/{course_id}")
def get_gradebook(course_id: str, current_user: dict = Depends(get_current_user)):
    cat_rows = (
        supabase.table("grade_categories")
        .select("*")
        .eq("course_id", course_id)
        .order("position")
        .execute()
    )
    item_rows = (
        supabase.table("grade_items")
        .select("*")
        .eq("course_id", course_id)
        .order("position")
        .execute()
    )

    items_by_category = defaultdict(list)
    for item in item_rows.data:
        items_by_category[item["category_id"]].append({
            "id": item["id"], "title": item["title"], "max_score": item["max_score"],
        })

    categories = [
        {"id": c["id"], "name": c["name"], "weight": c["weight"], "items": items_by_category.get(c["id"], [])}
        for c in cat_rows.data
    ]

    item_ids = [item["id"] for item in item_rows.data]
    scores = defaultdict(dict)
    if item_ids:
        score_rows = supabase.table("grade_scores").select("*").in_("item_id", item_ids).execute()
        for row in score_rows.data:
            scores[row["item_id"]][row["student_id"]] = row["score"]

    if current_user["role"] == "student":
        students = [{
            "id": current_user["id"],
            "first_name": current_user["first_name"],
            "last_name": current_user["last_name"],
            "id_number": current_user["id_number"],
        }]
        student_ids = [current_user["id"]]
        my_scores = {item_id: {sid: sc for sid, sc in per_student.items() if sid == current_user["id"]}
                     for item_id, per_student in scores.items()}
        totals = _compute_totals(categories, scores, student_ids)
        return {"categories": categories, "students": students, "scores": my_scores, "totals": totals}

    students = _enrolled_students(course_id)
    student_ids = [s["id"] for s in students]
    totals = _compute_totals(categories, scores, student_ids)
    return {"categories": categories, "students": students, "scores": scores, "totals": totals}


@router.post("/{course_id}/categories")
def create_category(course_id: str, payload: CategoryCreate, teacher: dict = Depends(require_role("teacher"))):
    existing = supabase.table("grade_categories").select("position").eq("course_id", course_id).execute()
    position = len(existing.data)
    result = (
        supabase.table("grade_categories")
        .insert({"course_id": course_id, "name": payload.name.strip(), "weight": payload.weight, "position": position})
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=500, detail="Could not add category.")
    return result.data[0]


@router.put("/categories/{category_id}")
def update_category(category_id: str, payload: CategoryCreate, teacher: dict = Depends(require_role("teacher"))):
    result = (
        supabase.table("grade_categories")
        .update({"name": payload.name.strip(), "weight": payload.weight})
        .eq("id", category_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Category not found.")
    return result.data[0]


@router.delete("/categories/{category_id}")
def delete_category(category_id: str, teacher: dict = Depends(require_role("teacher"))):
    supabase.table("grade_categories").delete().eq("id", category_id).execute()
    return {"message": "Category deleted."}


@router.post("/categories/{category_id}/items")
def create_item(category_id: str, payload: ItemCreate, teacher: dict = Depends(require_role("teacher"))):
    category = supabase.table("grade_categories").select("course_id").eq("id", category_id).execute()
    if not category.data:
        raise HTTPException(status_code=404, detail="Category not found.")
    course_id = category.data[0]["course_id"]

    existing = supabase.table("grade_items").select("position").eq("category_id", category_id).execute()
    position = len(existing.data)

    result = (
        supabase.table("grade_items")
        .insert({
            "category_id": category_id, "course_id": course_id,
            "title": payload.title.strip(), "max_score": payload.max_score, "position": position,
        })
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=500, detail="Could not add column.")
    return result.data[0]


@router.delete("/items/{item_id}")
def delete_item(item_id: str, teacher: dict = Depends(require_role("teacher"))):
    supabase.table("grade_items").delete().eq("id", item_id).execute()
    return {"message": "Column deleted."}


@router.put("/items/{item_id}/scores/{student_id}")
def set_score(item_id: str, student_id: str, payload: ScoreSet, teacher: dict = Depends(require_role("teacher"))):
    if payload.score is None:
        supabase.table("grade_scores").delete().eq("item_id", item_id).eq("student_id", student_id).execute()
        return {"message": "Score cleared."}

    item = supabase.table("grade_items").select("max_score").eq("id", item_id).execute()
    if not item.data:
        raise HTTPException(status_code=404, detail="Column not found.")
    max_score = item.data[0]["max_score"]
    if payload.score < 0 or payload.score > max_score:
        raise HTTPException(status_code=400, detail=f"Score must be between 0 and {max_score}.")

    existing = (
        supabase.table("grade_scores").select("id")
        .eq("item_id", item_id).eq("student_id", student_id).execute()
    )
    if existing.data:
        result = (
            supabase.table("grade_scores")
            .update({"score": payload.score})
            .eq("id", existing.data[0]["id"])
            .execute()
        )
    else:
        result = (
            supabase.table("grade_scores")
            .insert({"item_id": item_id, "student_id": student_id, "score": payload.score})
            .execute()
        )
    if not result.data:
        raise HTTPException(status_code=500, detail="Could not save score.")
    return result.data[0]
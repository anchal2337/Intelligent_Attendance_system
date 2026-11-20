import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.entities import StudentRemark, Student
from app.schemas.schemas import RemarkCreate, RemarkItem

router = APIRouter(prefix="/remarks", tags=["Student Remarks"])

def categorize_text(text: str) -> str:
    lower = text.lower()
    if any(k in lower for k in ["medical", "sick", "fever", "doctor", "health", "hospital"]):
        return "Medical"
    elif any(k in lower for k in ["academic", "assignment", "exam", "marks", "grade", "homework", "quiz"]):
        return "Academic"
    elif any(k in lower for k in ["late", "warning", "discipline", "disruptive", "rule", "bunk"]):
        return "Discipline"
    elif any(k in lower for k in ["praise", "good", "excellent", "active", "brilliant", "great", "participated"]):
        return "Commendation"
    return "General"

@router.get("/", response_model=List[RemarkItem])
def list_remarks(
    student_id: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(StudentRemark)
    if student_id:
        query = query.filter(StudentRemark.student_id == student_id)
    if category and category != "All":
        query = query.filter(StudentRemark.category == category)

    remarks = query.order_by(StudentRemark.id.desc()).all()
    return [{"id": r.id, "text": r.text, "category": r.category, "date": r.date} for r in remarks]

@router.post("/student/{student_id}", response_model=RemarkItem)
def create_remark(
    student_id: str,
    req: RemarkCreate,
    teacher_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    date_str = req.date or datetime.date.today().strftime("%Y-%m-%d")
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    category = req.category if req.category and req.category != "General" else categorize_text(req.text)

    remark = StudentRemark(
        student_id=student.id,
        teacher_id=teacher_id,
        category=category,
        text=req.text.strip(),
        date=date_str,
        created_at=now_iso
    )
    db.add(remark)
    db.commit()
    db.refresh(remark)

    return {
        "id": remark.id,
        "text": remark.text,
        "category": remark.category,
        "date": remark.date
    }

@router.delete("/{remark_id}")
def delete_remark(remark_id: int, db: Session = Depends(get_db)):
    remark = db.query(StudentRemark).filter(StudentRemark.id == remark_id).first()
    if not remark:
        raise HTTPException(status_code=404, detail="Remark not found")
    db.delete(remark)
    db.commit()
    return {"success": True, "deletedId": remark_id}

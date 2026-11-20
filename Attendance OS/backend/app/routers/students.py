import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, selectinload
from app.core.database import get_db
from app.models.entities import Student, GateAttendance, LectureAttendance, StudentRemark, Lecture
from app.schemas.schemas import StudentCreate, StudentOut, RemarkCreate, RemarkItem

router = APIRouter(prefix="/students", tags=["Students"])

def format_student(student: Student, today_str: str, db: Session) -> dict:
    # 1. Gate attendance for today
    today_gate = next((g for g in student.gate_records if g.date == today_str), None)
    
    # 2. Lecture attendance dictionary
    lecture_att = {la.lecture_id: la.status for la in student.lecture_records}
    
    # 3. History formatting (past gate attendance + lecture attendance)
    history = []
    # Add gate records
    for g in student.gate_records:
        history.append({
            "date": g.date,
            "status": g.status,
            "recordedAt": g.checked_in_at
        })
    # Add lecture attendance records
    for la in student.lecture_records:
        history.append({
            "date": la.lecture.date if la.lecture else "",
            "status": la.status,
            "lectureId": la.lecture_id,
            "subject": la.lecture.subject if la.lecture else None,
            "recordedAt": la.recorded_at,
            "audit": [{"status": a.status, "recordedAt": a.recorded_at} for a in la.audit_logs]
        })

    # Sort history descending
    history.sort(key=lambda x: (x.get("date") or "", x.get("recordedAt") or ""), reverse=True)

    # 4. Remarks
    remarks = [
        {"id": r.id, "text": r.text, "category": r.category, "date": r.date}
        for r in sorted(student.remarks, key=lambda x: x.id, reverse=True)
    ]

    return {
        "id": student.id,
        "name": student.name,
        "rollNo": student.roll_no,
        "dept": student.dept,
        "category": student.category,
        "year": student.year,
        "section": student.section,
        "role": student.role,
        "avatar": student.avatar or (student.name[0] + (student.name.split()[-1][0] if len(student.name.split()) > 1 else "")),
        "phone": student.phone or "",
        "email": student.email or "",
        "todayStatus": today_gate.status if today_gate else "Unmarked",
        "checkedIn": today_gate.checked_in if today_gate else None,
        "checkedOut": today_gate.checked_out if today_gate else None,
        "checkedInAt": today_gate.checked_in_at if today_gate else None,
        "checkedOutAt": today_gate.checked_out_at if today_gate else None,
        "history": history,
        "lectureAtt": lecture_att,
        "remarks": remarks
    }

@router.get("/", response_model=List[StudentOut])
def list_students(
    dept: Optional[str] = Query(None),
    year: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(Student).filter(Student.is_active == True).options(
        selectinload(Student.gate_records),
        selectinload(Student.lecture_records).selectinload(LectureAttendance.lecture),
        selectinload(Student.lecture_records).selectinload(LectureAttendance.audit_logs),
        selectinload(Student.remarks)
    )
    if dept and dept != "All":
        query = query.filter(Student.dept == dept)
    if year and year != "All":
        query = query.filter(Student.year == year)
    if category:
        query = query.filter(Student.category == category)
    if search:
        s = f"%{search.lower()}%"
        query = query.filter(
            (Student.name.ilike(s)) | (Student.roll_no.ilike(s)) | (Student.email.ilike(s))
        )
    
    students = query.all()
    today_str = datetime.date.today().strftime("%Y-%m-%d")
    return [format_student(s, today_str, db) for s in students]

@router.post("/", response_model=StudentOut)
def create_student(req: StudentCreate, db: Session = Depends(get_db)):
    existing = db.query(Student).filter(Student.roll_no == req.rollNo).first()
    if existing:
        raise HTTPException(status_code=400, detail="Student with this roll number already exists")

    seed_id = f"X{int(datetime.datetime.now().timestamp() * 1000)}"
    avatar = req.name[0] + (req.name.split()[-1][0] if len(req.name.split()) > 1 else "")

    student = Student(
        id=seed_id,
        name=req.name,
        roll_no=req.rollNo,
        dept=req.dept,
        category=req.category or "Student",
        year=req.year,
        section=req.section,
        role=req.role,
        avatar=avatar,
        phone=req.phone,
        email=req.email or f"{req.name.lower().replace(' ', '.')}@ssipmt.ac.in",
        is_active=True
    )
    db.add(student)
    db.commit()
    db.refresh(student)

    today_str = datetime.date.today().strftime("%Y-%m-%d")
    return format_student(student, today_str, db)

@router.get("/{student_id}", response_model=StudentOut)
def get_student(student_id: str, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    today_str = datetime.date.today().strftime("%Y-%m-%d")
    return format_student(student, today_str, db)

@router.post("/{student_id}/remarks", response_model=RemarkItem)
def add_student_remark(student_id: str, req: RemarkCreate, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    date_str = req.date or datetime.date.today().strftime("%Y-%m-%d")
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

    remark = StudentRemark(
        student_id=student.id,
        category=req.category or "General",
        text=req.text,
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

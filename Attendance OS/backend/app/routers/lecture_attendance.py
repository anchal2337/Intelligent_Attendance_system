import datetime
import re
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.entities import Lecture, Student, LectureAttendance, AttendanceAudit
from app.schemas.schemas import LectureMarkRequest, LectureMarkAllRequest

router = APIRouter(prefix="/attendance/lecture", tags=["Lecture Attendance"])

@router.get("/{lecture_id}")
def get_lecture_sheet(lecture_id: str, db: Session = Depends(get_db)):
    lec = db.query(Lecture).filter(Lecture.id == lecture_id).first()
    if not lec:
        raise HTTPException(status_code=404, detail="Lecture not found")

    students = db.query(Student).filter(
        Student.dept == lec.dept,
        Student.category == "Student",
        Student.is_active == True
    ).order_by(Student.roll_no.asc()).all()

    records = db.query(LectureAttendance).filter(
        LectureAttendance.lecture_id == lecture_id
    ).all()
    record_map = {r.student_id: r for r in records}

    sheet = []
    for s in students:
        rec = record_map.get(s.id)
        sheet.append({
            "id": s.id,
            "name": s.name,
            "rollNo": s.roll_no,
            "dept": s.dept,
            "avatar": s.avatar or (s.name[0] + (s.name.split()[-1][0] if len(s.name.split()) > 1 else "")),
            "status": rec.status if rec else "Unmarked",
            "recordedAt": rec.recorded_at if rec else None
        })

    return {
        "lecture": {
            "id": lec.id,
            "dept": lec.dept,
            "subject": lec.subject,
            "time": lec.time,
            "date": lec.date,
            "status": lec.status,
            "conductedBy": lec.conducted_by,
            "sessionStartedAt": lec.session_started_at,
            "savedAt": lec.saved_at
        },
        "students": sheet
    }

@router.post("/{lecture_id}/mark")
def mark_single_student(
    lecture_id: str,
    req: LectureMarkRequest,
    changed_by: Optional[str] = "Teacher",
    db: Session = Depends(get_db)
):
    lec = db.query(Lecture).filter(Lecture.id == lecture_id).first()
    if not lec:
        raise HTTPException(status_code=404, detail="Lecture not found")

    student = db.query(Student).filter(Student.id == req.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    record = db.query(LectureAttendance).filter(
        LectureAttendance.lecture_id == lecture_id,
        LectureAttendance.student_id == student.id
    ).first()

    if not record:
        record = LectureAttendance(
            lecture_id=lecture_id,
            student_id=student.id,
            status=req.status,
            recorded_at=now_iso
        )
        db.add(record)
        db.flush()
    else:
        if record.status != req.status:
            # Audit log
            audit = AttendanceAudit(
                attendance_id=record.id,
                status=record.status,
                recorded_at=record.recorded_at,
                changed_by=changed_by
            )
            db.add(audit)
            record.status = req.status
            record.recorded_at = now_iso

    db.commit()
    db.refresh(record)

    return {
        "success": True,
        "studentId": student.id,
        "name": student.name,
        "rollNo": student.roll_no,
        "status": record.status,
        "recordedAt": record.recorded_at
    }

@router.post("/{lecture_id}/mark-all")
def mark_all_students(
    lecture_id: str,
    req: LectureMarkAllRequest,
    changed_by: Optional[str] = "Teacher",
    db: Session = Depends(get_db)
):
    lec = db.query(Lecture).filter(Lecture.id == lecture_id).first()
    if not lec:
        raise HTTPException(status_code=404, detail="Lecture not found")

    students = db.query(Student).filter(
        Student.dept == lec.dept,
        Student.category == "Student",
        Student.is_active == True
    ).all()

    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    existing_records = {
        r.student_id: r for r in db.query(LectureAttendance).filter(
            LectureAttendance.lecture_id == lecture_id
        ).all()
    }

    new_records = []
    for s in students:
        rec = existing_records.get(s.id)
        if not rec:
            new_records.append(LectureAttendance(
                lecture_id=lecture_id,
                student_id=s.id,
                status=req.status,
                recorded_at=now_iso
            ))
        elif rec.status != req.status:
            audit = AttendanceAudit(
                attendance_id=rec.id,
                status=rec.status,
                recorded_at=rec.recorded_at,
                changed_by=changed_by
            )
            db.add(audit)
            rec.status = req.status
            rec.recorded_at = now_iso

    if new_records:
        db.bulk_save_objects(new_records)

    db.commit()
    return {"success": True, "markedCount": len(students), "status": req.status}

@router.post("/{lecture_id}/voice-batch")
def process_voice_commands(
    lecture_id: str,
    commands: List[Dict[str, str]] = Body(...),
    changed_by: Optional[str] = "Voice Engine",
    db: Session = Depends(get_db)
):
    lec = db.query(Lecture).filter(Lecture.id == lecture_id).first()
    if not lec:
        raise HTTPException(status_code=404, detail="Lecture not found")

    students = db.query(Student).filter(
        Student.dept == lec.dept,
        Student.category == "Student",
        Student.is_active == True
    ).all()

    compact = lambda s: re.sub(r'[^a-zA-Z0-9]', '', s.lower())

    results = []
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

    for item in commands:
        text = item.get("text", "")
        # e.g., "Aarav present" or "CS12101 absent"
        match = re.search(r'^(.*?)\s+(present|absent)[.!?]*$', text.strip(), re.IGNORECASE)
        if not match:
            results.append({"text": text, "result": "Invalid command pattern. Say student name or roll number followed by Present or Absent."})
            continue

        raw_id = match.group(1).strip()
        status_word = match.group(2).capitalize()
        target = compact(raw_id)

        matched = [
            s for s in students
            if compact(s.roll_no) == target or compact(s.name) == target
        ]

        if not matched:
            results.append({"text": text, "result": "Student not recognized in this class."})
        elif len(matched) > 1:
            results.append({"text": text, "result": f"Ambiguous name. Multiple students matched ({', '.join(s.name for s in matched)}). Use roll number."})
        else:
            student = matched[0]
            rec = db.query(LectureAttendance).filter(
                LectureAttendance.lecture_id == lecture_id,
                LectureAttendance.student_id == student.id
            ).first()

            if not rec:
                rec = LectureAttendance(
                    lecture_id=lecture_id,
                    student_id=student.id,
                    status=status_word,
                    recorded_at=now_iso
                )
                db.add(rec)
            elif rec.status != status_word:
                audit = AttendanceAudit(
                    attendance_id=rec.id,
                    status=rec.status,
                    recorded_at=rec.recorded_at,
                    changed_by=changed_by
                )
                db.add(audit)
                rec.status = status_word
                rec.recorded_at = now_iso

            db.commit()
            results.append({
                "text": text,
                "name": student.name,
                "rollNo": student.roll_no,
                "status": status_word,
                "result": f"Marked {status_word}",
                "time": now_iso
            })

    return results

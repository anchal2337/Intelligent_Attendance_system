import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.entities import Student, GateAttendance, SystemSettings
from app.schemas.schemas import GateMarkRequest

router = APIRouter(prefix="/attendance/gate", tags=["Gate Attendance"])

@router.get("/today")
def get_today_gate_stats(dept: Optional[str] = None, db: Session = Depends(get_db)):
    today_str = datetime.date.today().strftime("%Y-%m-%d")
    query = db.query(Student).filter(Student.category == "Student", Student.is_active == True)
    if dept and dept != "All":
        query = query.filter(Student.dept == dept)
    students = query.all()

    student_ids = [s.id for s in students]
    records = db.query(GateAttendance).filter(
        GateAttendance.date == today_str,
        GateAttendance.student_id.in_(student_ids)
    ).all()

    checked_in = sum(1 for r in records if r.checked_in is not None)
    checked_out = sum(1 for r in records if r.checked_out is not None)
    total = len(students)
    not_arrived = max(0, total - checked_in)

    return {
        "date": today_str,
        "checkedIn": checked_in,
        "checkedOut": checked_out,
        "notArrived": not_arrived,
        "total": total
    }

@router.post("/mark")
def mark_gate_attendance(req: GateMarkRequest, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.id == req.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    today_str = datetime.date.today().strftime("%Y-%m-%d")
    now = datetime.datetime.now()
    time_str = now.strftime("%H:%M")
    iso_str = now.isoformat()

    record = db.query(GateAttendance).filter(
        GateAttendance.student_id == student.id,
        GateAttendance.date == today_str
    ).first()

    settings = db.query(SystemSettings).first()
    late_after = settings.late_after if settings else 5

    # Determine status if morning check-in and unmarked
    final_status = req.status
    if not req.is_out:
        if now.hour > 9 or (now.hour == 9 and now.minute > late_after):
            final_status = "Late"
        elif final_status == "Unmarked":
            final_status = "Present"

    if not record:
        record = GateAttendance(
            student_id=student.id,
            date=today_str,
            status=final_status if not req.is_out else "Present",
            checked_in=time_str if not req.is_out else None,
            checked_in_at=iso_str if not req.is_out else None,
            checked_out=time_str if req.is_out else None,
            checked_out_at=iso_str if req.is_out else None,
            marked_by="Gate Scanner"
        )
        db.add(record)
    else:
        if req.is_out:
            record.checked_out = time_str
            record.checked_out_at = iso_str
        else:
            record.status = final_status
            record.checked_in = time_str
            record.checked_in_at = iso_str

    db.commit()
    db.refresh(record)

    return {
        "success": True,
        "student": {
            "id": student.id,
            "name": student.name,
            "dept": student.dept,
            "rollNo": student.roll_no
        },
        "action": "out" if req.is_out else "in",
        "status": record.status,
        "time": time_str,
        "checkedInAt": record.checked_in_at,
        "checkedOutAt": record.checked_out_at
    }

@router.get("/logs")
def get_recent_gate_logs(limit: int = 20, db: Session = Depends(get_db)):
    today_str = datetime.date.today().strftime("%Y-%m-%d")
    records = db.query(GateAttendance).filter(
        GateAttendance.date == today_str
    ).order_by(GateAttendance.id.desc()).limit(limit).all()

    logs = []
    for r in records:
        if r.checked_out:
            logs.append({
                "name": r.student.name if r.student else "Unknown",
                "time": r.checked_out,
                "dept": r.student.dept if r.student else "",
                "action": "out",
                "status": r.status
            })
        if r.checked_in:
            logs.append({
                "name": r.student.name if r.student else "Unknown",
                "time": r.checked_in,
                "dept": r.student.dept if r.student else "",
                "action": "in",
                "status": r.status
            })

    logs.sort(key=lambda x: x["time"], reverse=True)
    return logs[:limit]

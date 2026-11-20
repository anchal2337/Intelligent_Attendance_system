import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.entities import Lecture, LectureSessionInterval, CalendarEvent, Teacher
from app.schemas.schemas import LectureOut, LectureUpdate, LectureExceptionRequest

router = APIRouter(prefix="/lectures", tags=["Lectures & Timetable"])

def format_lecture(l: Lecture) -> dict:
    sessions = [{"startedAt": s.started_at, "savedAt": s.saved_at} for s in l.sessions]
    return {
        "id": l.id,
        "dept": l.dept,
        "subject": l.subject,
        "subIdx": l.sub_idx,
        "date": l.date,
        "time": l.time,
        "status": l.status,
        "reason": l.reason,
        "notes": l.notes,
        "attendanceMethod": l.attendance_method,
        "conductedBy": l.conducted_by,
        "sessionStartedAt": l.session_started_at,
        "savedAt": l.saved_at,
        "attendanceSessions": sessions,
        "modifiedAt": l.modified_at,
        "modifiedBy": l.modified_by
    }

@router.get("/", response_model=List[LectureOut])
def list_lectures(
    dept: Optional[str] = Query(None),
    date: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(Lecture)
    if dept and dept != "All":
        query = query.filter(Lecture.dept == dept)
    if date:
        query = query.filter(Lecture.date == date)
    if start_date:
        query = query.filter(Lecture.date >= start_date)
    if end_date:
        query = query.filter(Lecture.date <= end_date)
    if status:
        query = query.filter(Lecture.status == status)

    lectures = query.order_by(Lecture.date.desc(), Lecture.time.asc()).all()
    return [format_lecture(l) for l in lectures]

@router.get("/today", response_model=List[LectureOut])
def get_today_lectures(dept: Optional[str] = None, db: Session = Depends(get_db)):
    today_str = datetime.date.today().strftime("%Y-%m-%d")
    query = db.query(Lecture).filter(Lecture.date == today_str)
    if dept and dept != "All":
        query = query.filter(Lecture.dept == dept)
    lectures = query.order_by(Lecture.time.asc()).all()
    return [format_lecture(l) for l in lectures]

@router.get("/{lecture_id}", response_model=LectureOut)
def get_lecture(lecture_id: str, db: Session = Depends(get_db)):
    lec = db.query(Lecture).filter(Lecture.id == lecture_id).first()
    if not lec:
        raise HTTPException(status_code=404, detail="Lecture not found")
    return format_lecture(lec)

@router.post("/{lecture_id}/start", response_model=LectureOut)
def start_lecture_session(lecture_id: str, db: Session = Depends(get_db)):
    lec = db.query(Lecture).filter(Lecture.id == lecture_id).first()
    if not lec:
        raise HTTPException(status_code=404, detail="Lecture not found")

    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    lec.status = "In Progress"
    lec.session_started_at = now_iso
    lec.modified_at = now_iso

    interval = LectureSessionInterval(
        lecture_id=lec.id,
        started_at=now_iso
    )
    db.add(interval)
    db.commit()
    db.refresh(lec)
    return format_lecture(lec)

@router.post("/{lecture_id}/save", response_model=LectureOut)
def save_lecture_attendance(
    lecture_id: str,
    conducted_by: Optional[str] = None,
    attendance_method: Optional[str] = "Manual",
    db: Session = Depends(get_db)
):
    lec = db.query(Lecture).filter(Lecture.id == lecture_id).first()
    if not lec:
        raise HTTPException(status_code=404, detail="Lecture not found")

    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    lec.status = "Conducted"
    lec.saved_at = now_iso
    lec.modified_at = now_iso
    if conducted_by:
        lec.conducted_by = conducted_by
    if attendance_method:
        lec.attendance_method = attendance_method

    # Close latest open session interval
    latest_interval = db.query(LectureSessionInterval).filter(
        LectureSessionInterval.lecture_id == lec.id,
        LectureSessionInterval.saved_at == None
    ).order_by(LectureSessionInterval.id.desc()).first()

    if latest_interval:
        latest_interval.saved_at = now_iso

    db.commit()
    db.refresh(lec)
    return format_lecture(lec)

@router.post("/{lecture_id}/exception", response_model=LectureOut)
def record_lecture_exception(
    lecture_id: str,
    req: LectureExceptionRequest,
    conducted_by: Optional[str] = None,
    db: Session = Depends(get_db)
):
    lec = db.query(Lecture).filter(Lecture.id == lecture_id).first()
    if not lec:
        raise HTTPException(status_code=404, detail="Lecture not found")

    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    lec.status = req.status
    lec.reason = req.reason
    lec.modified_at = now_iso
    if conducted_by:
        lec.conducted_by = conducted_by

    # If College Event or Holiday, reflect in Calendar Events
    if req.status in ["College Event", "Holiday"]:
        event_id = f"{lec.id}:{req.status}"
        event = db.query(CalendarEvent).filter(CalendarEvent.id == event_id).first()
        if not event:
            event = CalendarEvent(
                id=event_id,
                date=lec.date,
                time=lec.time,
                dept=lec.dept,
                subject=lec.subject,
                status=req.status,
                reason=req.reason,
                participation_required=False
            )
            db.add(event)
        else:
            event.reason = req.reason

    db.commit()
    db.refresh(lec)
    return format_lecture(lec)

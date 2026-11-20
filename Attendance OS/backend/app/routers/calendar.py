from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.entities import CalendarEvent
from app.schemas.schemas import CalendarEventOut, CalendarEventCreate

router = APIRouter(prefix="/calendar", tags=["Calendar & Holidays"])

@router.get("/events", response_model=List[CalendarEventOut])
def list_calendar_events(
    dept: Optional[str] = Query(None),
    month: Optional[str] = Query(None),  # 'YYYY-MM'
    db: Session = Depends(get_db)
):
    query = db.query(CalendarEvent)
    if dept and dept != "All":
        query = query.filter((CalendarEvent.dept == dept) | (CalendarEvent.dept == "All"))
    if month:
        query = query.filter(CalendarEvent.date.startswith(month))

    events = query.order_by(CalendarEvent.date.asc()).all()
    return [
        {
            "id": e.id,
            "date": e.date,
            "time": e.time,
            "dept": e.dept,
            "subject": e.subject,
            "status": e.status,
            "reason": e.reason,
            "participationRequired": e.participation_required
        }
        for e in events
    ]

@router.post("/events", response_model=CalendarEventOut)
def create_calendar_event(req: CalendarEventCreate, db: Session = Depends(get_db)):
    event_id = f"{req.dept}-{req.date}-{req.status.replace(' ', '')}"
    event = CalendarEvent(
        id=event_id,
        date=req.date,
        time=req.time,
        dept=req.dept,
        subject=req.subject,
        status=req.status,
        reason=req.reason,
        participation_required=req.participationRequired or False
    )
    db.add(event)
    db.commit()
    db.refresh(event)

    return {
        "id": event.id,
        "date": event.date,
        "time": event.time,
        "dept": event.dept,
        "subject": event.subject,
        "status": event.status,
        "reason": event.reason,
        "participationRequired": event.participation_required
    }

@router.delete("/events/{event_id}")
def delete_calendar_event(event_id: str, db: Session = Depends(get_db)):
    event = db.query(CalendarEvent).filter(CalendarEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    db.delete(event)
    db.commit()
    return {"success": True, "deletedId": event_id}

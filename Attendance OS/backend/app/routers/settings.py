from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.entities import SystemSettings
from app.schemas.schemas import SettingsOut, SettingsUpdate

router = APIRouter(prefix="/settings", tags=["System Settings"])

@router.get("/", response_model=SettingsOut)
def get_settings(db: Session = Depends(get_db)):
    settings = db.query(SystemSettings).first()
    if not settings:
        settings = SystemSettings(id=1)
        db.add(settings)
        db.commit()
        db.refresh(settings)

    return {
        "minPct": settings.min_pct,
        "college": settings.college,
        "lateAfter": settings.late_after,
        "dupePrev": settings.dupe_prev,
        "autoStart": settings.auto_start,
        "lowAlert": settings.low_alert
    }

@router.put("/", response_model=SettingsOut)
def update_settings(req: SettingsUpdate, db: Session = Depends(get_db)):
    settings = db.query(SystemSettings).first()
    if not settings:
        settings = SystemSettings(id=1)
        db.add(settings)

    if req.minPct is not None:
        settings.min_pct = req.minPct
    if req.college is not None:
        settings.college = req.college
    if req.lateAfter is not None:
        settings.late_after = req.lateAfter
    if req.dupePrev is not None:
        settings.dupe_prev = req.dupePrev
    if req.autoStart is not None:
        settings.auto_start = req.autoStart
    if req.lowAlert is not None:
        settings.low_alert = req.lowAlert

    db.commit()
    db.refresh(settings)

    return {
        "minPct": settings.min_pct,
        "college": settings.college,
        "lateAfter": settings.late_after,
        "dupePrev": settings.dupe_prev,
        "autoStart": settings.auto_start,
        "lowAlert": settings.low_alert
    }

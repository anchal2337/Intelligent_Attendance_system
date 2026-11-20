from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.entities import Department, Subject, Teacher

router = APIRouter(prefix="/departments", tags=["Departments"])

@router.get("/")
def get_departments(db: Session = Depends(get_db)):
    depts = db.query(Department).all()
    out = []
    for d in depts:
        subjects = [s.name for s in sorted(d.subjects, key=lambda x: x.sub_idx)]
        teachers = [{"id": t.id, "name": t.name, "role": t.role} for t in d.teachers]
        out.append({
            "code": d.code,
            "name": d.name,
            "color": d.color,
            "light": d.light_color,
            "text": d.text_color,
            "subjects": subjects,
            "teachers": teachers
        })
    return out

@router.get("/{dept_code}/subjects")
def get_department_subjects(dept_code: str, db: Session = Depends(get_db)):
    dept = db.query(Department).filter(Department.code == dept_code).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    return [{"id": s.id, "name": s.name, "subIdx": s.sub_idx} for s in sorted(dept.subjects, key=lambda x: x.sub_idx)]

import io
import csv
import json
import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy import func
from sqlalchemy.orm import Session, selectinload
from app.core.database import get_db
from app.models.entities import Student, Lecture, LectureAttendance, GateAttendance, SystemSettings, Department

router = APIRouter(prefix="/reports", tags=["Reports & Analytics"])

def get_all_student_pcts(db: Session, dept: Optional[str] = None) -> Dict[str, int]:
    # 1. Total conducted lectures per department
    lec_query = db.query(Lecture.dept, func.count(Lecture.id)).filter(Lecture.status == "Conducted")
    if dept and dept != "All":
        lec_query = lec_query.filter(Lecture.dept == dept)
    dept_totals = dict(lec_query.group_by(Lecture.dept).all())

    # 2. Present attendances per student for conducted lectures
    att_query = (
        db.query(LectureAttendance.student_id, Student.dept, func.count(LectureAttendance.id))
        .join(Student, Student.id == LectureAttendance.student_id)
        .join(Lecture, Lecture.id == LectureAttendance.lecture_id)
        .filter(Lecture.status == "Conducted", LectureAttendance.status == "Present")
    )
    if dept and dept != "All":
        att_query = att_query.filter(Student.dept == dept)
    present_counts = {r[0]: (r[1], r[2]) for r in att_query.group_by(LectureAttendance.student_id, Student.dept).all()}

    pct_map = {}
    for sid, (s_dept, pres) in present_counts.items():
        total = dept_totals.get(s_dept, 0)
        if total > 0:
            pct_map[sid] = round((pres / total) * 100)
    return pct_map

@router.get("/dashboard")
def get_dashboard_metrics(dept: Optional[str] = None, db: Session = Depends(get_db)):
    today_str = datetime.date.today().strftime("%Y-%m-%d")
    settings = db.query(SystemSettings).first()
    min_pct = settings.min_pct if settings else 75

    # 1. Students
    stud_query = db.query(Student).filter(Student.category == "Student", Student.is_active == True)
    if dept and dept != "All":
        stud_query = stud_query.filter(Student.dept == dept)
    students = stud_query.all()
    student_ids = {s.id for s in students}

    # 2. Today's Conducted Lectures
    lec_query = db.query(Lecture).filter(Lecture.date == today_str, Lecture.status == "Conducted")
    if dept and dept != "All":
        lec_query = lec_query.filter(Lecture.dept == dept)
    today_conducted = lec_query.all()
    today_conducted_ids = {l.id for l in today_conducted}

    # 3. Marks today
    marks = db.query(LectureAttendance).filter(
        LectureAttendance.lecture_id.in_(today_conducted_ids),
        LectureAttendance.student_id.in_(student_ids)
    ).all() if today_conducted_ids and student_ids else []

    present = sum(1 for m in marks if m.status == "Present")
    absent = sum(1 for m in marks if m.status == "Absent")
    total_expected = len(today_conducted) * len(students)
    unmarked = max(0, total_expected - len(marks))
    rate = round((present / len(marks)) * 100) if marks else None

    # 4. Defaulters (Fast aggregate calculation)
    pct_map = get_all_student_pcts(db, dept)
    defaulters_count = sum(1 for s in students if s.id in pct_map and pct_map[s.id] < min_pct)

    # 5. 7-day trend
    week_data = []
    for i in range(6, -1, -1):
        day = datetime.date.today() - datetime.timedelta(days=i)
        if day.weekday() in [5, 6]:  # Skip weekend
            continue
        day_str = day.strftime("%Y-%m-%d")
        day_lecs = db.query(Lecture).filter(Lecture.date == day_str, Lecture.status == "Conducted").all()
        day_lec_ids = {l.id for l in day_lecs}
        day_marks = db.query(LectureAttendance).filter(
            LectureAttendance.lecture_id.in_(day_lec_ids)
        ).all() if day_lec_ids else []

        day_pres = sum(1 for m in day_marks if m.status == "Present")
        day_pct = round((day_pres / len(day_marks)) * 100) if day_marks else None
        week_data.append({
            "l": day.strftime("%a"),
            "p": day_pct
        })

    return {
        "date": today_str,
        "rate": rate,
        "present": present,
        "absent": absent,
        "unmarked": unmarked,
        "defaulters": defaulters_count,
        "todayConducted": len(today_conducted),
        "totalStudents": len(students),
        "weekData": week_data
    }

@router.get("/department-summary")
def get_department_rankings(db: Session = Depends(get_db)):
    depts = db.query(Department).all()
    pct_map = get_all_student_pcts(db)
    results = []

    for d in depts:
        dept_students = db.query(Student.id).filter(Student.dept == d.code, Student.category == "Student").all()
        pcts = [pct_map[s[0]] for s in dept_students if s[0] in pct_map]
        avg = round(sum(pcts) / len(pcts)) if pcts else 0
        results.append({
            "code": d.code,
            "name": d.name,
            "pct": avg,
            "studentCount": len(dept_students)
        })

    results.sort(key=lambda x: x["pct"], reverse=True)
    return results

@router.get("/defaulters")
def list_defaulters(threshold: Optional[int] = None, dept: Optional[str] = None, db: Session = Depends(get_db)):
    settings = db.query(SystemSettings).first()
    limit = threshold if threshold is not None else (settings.min_pct if settings else 75)

    query = db.query(Student).filter(Student.category == "Student", Student.is_active == True)
    if dept and dept != "All":
        query = query.filter(Student.dept == dept)
    students = query.all()

    pct_map = get_all_student_pcts(db, dept)
    defaulters = []
    for s in students:
        pct = pct_map.get(s.id)
        if pct is not None and pct < limit:
            defaulters.append({
                "id": s.id,
                "name": s.name,
                "rollNo": s.roll_no,
                "dept": s.dept,
                "year": s.year,
                "section": s.section,
                "email": s.email,
                "phone": s.phone,
                "pct": pct
            })

    defaulters.sort(key=lambda x: x["pct"])
    return defaulters

@router.get("/export/csv")
def export_csv_report(dept: Optional[str] = None, db: Session = Depends(get_db)):
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Student",
        "Roll No",
        "Department",
        "Subject",
        "Lecture Date",
        "Lecture Time",
        "Lecture Status",
        "Attendance Status",
        "Marked At (ISO)",
        "Session Started At (ISO)",
        "Saved At (ISO)",
        "Session History (JSON)",
        "Attendance Audit (JSON)",
        "Reason"
    ])

    lec_query = db.query(Lecture).options(
        selectinload(Lecture.sessions),
        selectinload(Lecture.attendances).selectinload(LectureAttendance.student),
        selectinload(Lecture.attendances).selectinload(LectureAttendance.audit_logs)
    )
    if dept and dept != "All":
        lec_query = lec_query.filter(Lecture.dept == dept)
    lectures = lec_query.order_by(Lecture.date.desc(), Lecture.time.asc()).limit(150).all()

    for l in lectures:
        sessions_json = json.dumps([{"startedAt": s.started_at, "savedAt": s.saved_at} for s in l.sessions])
        if l.status == "Conducted":
            for att in l.attendances:
                audit_json = json.dumps([{"status": a.status, "recordedAt": a.recorded_at, "changedBy": a.changed_by} for a in att.audit_logs])
                writer.writerow([
                    att.student.name if att.student else "",
                    att.student.roll_no if att.student else "",
                    att.student.dept if att.student else l.dept,
                    l.subject,
                    l.date,
                    l.time,
                    l.status,
                    att.status,
                    att.recorded_at,
                    l.session_started_at or "",
                    l.saved_at or "",
                    sessions_json,
                    audit_json,
                    l.reason or ""
                ])
        else:
            writer.writerow([
                "", "", l.dept, l.subject, l.date, l.time, l.status,
                "", "", l.session_started_at or "", l.saved_at or "",
                sessions_json, "[]", l.reason or ""
            ])

    output.seek(0)
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=attendance_report_{datetime.date.today()}.csv"}
    )

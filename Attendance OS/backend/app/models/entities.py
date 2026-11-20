from sqlalchemy import Column, Integer, String, Boolean, Text, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base

class Department(Base):
    __tablename__ = "departments"

    code = Column(String(10), primary_key=True)  # 'CS', 'IT', etc.
    name = Column(String(100), nullable=False)
    color = Column(String(20), default="#7c6b9e")
    light_color = Column(String(20), default="#f0ebff")
    text_color = Column(String(20), default="#5b21b6")

    teachers = relationship("Teacher", back_populates="department")
    students = relationship("Student", back_populates="department")
    subjects = relationship("Subject", back_populates="department")


class User(Base):
    __tablename__ = "users"

    id = Column(String(50), primary_key=True)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(120), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False)  # 'admin', 'teacher', 'staff'


class Teacher(Base):
    __tablename__ = "teachers"

    id = Column(String(20), primary_key=True)  # 'T001', 'T002'
    name = Column(String(100), nullable=False)
    dept = Column(String(10), ForeignKey("departments.code"), nullable=False)
    role = Column(String(100), nullable=False)  # e.g. 'HOD, CS Dept'
    password = Column(String(100), nullable=False)
    email = Column(String(120), nullable=True)
    phone = Column(String(20), nullable=True)

    department = relationship("Department", back_populates="teachers")
    subjects = relationship("TeacherSubject", back_populates="teacher")


class Student(Base):
    __tablename__ = "students"

    id = Column(String(50), primary_key=True)  # 'S001', 'X171...'
    name = Column(String(100), nullable=False)
    roll_no = Column(String(50), unique=True, nullable=False, index=True)
    dept = Column(String(10), ForeignKey("departments.code"), nullable=False, index=True)
    category = Column(String(20), default="Student")  # 'Student' | 'Staff'
    year = Column(String(10), nullable=True)  # '1st', '2nd', '3rd', '4th'
    section = Column(String(5), nullable=True)  # 'A', 'B', 'C'
    role = Column(String(100), nullable=True)  # For staff
    avatar = Column(String(10), nullable=True)
    phone = Column(String(20), nullable=True)
    email = Column(String(120), nullable=True)
    is_active = Column(Boolean, default=True)

    department = relationship("Department", back_populates="students")
    gate_records = relationship("GateAttendance", back_populates="student")
    lecture_records = relationship("LectureAttendance", back_populates="student")
    remarks = relationship("StudentRemark", back_populates="student")


class Subject(Base):
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, autoincrement=True)
    dept = Column(String(10), ForeignKey("departments.code"), nullable=False)
    name = Column(String(100), nullable=False)
    sub_idx = Column(Integer, nullable=False)

    department = relationship("Department", back_populates="subjects")
    teachers = relationship("TeacherSubject", back_populates="subject")


class TeacherSubject(Base):
    __tablename__ = "teacher_subjects"

    teacher_id = Column(String(20), ForeignKey("teachers.id"), primary_key=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), primary_key=True)

    teacher = relationship("Teacher", back_populates="subjects")
    subject = relationship("Subject", back_populates="teachers")


class Lecture(Base):
    __tablename__ = "lectures"

    id = Column(String(100), primary_key=True)  # 'CS-0-2026-11-02'
    dept = Column(String(10), ForeignKey("departments.code"), nullable=False, index=True)
    subject = Column(String(100), nullable=False)
    sub_idx = Column(Integer, nullable=False)
    date = Column(String(10), nullable=False, index=True)  # YYYY-MM-DD
    time = Column(String(10), nullable=False)  # HH:MM
    status = Column(String(30), default="Upcoming")  # 'Upcoming' | 'In Progress' | 'Conducted' | 'Cancelled' | 'Rescheduled' | 'College Event' | 'Holiday'
    reason = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    attendance_method = Column(String(30), nullable=True)
    conducted_by = Column(String(100), nullable=True)
    session_started_at = Column(String(50), nullable=True)
    saved_at = Column(String(50), nullable=True)
    modified_at = Column(String(50), nullable=True)
    modified_by = Column(String(100), nullable=True)

    sessions = relationship("LectureSessionInterval", back_populates="lecture", cascade="all, delete-orphan")
    attendances = relationship("LectureAttendance", back_populates="lecture", cascade="all, delete-orphan")


class LectureSessionInterval(Base):
    __tablename__ = "lecture_session_intervals"

    id = Column(Integer, primary_key=True, autoincrement=True)
    lecture_id = Column(String(100), ForeignKey("lectures.id"), nullable=False)
    started_at = Column(String(50), nullable=False)
    saved_at = Column(String(50), nullable=True)

    lecture = relationship("Lecture", back_populates="sessions")


class GateAttendance(Base):
    __tablename__ = "gate_attendance"

    id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(String(50), ForeignKey("students.id"), nullable=False, index=True)
    date = Column(String(10), nullable=False, index=True)  # YYYY-MM-DD
    status = Column(String(20), default="Unmarked")  # 'Present' | 'Absent' | 'Late' | 'HalfDay' | 'Leave' | 'Unmarked'
    checked_in = Column(String(10), nullable=True)  # HH:MM
    checked_out = Column(String(10), nullable=True)  # HH:MM
    checked_in_at = Column(String(50), nullable=True)  # ISO string
    checked_out_at = Column(String(50), nullable=True)
    marked_by = Column(String(100), nullable=True)

    __table_args__ = (UniqueConstraint("student_id", "date", name="uq_student_date_gate"),)
    student = relationship("Student", back_populates="gate_records")


class LectureAttendance(Base):
    __tablename__ = "lecture_attendance"

    id = Column(Integer, primary_key=True, autoincrement=True)
    lecture_id = Column(String(100), ForeignKey("lectures.id"), nullable=False, index=True)
    student_id = Column(String(50), ForeignKey("students.id"), nullable=False, index=True)
    status = Column(String(20), nullable=False)  # 'Present' | 'Absent'
    recorded_at = Column(String(50), nullable=False)

    __table_args__ = (UniqueConstraint("lecture_id", "student_id", name="uq_lecture_student_att"),)
    lecture = relationship("Lecture", back_populates="attendances")
    student = relationship("Student", back_populates="lecture_records")
    audit_logs = relationship("AttendanceAudit", back_populates="attendance", cascade="all, delete-orphan")


class AttendanceAudit(Base):
    __tablename__ = "attendance_audit"

    id = Column(Integer, primary_key=True, autoincrement=True)
    attendance_id = Column(Integer, ForeignKey("lecture_attendance.id"), nullable=False)
    status = Column(String(20), nullable=False)
    recorded_at = Column(String(50), nullable=False)
    changed_by = Column(String(100), nullable=True)

    attendance = relationship("LectureAttendance", back_populates="audit_logs")


class StudentRemark(Base):
    __tablename__ = "student_remarks"

    id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(String(50), ForeignKey("students.id"), nullable=False, index=True)
    teacher_id = Column(String(20), nullable=True)
    category = Column(String(30), default="General")  # 'Medical' | 'Academic' | 'Discipline' | 'Commendation' | 'General'
    text = Column(Text, nullable=False)
    date = Column(String(10), nullable=False)  # YYYY-MM-DD
    created_at = Column(String(50), nullable=False)

    student = relationship("Student", back_populates="remarks")


class CalendarEvent(Base):
    __tablename__ = "calendar_events"

    id = Column(String(120), primary_key=True)
    date = Column(String(10), nullable=False, index=True)  # YYYY-MM-DD
    time = Column(String(10), nullable=False)
    dept = Column(String(10), nullable=False)
    subject = Column(String(100), nullable=False)
    status = Column(String(30), nullable=False)  # 'College Event' | 'Holiday'
    reason = Column(Text, nullable=True)
    participation_required = Column(Boolean, default=False)


class SystemSettings(Base):
    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True, default=1)
    college = Column(String(150), default="SSIPMT Raipur")
    min_pct = Column(Integer, default=75)
    late_after = Column(Integer, default=5)
    dupe_prev = Column(Boolean, default=True)
    auto_start = Column(Boolean, default=False)
    low_alert = Column(Boolean, default=True)

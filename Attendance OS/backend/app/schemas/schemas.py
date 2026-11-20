from typing import Optional, List, Dict, Any, Literal
from pydantic import BaseModel, Field

# ── AUTH SCHEMAS ─────────────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    role: Literal["admin", "teacher"]
    username: Optional[str] = None
    password: str
    teacher_id: Optional[str] = None

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    portal: str
    teacher_id: Optional[str] = None
    user: Dict[str, Any]

# ── REMARKS ──────────────────────────────────────────────────────────────────
class RemarkItem(BaseModel):
    id: Optional[int] = None
    text: str
    category: str = "General"  # 'Medical' | 'Academic' | 'Discipline' | 'Commendation' | 'General'
    date: str

class RemarkCreate(BaseModel):
    text: str
    category: Optional[str] = "General"
    date: Optional[str] = None

# ── ATTENDANCE AUDIT & HISTORY ────────────────────────────────────────────────
class AuditEntry(BaseModel):
    status: str
    recordedAt: str

class HistEntry(BaseModel):
    date: str
    status: str
    lectureId: Optional[str] = None
    subject: Optional[str] = None
    recordedAt: Optional[str] = None
    audit: Optional[List[AuditEntry]] = []

# ── STUDENT SCHEMAS ──────────────────────────────────────────────────────────
class StudentCreate(BaseModel):
    name: str
    rollNo: str
    dept: str
    year: Optional[str] = "1st"
    section: Optional[str] = "A"
    email: Optional[str] = ""
    phone: Optional[str] = ""
    category: Optional[str] = "Student"
    role: Optional[str] = None

class StudentOut(BaseModel):
    id: str
    name: str
    rollNo: str
    dept: str
    category: str = "Student"
    year: Optional[str] = None
    section: Optional[str] = None
    role: Optional[str] = None
    avatar: str
    phone: Optional[str] = ""
    email: Optional[str] = ""
    todayStatus: str = "Unmarked"
    checkedIn: Optional[str] = None
    checkedOut: Optional[str] = None
    checkedInAt: Optional[str] = None
    checkedOutAt: Optional[str] = None
    history: List[HistEntry] = []
    lectureAtt: Dict[str, str] = {}
    remarks: List[RemarkItem] = []

    class Config:
        from_attributes = True

# ── LECTURE SCHEMAS ──────────────────────────────────────────────────────────
class LectureSessionItem(BaseModel):
    startedAt: str
    savedAt: Optional[str] = None

class LectureOut(BaseModel):
    id: str
    dept: str
    subject: str
    subIdx: int
    date: str
    time: str
    status: str
    reason: Optional[str] = None
    notes: Optional[str] = None
    attendanceMethod: Optional[str] = None
    conductedBy: Optional[str] = None
    sessionStartedAt: Optional[str] = None
    savedAt: Optional[str] = None
    attendanceSessions: List[LectureSessionItem] = []
    modifiedAt: Optional[str] = None
    modifiedBy: Optional[str] = None

    class Config:
        from_attributes = True

class LectureUpdate(BaseModel):
    status: Optional[str] = None
    reason: Optional[str] = None
    notes: Optional[str] = None
    conductedBy: Optional[str] = None
    attendanceMethod: Optional[str] = None

class LectureExceptionRequest(BaseModel):
    status: Literal["Cancelled", "Rescheduled", "College Event", "Holiday"]
    reason: Optional[str] = ""

# ── ATTENDANCE ACTIONS ───────────────────────────────────────────────────────
class GateMarkRequest(BaseModel):
    student_id: str
    status: str
    is_out: bool = False

class LectureMarkRequest(BaseModel):
    student_id: str
    status: Literal["Present", "Absent"]

class LectureMarkAllRequest(BaseModel):
    status: Literal["Present", "Absent"]

# ── CALENDAR & SETTINGS ──────────────────────────────────────────────────────
class CalendarEventOut(BaseModel):
    id: str
    date: str
    time: str
    dept: str
    subject: str
    status: str
    reason: Optional[str] = None
    participationRequired: bool = False

class CalendarEventCreate(BaseModel):
    date: str
    time: str
    dept: str
    subject: str
    status: str
    reason: Optional[str] = None
    participationRequired: Optional[bool] = False

class SettingsOut(BaseModel):
    minPct: int = 75
    college: str = "SSIPMT Raipur"
    lateAfter: int = 5
    dupePrev: bool = True
    autoStart: bool = False
    lowAlert: bool = True

class SettingsUpdate(BaseModel):
    minPct: Optional[int] = None
    college: Optional[str] = None
    lateAfter: Optional[int] = None
    dupePrev: Optional[bool] = None
    autoStart: Optional[bool] = None
    lowAlert: Optional[bool] = None

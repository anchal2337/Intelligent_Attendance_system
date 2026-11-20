import { useState, useRef, useCallback, useMemo, useEffect } from "react"
import { authApi, studentsApi, lecturesApi, attendanceApi, calendarApi, settingsApi, reportsApi } from "./api/client"

const T = {
  bg: "#fdf8f4",
  card: "#fffdf9",
  sidebar: "#f9f5ff",
  border: "#ede8f5",
  primary: "#7c6b9e",
  primaryL: "#f0ebff",
  sage: "#7aaa6e",
  sageL: "#edf7eb",
  peach: "#e89a6a",
  peachL: "#fef3eb",
  rose: "#c96b73",
  roseL: "#fdeef0",
  blush: "#e8b4b8",
  blushL: "#fdf0f2",
  text: "#2d1f3f",
  muted: "#8b7a9e",
}
const F = {
  h: "Fraunces,'Georgia',serif",
  b: "'Plus Jakarta Sans',sans-serif",
  m: "'Space Mono',monospace",
}

type DS = "Present" | "Absent" | "Late" | "HalfDay" | "Leave" | "Unmarked"
type AttendanceStatus = "Present" | "Absent"
type Dept = "CS" | "IT" | "Mech" | "Civil" | "ECE" | "EEE"
type Cat = "Student" | "Staff"
type AView = "dashboard" | "attendance" | "calendar" | "students" | "reports" | "settings"
type TView = "overview" | "attend" | "classes" | "roster" | "analytics"
type Portal = "login" | "admin" | "teacher"

interface HistEntry {
  date: string
  status: DS
  lectureId?: string
  subject?: string
  recordedAt?: string
  audit?: { status: DS; recordedAt: string }[]
}
interface Person {
  id: string
  name: string
  rollNo: string
  dept: Dept
  category: Cat
  year?: string
  section?: string
  role?: string
  avatar: string
  phone: string
  email: string
  todayStatus: DS
  checkedIn?: string
  checkedOut?: string
  checkedInAt?: string
  checkedOutAt?: string
  history: HistEntry[]
  lectureAtt: Record<string, DS>
  remarks?: { text: string; category: string; date: string }[]
}
interface Settings {
  minPct: number
  college: string
  lateAfter: number
  dupePrev: boolean
  autoStart: boolean
  lowAlert: boolean
}
interface Teacher {
  id: string
  name: string
  dept: Dept
  role: string
  subjects: string[]
  password: string
}
export type LecStatus = 'Upcoming' | 'In Progress' | 'Conducted' | 'Cancelled' | 'Rescheduled' | 'College Event' | 'Holiday'
interface Lecture {
  id: string
  dept: Dept
  subject: string
  subIdx: number
  date: string
  time: string
  status: LecStatus
  reason?: string
  notes?: string
  attendanceMethod?: string
  conductedBy?: string
  savedAt?: string
  sessionStartedAt?: string
  attendanceSessions?: { startedAt: string; savedAt?: string }[]
  modifiedAt?: string
  modifiedBy?: string
}

const DC: Record<Dept, {
  color: string
  light: string
  text: string
  full: string
}> = {
  CS: {
    color: "#7c6b9e",
    light: "#f0ebff",
    text: "#5b21b6",
    full: "Computer Science",
  },
  IT: {
    color: "#6b8cae",
    light: "#e6f0fb",
    text: "#1e4d7a",
    full: "Info Technology",
  },
  Mech: {
    color: "#b87052",
    light: "#fdf0ea",
    text: "#92400e",
    full: "Mechanical",
  },
  Civil: {
    color: "#5a9e7c",
    light: "#e6f5ee",
    text: "#1a5c3a",
    full: "Civil Engg.",
  },
  ECE: {
    color: "#ae6b8c",
    light: "#f9e6f0",
    text: "#7a1e50",
    full: "Electronics",
  },
  EEE: {
    color: "#ae9c52",
    light: "#f7f0d6",
    text: "#705c00",
    full: "Electrical",
  },
}
const SC: Record<DS, { bg: string; text: string; dot: string; label: string }> = {
  Present: { bg: T.sageL, text: "#166534", dot: T.sage, label: "Present" },
  Absent: { bg: T.roseL, text: "#991b1b", dot: T.rose, label: "Absent" },
  Late: { bg: T.peachL, text: "#92400e", dot: T.peach, label: "Late" },
  HalfDay: {
    bg: "#e0f2fe",
    text: "#075985",
    dot: "#0ea5e9",
    label: "Half Day",
  },
  Leave: { bg: T.blushL, text: "#6b21a8", dot: T.blush, label: "Leave" },
  Unmarked: { bg: T.bg, text: T.muted, dot: T.border, label: "Unmarked" },
}
const SUBJ: Record<Dept, string[]> = {
  CS: [
    "Data Structures",
    "Algorithms",
    "DBMS",
    "OS",
    "Comp. Networks",
    "Software Engg.",
  ],
  IT: [
    "Web Technology",
    "Database Sys.",
    "Networking",
    "Python",
    "Cloud Computing",
    "Cyber Security",
  ],
  Mech: [
    "Thermodynamics",
    "Fluid Mechanics",
    "Manufacturing",
    "Machine Design",
    "Heat Transfer",
    "Kinematics",
  ],
  Civil: [
    "Structural Analysis",
    "Fluid Mechanics",
    "Surveying",
    "Soil Mechanics",
    "Concrete Design",
    "Highway Engg.",
  ],
  ECE: [
    "Signals & Systems",
    "Digital Electronics",
    "Microprocessors",
    "Communication",
    "VLSI Design",
    "Electromagnetics",
  ],
  EEE: [
    "Circuit Theory",
    "Power Systems",
    "Elec. Machines",
    "Control Systems",
    "Power Electronics",
    "Measurement",
  ],
}
const TIMES = ["09:00", "10:00", "11:00", "14:00", "15:00"]
const DEPTS: Dept[] = ["CS", "IT", "Mech", "Civil", "ECE", "EEE"]

const TEACHERS: Teacher[] = [
  {
    id: "T001",
    name: "Dr. Ramesh Iyer",
    dept: "CS",
    role: "HOD, CS Dept",
    subjects: SUBJ.CS,
    password: "cs123",
  },
  {
    id: "T002",
    name: "Prof. Sunita Das",
    dept: "IT",
    role: "Asst. Professor, IT",
    subjects: SUBJ.IT,
    password: "it123",
  },
  {
    id: "T003",
    name: "Dr. Ajay Tiwari",
    dept: "Mech",
    role: "Professor, Mech",
    subjects: SUBJ.Mech,
    password: "mech123",
  },
  {
    id: "T004",
    name: "Ms. Rekha Nair",
    dept: "Civil",
    role: "Lecturer, Civil",
    subjects: SUBJ.Civil,
    password: "civil123",
  },
  {
    id: "T005",
    name: "Dr. Meena Pillai",
    dept: "EEE",
    role: "Professor, EEE",
    subjects: SUBJ.EEE,
    password: "eee123",
  },
  {
    id: "T006",
    name: "Mr. Vishal Bose",
    dept: "ECE",
    role: "Lab Incharge, ECE",
    subjects: SUBJ.ECE,
    password: "ece123",
  },
]


// ── VOICE RECOGNITION SERVICE ─────────────────────────────────────────────────
export const VoiceService = {
  listenContinuously(
    onResult: (text: string) => void,
    onState: (state: "listening" | "stopped" | "error") => void,
  ) {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      onState("error")
      return () => onState("stopped")
    }
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const rec = new SpeechRec()
    let active = true
    let failed = false
    let restartTimer: ReturnType<typeof setTimeout> | undefined
    const seen = new Set<string>()
    rec.continuous = true
    rec.interimResults = false
    rec.lang = "en-US"
    rec.onresult = (event: any) => {
      for (let index = event.resultIndex; index < event.results.length; index++) {
        const result = event.results[index]
        if (!result.isFinal) continue
        const text = result[0]?.transcript?.trim()
        const key = `${index}:${text?.toLowerCase()}`
        if (text && !seen.has(key)) {
          seen.add(key)
          onResult(text)
        }
      }
    }
    rec.onerror = (event: any) => {
      console.error(event)
      if (["not-allowed", "service-not-allowed", "audio-capture"].includes(event.error)) {
        active = false
        failed = true
        onState("error")
      }
    }
    rec.onend = () => {
      if (!active) {
        if (!failed) onState("stopped")
        return
      }
      restartTimer = setTimeout(() => {
        if (!active) return
        try {
          rec.start()
          onState("listening")
        } catch {
          restartTimer = setTimeout(() => {
            if (!active) return
            try {
              rec.start()
              onState("listening")
            } catch {
              active = false
              onState("error")
            }
          }, 300)
        }
      }, 200)
    }
    try {
      rec.start()
      onState("listening")
    } catch {
      active = false
      failed = true
      onState("error")
    }
    return () => {
      active = false
      if (restartTimer) clearTimeout(restartTimer)
      try { rec.stop() } catch {}
      onState("stopped")
    }
  },
  listen(onResult: (text: string) => void, onEnd: () => void) {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in this browser.');
      onEnd();
      return;
    }
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const rec = new SpeechRec();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = 'en-US';
    rec.onresult = (e: any) => {
      const text = e.results[0][0].transcript;
      onResult(text);
    };
    rec.onerror = (e: any) => console.error(e);
    rec.onend = () => onEnd();
    rec.start();
  }
}




// ── SEEDED RNG ─────────────────────────────────────────────────────────────────
function mkRng(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return s / 2147483647
  }
}

// ── LECTURE GENERATION ────────────────────────────────────────────────────────
function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

function genLectures(): Lecture[] {
  const out: Lecture[] = []
  const today = new Date()
  const sched: [number, number][] = [
    [1, 3],
    [2, 4],
    [1, 4],
    [2, 3],
    [1, 2],
    [3, 4],
  ]
  for (let day = 89; day >= -7; day--) {
    const d = new Date(today)
    d.setDate(today.getDate() - day)
    const dow = d.getDay()
    if (dow === 0 || dow === 6) continue
    const ds = localDateKey(d)
    DEPTS.forEach((dept) =>
      SUBJ[dept].forEach((subject, si) => {
        const [d1, d2] = sched[si % sched.length]
        if (dow === d1 || dow === d2) {
          const ti = (si + (dow === d2 ? 2 : 0)) % TIMES.length
          out.push({
            id: `${dept}-${si}-${ds}`,
            dept,
            subject,
            subIdx: si,
            date: ds,
            time: TIMES[ti],
            status: ds < localDateKey(today) ? 'Conducted' : 'Upcoming',
          })
        }
      }),
    )
  }
  return out
}
let ALL_LECS = genLectures()
let CURRENT_LECTURES = ALL_LECS
const todayStr = () => localDateKey(new Date())
const nowStr = () => {
  const n = new Date()
  return `${String(n.getHours()).padStart(2, "0")}:${String(n.getMinutes()).padStart(2, "0")}`
}

// ── STUDENT GENERATION ────────────────────────────────────────────────────────
const FNAMES = [
  "Aarav",
  "Aditi",
  "Ajay",
  "Akash",
  "Akshay",
  "Amar",
  "Ananya",
  "Anil",
  "Anjali",
  "Ankit",
  "Ansh",
  "Anushka",
  "Arjun",
  "Aryan",
  "Asha",
  "Ayaan",
  "Bhavya",
  "Chirag",
  "Deepak",
  "Deepika",
  "Dev",
  "Divya",
  "Gaurav",
  "Harsh",
  "Isha",
  "Jatin",
  "Jaya",
  "Karan",
  "Kavya",
  "Komal",
  "Krishna",
  "Kunal",
  "Lakshmi",
  "Lalit",
  "Manish",
  "Manisha",
  "Meera",
  "Mohit",
  "Naina",
  "Neha",
  "Nikhil",
  "Nikita",
  "Nisha",
  "Nitesh",
  "Pallavi",
  "Pooja",
  "Prachi",
  "Priya",
  "Rahul",
  "Raj",
  "Rajan",
  "Rajesh",
  "Ravi",
  "Rekha",
  "Rishi",
  "Ritika",
  "Rohan",
  "Rohit",
  "Ruchi",
  "Sachin",
  "Sahil",
  "Sai",
  "Sanchi",
  "Sanjay",
  "Sara",
  "Shivam",
  "Shreya",
  "Shubham",
  "Siddharth",
  "Sneha",
  "Sonam",
  "Suresh",
  "Swati",
  "Tanvi",
  "Tarun",
  "Uday",
  "Uma",
  "Varun",
  "Vedant",
  "Vibha",
  "Vikas",
  "Vikram",
  "Vishal",
  "Vivek",
  "Yash",
  "Yogesh",
]
const LNAMES = [
  "Agarwal",
  "Ahuja",
  "Bajaj",
  "Bansal",
  "Bose",
  "Chauhan",
  "Chopra",
  "Dalal",
  "Das",
  "Desai",
  "Dixit",
  "Dubey",
  "Ghosh",
  "Gupta",
  "Iyer",
  "Jain",
  "Joshi",
  "Kapoor",
  "Kaur",
  "Khan",
  "Khanna",
  "Kumar",
  "Lal",
  "Mahajan",
  "Mehta",
  "Mishra",
  "Nair",
  "Pandey",
  "Patel",
  "Patil",
  "Pillai",
  "Rao",
  "Rastogi",
  "Reddy",
  "Sahu",
  "Saxena",
  "Shah",
  "Sharma",
  "Shukla",
  "Singh",
  "Sinha",
  "Srivastava",
  "Tiwari",
  "Tripathi",
  "Varma",
  "Verma",
  "Yadav",
]

function genHistory(seed: number, pct: number): HistEntry[] {
  const r = mkRng(seed)
  const entries: HistEntry[] = []
  const today = new Date()
  for (let i = 89; i >= 1; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    if (d.getDay() === 0 || d.getDay() === 6) continue
    const v = r()
    let s: DS
    if (v < (pct / 100) * 0.82) s = "Present"
    else if (v < (pct / 100) * 0.91) s = "Late"
    else if (v < (pct / 100) * 0.95) s = "HalfDay"
    else if (v < (pct / 100) * 0.97) s = "Leave"
    else s = "Absent"
    entries.push({ date: d.toISOString().slice(0, 10), status: s })
  }
  return entries
}
function generateStudents(): Person[] {
  const out: Person[] = []
  const used = new Set<string>()
  const r = mkRng(42)
  const YEARS = ["1st", "2nd", "3rd", "4th"]
  const SECS = ["A", "B", "C"]
  let idx = 0
  DEPTS.forEach((dept) => {
    // ~100 per dept = 600 students total
    for (let i = 0; i < 100; i++) {
      let fn: string, ln: string
      do {
        fn = FNAMES[Math.floor(r() * FNAMES.length)]
        ln = LNAMES[Math.floor(r() * LNAMES.length)]
      } while (used.has(fn + ln))
      used.add(fn + ln)
      const year = YEARS[Math.floor(r() * 4)]
      const sec = SECS[Math.floor(r() * 3)]
      const rollNum = String(2100 + idx).slice(1)
      const id = `S${String(idx + 1).padStart(3, "0")}`
      const rollNo = `${dept}${year[0]}${rollNum}`
      out.push({
        id,
        name: `${fn} ${ln}`,
        rollNo,
        dept,
        category: "Student",
        year,
        section: sec,
        avatar: `${fn[0]}${ln[0]}`,
        phone: `9${String(Math.floor(r() * 1e9)).slice(0, 9)}`,
        email: `${fn.toLowerCase()}.${ln.toLowerCase()}@ssipmt.ac.in`,
        todayStatus: "Unmarked",
        checkedIn: undefined,
        checkedOut: undefined,
        history: [],
        lectureAtt: {},
      })
      idx++
    }
  })
  // Staff
  out.push(
    ...[
      {
        id: "A001",
        name: "Mohan Das",
        rollNo: "ADM001",
        dept: "CS" as Dept,
        category: "Staff" as Cat,
        role: "Office Superintendent",
        avatar: "MD",
        phone: "9876500001",
        email: "mohan@ssipmt.ac.in",
        todayStatus: "Present" as DS,
        checkedIn: "07:45",
        history: genHistory(901, 97),
        lectureAtt: {},
        checkedOut: undefined,
      },
      {
        id: "P001",
        name: "Ramkumar Singh",
        rollNo: "PEO001",
        dept: "CS" as Dept,
        category: "Staff" as Cat,
        role: "Peon",
        avatar: "RS",
        phone: "9876500002",
        email: "ramkumar@ssipmt.ac.in",
        todayStatus: "Present" as DS,
        checkedIn: "07:30",
        history: genHistory(902, 99),
        lectureAtt: {},
        checkedOut: undefined,
      },
      {
        id: "B001",
        name: "Archana Mishra",
        rollNo: "LIB001",
        dept: "CS" as Dept,
        category: "Staff" as Cat,
        role: "Chief Librarian",
        avatar: "AM",
        phone: "9876500003",
        email: "archana@ssipmt.ac.in",
        todayStatus: "Present" as DS,
        checkedIn: "08:45",
        history: genHistory(903, 98),
        lectureAtt: {},
        checkedOut: undefined,
      },
    ],
  )
  return out
}

const INIT_PEOPLE = generateStudents()

const PEOPLE_STORAGE_KEY = "attend-os-people-v1"
const LECTURES_STORAGE_KEY = "attend-os-lectures-v1"
const EVENTS_STORAGE_KEY = "attend-os-events-v1"
const ROUTE_STORAGE_KEY = "attend-os-route-v1"

type CalendarEvent = {
  id: string
  date: string
  time: string
  dept: Dept
  subject: string
  status: "College Event" | "Holiday"
  reason?: string
  participationRequired?: boolean
}

const APP_ROUTES: AView[] = [
  "dashboard",
  "attendance",
  "calendar",
  "students",
  "reports",
  "settings",
]
const TEACHER_ROUTES: TView[] = [
  "overview",
  "attend",
  "classes",
  "roster",
  "analytics",
]

function readStoredValue<T>(key: string, fallback: T): T {
  try {
    const value = window.localStorage.getItem(key)
    return value ? (JSON.parse(value) as T) : fallback
  } catch {
    return fallback
  }
}

function saveStoredValue<T>(key: string, value: T) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Keep the in-memory workflow available when browser storage is unavailable.
  }
}

function readCurrentRoute(): { portal: Portal; teacherId?: string } {
  const route = readStoredValue<{ portal?: Portal; teacherId?: string }>(
    ROUTE_STORAGE_KEY,
    {},
  )
  const portal = route.portal
  if (portal === "admin") return { portal }
  if (
    portal === "teacher" &&
    TEACHERS.some((teacher) => teacher.id === route.teacherId)
  ) {
    return { portal, teacherId: route.teacherId }
  }
  return { portal: "login" }
}

function readSavedView<T extends string>(
  key: string,
  allowed: readonly T[],
  fallback: T,
): T {
  const view = readStoredValue<string>(key, fallback)
  return allowed.includes(view as T) ? (view as T) : fallback
}

function mergeEventRecords(
  lectures: Lecture[],
  savedEvents: unknown[],
): CalendarEvent[] {
  const records = new Map<string, CalendarEvent>()
  savedEvents.forEach((record) => {
    if (!record || typeof record !== "object") return
    const event = record as CalendarEvent
    if (
      typeof event.date !== "string" ||
      typeof event.time !== "string" ||
      typeof event.subject !== "string" ||
      !["College Event", "Holiday"].includes(event.status)
    ) return
    records.set(event.id, event)
  })
  lectures
    .filter(
      (lecture) =>
        lecture.status === "College Event" || lecture.status === "Holiday",
    )
    .forEach((lecture) => {
      const id = `${lecture.id}:${lecture.status}`
      const saved = records.get(id)
      records.set(id, {
        id,
        date: lecture.date,
        time: lecture.time,
        dept: lecture.dept,
        subject: lecture.subject,
        status: lecture.status,
        reason: saved?.reason ?? lecture.reason,
        participationRequired: saved?.participationRequired ?? false,
      })
    })
  return [...records.values()]
}

function viewStorageKey(portal: "admin" | "teacher", teacherId?: string) {
  return portal === "teacher"
    ? `attend-os-view-teacher-${teacherId}`
    : "attend-os-view-admin"
}

function readStoredRecords<T>(key: string): T[] {
  try {
    const value = window.localStorage.getItem(key)
    const records: unknown = value ? JSON.parse(value) : []
    return Array.isArray(records) ? (records as T[]) : []
  } catch {
    return []
  }
}

function writeStoredRecords<T>(key: string, records: T[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify(records))
  } catch {
    // Keep the in-memory workflow available when browser storage is unavailable.
  }
}

function isLectureRecord(record: unknown): record is Lecture {
  if (!record || typeof record !== "object") return false
  const lecture = record as Partial<Lecture>
  return (
    typeof lecture.id === "string" &&
    typeof lecture.dept === "string" &&
    typeof lecture.subject === "string" &&
    typeof lecture.date === "string" &&
    typeof lecture.time === "string"
  )
}

function lectureRecordKey(
  lecture: Pick<Lecture, "date" | "time" | "subject" | "dept">,
) {
  return [lecture.date, lecture.time, lecture.subject, lecture.dept]
    .map((value) => value.trim().toLowerCase())
    .join("|")
}

function mergeLectureRecords(schedule: Lecture[], saved: unknown[]): Lecture[] {
  const records = new Map<string, Lecture>()
  saved.filter(isLectureRecord).forEach((lecture) => {
    records.set(lectureRecordKey(lecture), lecture)
  })
  schedule.forEach((lecture) => {
    const key = lectureRecordKey(lecture)
    const savedLecture = records.get(key)
    records.set(
      key,
      savedLecture
        ? { ...lecture, ...savedLecture, id: lecture.id }
        : lecture,
    )
  })
  return [...records.values()].sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      a.time.localeCompare(b.time) ||
      a.dept.localeCompare(b.dept) ||
      a.subject.localeCompare(b.subject),
  )
}

function isPersonRecord(record: unknown): record is Person {
  if (!record || typeof record !== "object") return false
  const person = record as Partial<Person>
  return (
    typeof person.id === "string" &&
    typeof person.name === "string" &&
    Array.isArray(person.history) &&
    !!person.lectureAtt &&
    typeof person.lectureAtt === "object"
  )
}

function loadPeople(): Person[] {
  const saved = readStoredRecords<unknown>(PEOPLE_STORAGE_KEY).filter(
    isPersonRecord,
  )
  if (!saved.length) return INIT_PEOPLE
  const savedLectures = mergeLectureRecords(
    ALL_LECS,
    readStoredRecords<unknown>(LECTURES_STORAGE_KEY),
  )
  const validLectureIds = new Set(savedLectures.map((lecture) => lecture.id))
  const activeLectureIds = new Set(
    savedLectures
      .filter((lecture) => lecture.status === "Conducted" || lecture.status === "In Progress")
      .map((lecture) => lecture.id),
  )
  const cleanAttendance = (person: Person): Person => {
    const todayRecord = person.history.find(
      (entry) => entry.date === todayStr() && !entry.lectureId,
    )
    const todayLectureRecord = person.history
      .filter(
        (entry) =>
          entry.date === todayStr() &&
          entry.lectureId &&
          activeLectureIds.has(entry.lectureId),
      )
      .sort((a, b) => (a.recordedAt || "").localeCompare(b.recordedAt || ""))
      .at(-1)
    const recordedLectureIds = new Set(
      person.history
        .filter((entry) => entry.lectureId && activeLectureIds.has(entry.lectureId))
        .map((entry) => entry.lectureId as string),
    )
    const attendanceFromHistory = Object.fromEntries(
      person.history
        .filter((entry) => entry.lectureId && activeLectureIds.has(entry.lectureId))
        .flatMap((entry) => {
          const status = finalAttendanceStatus(entry.status)
          return status ? [[entry.lectureId as string, status]] : []
        }),
    )
    return {
      ...person,
      todayStatus:
        person.category === "Student"
          ? finalAttendanceStatus(todayLectureRecord?.status) ?? todayRecord?.status ?? "Unmarked"
          : person.todayStatus,
      checkedIn:
        person.category === "Student"
          ? todayLectureRecord?.recordedAt
            ? new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(todayLectureRecord.recordedAt))
            : todayRecord
              ? person.checkedIn
              : undefined
          : person.checkedIn,
      checkedInAt:
        person.category === "Student"
          ? todayLectureRecord?.recordedAt || (todayRecord ? person.checkedInAt : undefined)
          : person.checkedInAt,
      lectureAtt: {
        ...Object.fromEntries(
          Object.entries(person.lectureAtt)
            .filter(([id]) => activeLectureIds.has(id) && recordedLectureIds.has(id))
            .flatMap(([id, status]) => {
              const normalized = finalAttendanceStatus(status)
              return normalized ? [[id, normalized]] : []
            }),
        ),
        ...attendanceFromHistory,
      } as Record<string, DS>,
      history: person.history
        .filter(
          (entry) => !entry.lectureId || validLectureIds.has(entry.lectureId),
        )
        .flatMap((entry) => {
          if (!entry.lectureId) return [entry]
          const normalized = finalAttendanceStatus(entry.status)
          return [{ ...entry, status: normalized || "Unmarked" }]
        }),
    }
  }
  const savedById = new Map(saved.map((person) => [person.id, person]))
  const initialIds = new Set(INIT_PEOPLE.map((person) => person.id))
  return [
    ...INIT_PEOPLE.map((person) => ({
      ...person,
      ...cleanAttendance(savedById.get(person.id) ?? person),
    })),
    ...saved
      .filter((person) => !initialIds.has(person.id))
      .map(cleanAttendance),
  ]
}

function recordLectureAttendance(
  person: Person,
  lecture: Lecture,
  status: AttendanceStatus,
  recordedAt = new Date().toISOString(),
): Person {
  const existing = person.history.find((entry) => entry.lectureId === lecture.id)
  if (existing?.status === status && person.lectureAtt[lecture.id] === status) return person
  return {
    ...person,
    todayStatus:
      lecture.date === todayStr() ? status : person.todayStatus,
    checkedIn:
      lecture.date === todayStr()
        ? status === "Present"
          ? new Intl.DateTimeFormat(undefined, {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            }).format(new Date(recordedAt))
          : undefined
        : person.checkedIn,
    checkedInAt:
      lecture.date === todayStr()
        ? status === "Present"
          ? recordedAt
          : undefined
        : person.checkedInAt,
    lectureAtt: { ...person.lectureAtt, [lecture.id]: status },
    history: [
      ...person.history.filter((entry) => entry.lectureId !== lecture.id),
      {
        date: lecture.date,
        status,
        lectureId: lecture.id,
        subject: lecture.subject,
        recordedAt,
        audit: existing
          ? [
              ...(existing.audit || []),
              {
                status: existing.status,
                recordedAt: existing.recordedAt || recordedAt,
              },
            ]
          : [],
      },
    ],
  }
}

function finalAttendanceStatus(status: DS | undefined): AttendanceStatus | undefined {
  if (status === "Present" || status === "Late" || status === "HalfDay") {
    return "Present"
  }
  return status === "Absent" ? "Absent" : undefined
}

function lectureScore(person: Person, lectures: Lecture[]) {
  const marked = lectures
    .filter((lecture) => lecture.status === "Conducted")
    .map((lecture) => finalAttendanceStatus(person.lectureAtt[lecture.id]))
    .filter((status): status is AttendanceStatus => !!status)
  if (!marked.length) return null
  const attended = marked.filter((status) => status === "Present").length
  return Math.round((attended / marked.length) * 100)
}

function subjectAttendance(person: Person, lectures: Lecture[]) {
  return SUBJ[person.dept].map((name) => {
    const subjectLectures = lectures.filter(
      (lecture) =>
        lecture.dept === person.dept &&
        lecture.subject === name &&
        lecture.status === "Conducted",
    )
    const statuses = subjectLectures
      .map((lecture) => finalAttendanceStatus(person.lectureAtt[lecture.id]))
      .filter((status): status is AttendanceStatus => !!status)
    const attended = statuses.filter((status) => status === "Present").length
    return {
      name,
      attended,
      total: statuses.length,
      pct: statuses.length ? Math.round((attended / statuses.length) * 100) : 0,
    }
  })
}

function lectureExportRows(people: Person[], lectures: Lecture[]) {
  const rows: string[][] = [[
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
    "Reason",
  ]]
  const orderedLectures = [...lectures].sort(
    (a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time),
  )
  orderedLectures.forEach((lecture) => {
    if (lecture.status === "Conducted") {
      people
        .filter((person) => person.category === "Student" && person.dept === lecture.dept)
        .forEach((person) => {
          const status = finalAttendanceStatus(person.lectureAtt[lecture.id])
          if (!status) return
          const attendance = person.history.find((entry) => entry.lectureId === lecture.id)
          rows.push([
            person.name,
            person.rollNo,
            person.dept,
            lecture.subject,
            lecture.date,
            lecture.time,
            lecture.status,
            status,
            attendance?.recordedAt || "",
            lecture.sessionStartedAt || "",
            lecture.savedAt || "",
            JSON.stringify(lecture.attendanceSessions || []),
            JSON.stringify(attendance?.audit || []),
            lecture.reason || "",
          ])
        })
    } else if (["Cancelled", "Rescheduled", "College Event", "Holiday"].includes(lecture.status)) {
      rows.push([
        "",
        "",
        lecture.dept,
        lecture.subject,
        lecture.date,
        lecture.time,
        lecture.status,
        "",
        "",
        lecture.sessionStartedAt || "",
        lecture.savedAt || "",
        JSON.stringify(lecture.attendanceSessions || []),
        "",
        lecture.reason || "",
      ])
    }
  })
  return rows
}

function sameLectureSlot(a: Lecture, b: Lecture) {
  return lectureRecordKey(a) === lectureRecordKey(b)
}

function overallPct(p: Person) {
  const conductedIds = new Set(
    CURRENT_LECTURES.filter((lecture) => lecture.status === "Conducted").map((lecture) => lecture.id),
  )
  const statuses = Object.entries(p.lectureAtt)
    .filter(([lectureId]) => conductedIds.has(lectureId))
    .map(([, status]) => status)
    .map((status) => finalAttendanceStatus(status))
    .filter((status): status is AttendanceStatus => !!status)
  if (!statuses.length) return 0
  return Math.round(
    (statuses.filter((status) => status === "Present").length /
      statuses.length) *
      100,
  )
}
function hasRecordedAttendance(person: Person) {
  return overallPctHasMarks(person)
}
function overallPctHasMarks(person: Person) {
  const conductedIds = new Set(
    CURRENT_LECTURES.filter((lecture) => lecture.status === "Conducted").map((lecture) => lecture.id),
  )
  return Object.entries(person.lectureAtt).some(
    ([lectureId, status]) => conductedIds.has(lectureId) && finalAttendanceStatus(status) !== undefined,
  )
}
function formatTimestamp(value?: string) {
  if (!value) return "—"
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date)
}
function downloadCSV(name: string, rows: string[][]) {
  const csv = "\uFEFF" + rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(",")).join("\r\n")
  const a = document.createElement("a")
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }))
  a.download = name.endsWith('.csv') ? name : `${name}.csv`
  a.click()
}

function exportToExcel(name: string, sheetName: string, rows: (string | number)[][]) {
  const xmlRows = rows.map((r) =>
    `<Row>${r.map((c) => {
      const isNum = typeof c === 'number'
      const val = String(c ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      return `<Cell><Data ss:Type="${isNum ? 'Number' : 'String'}">${val}</Data></Cell>`
    }).join('')}</Row>`
  ).join('')

  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="${sheetName || 'Report'}">
  <Table>${xmlRows}</Table>
 </Worksheet>
</Workbook>`

  const a = document.createElement("a")
  a.href = URL.createObjectURL(new Blob([xml], { type: "application/vnd.ms-excel;charset=utf-8;" }))
  a.download = name.endsWith('.xls') ? name : `${name}.xls`
  a.click()
}

// ── SHARED UI ─────────────────────────────────────────────────────────────────
function Sparkle({
  size = 10,
  color = T.blush,
}: {
  size?: number
  color?: string
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 10 10"
      style={{ display: "inline", verticalAlign: "middle", flexShrink: 0 }}
    >
      <path
        d="M5 0 L5.6 4.4 L10 5 L5.6 5.6 L5 10 L4.4 5.6 L0 5 L4.4 4.4 Z"
        fill={color}
      />
    </svg>
  )
}
function Av({ av, dept, size = 36 }: { av: string; dept: Dept; size?: number }) {
  const c = DC[dept]
  return (
    <div
      style={{
        width: size,
        height: size,
        background: c.light,
        border: `1.5px solid ${c.color}30`,
        borderRadius: size * 0.28,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.32,
        fontWeight: 700,
        color: c.color,
        fontFamily: F.b,
        flexShrink: 0,
      }}
    >
      {av}
    </div>
  )
}
function Bdg({ s }: { s: DS }) {
  const c = SC[s]
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "3px 9px",
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 600,
        background: c.bg,
        color: c.text,
        fontFamily: F.b,
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{ width: 6, height: 6, borderRadius: "50%", background: c.dot }}
      />
      {c.label}
    </span>
  )
}
function TeacherAttendanceBdg({ status }: { status: DS }) {
  const finalStatus = finalAttendanceStatus(status)
  if (finalStatus) return <Bdg s={finalStatus} />
  return (
    <span
      style={{
        padding: "3px 9px",
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 600,
        background: T.bg,
        color: T.muted,
        fontFamily: F.b,
      }}
    >
      Unmarked
    </span>
  )
}
function PBar({ pct, min = 75, recorded = true }: { pct: number; min?: number; recorded?: boolean }) {
  if (!recorded) {
    return <span style={{fontSize:11,fontFamily:F.b,color:T.muted}}>Unmarked</span>
  }
  const color = pct >= min ? T.sage : pct >= 60 ? T.peach : T.rose
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div
        style={{
          flex: 1,
          height: 5,
          background: T.primaryL,
          borderRadius: 5,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: color,
            borderRadius: 5,
            transition: "width .5s",
          }}
        />
      </div>
      <span
        style={{
          fontSize: 11,
          fontFamily: F.m,
          color,
          fontWeight: 700,
          minWidth: 34,
        }}
      >
        {pct}%
      </span>
    </div>
  )
}
function Card({
  children,
  style,
  className,
}: {
  children: React.ReactNode
  style?: React.CSSProperties
  className?: string
}) {
  return (
    <div
      className={className}
      style={{
        background: T.card,
        borderRadius: 14,
        border: `1px solid ${T.border}`,
        ...style,
      }}
    >
      {children}
    </div>
  )
}
function Btn({
  children,
  onClick,
  v = "primary",
  sm,
  disabled,
  full,
}: {
  children: React.ReactNode
  onClick?: () => void
  v?: "primary" | "ghost" | "danger" | "sage"
  sm?: boolean
  disabled?: boolean
  full?: boolean
}) {
  const s = {
    primary: { background: T.primary, color: "#fff", border: "none" },
    ghost: {
      background: T.card,
      color: T.primary,
      border: `1.5px solid ${T.border}`,
    },
    danger: { background: T.roseL, color: T.rose, border: "none" },
    sage: { background: T.sageL, color: T.sage, border: "none" },
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...s[v],
        padding: sm ? "6px 13px" : "9px 18px",
        borderRadius: 9,
        fontFamily: F.b,
        fontWeight: 700,
        fontSize: sm ? 12 : 13,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        width: full ? "100%" : undefined,
      }}
      onMouseEnter={(e) => !disabled && (e.currentTarget.style.opacity = ".82")}
      onMouseLeave={(e) =>
        (e.currentTarget.style.opacity = disabled ? ".6" : "1")
      }
    >
      {children}
    </button>
  )
}
function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  wide?: boolean
}) {
  if (!open) return null
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(45,31,63,.35)",
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backdropFilter: "blur(3px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="pop-in"
        style={{
          background: T.card,
          borderRadius: 18,
          padding: 26,
          width: wide ? 640 : 480,
          maxHeight: "88vh",
          overflowY: "auto",
          boxShadow: "0 20px 60px rgba(45,31,63,.18)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 18,
          }}
        >
          <div
            style={{
              fontFamily: F.h,
              fontSize: 19,
              fontWeight: 700,
              color: T.text,
              display: "flex",
              alignItems: "center",
              gap: 7,
            }}
          >
            <Sparkle />
            {title}
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: T.muted,
              fontSize: 20,
            }}
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
function DotGrid() {
  const [cur, setCur] = useState({ x: 0, y: 0 })
  const [on, setOn] = useState(false)
  const mask = `radial-gradient(circle at ${cur.x}px ${cur.y}px,#000 55px,transparent 100px)`
  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(circle,rgba(124,107,158,.1) 1px,transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(circle,rgba(124,107,158,.4) 2px,transparent 2px)",
          backgroundSize: "24px 24px",
          opacity: on ? 1 : 0,
          maskImage: mask,
          WebkitMaskImage: mask,
          transition: "opacity .2s",
          pointerEvents: "all",
        }}
        onPointerEnter={() => setOn(true)}
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          setCur({ x: e.clientX - r.left, y: e.clientY - r.top })
        }}
        onPointerLeave={() => setOn(false)}
      />
    </div>
  )
}

// ── LOGIN ─────────────────────────────────────────────────────────────────────
function LoginScreen({
  onLogin,
}: {
  onLogin: (p: Portal, tid?: string) => void
}) {
  const [role, setRole] = useState<"admin" | "teacher" | null>(null)
  const [user, setUser] = useState("")
  const [pass, setPass] = useState("")
  const [err, setErr] = useState("")
  const [selT, setSelT] = useState<Teacher | null>(null)
  const submit = async () => {
    setErr("")
    try {
      if (role === "admin") {
        await authApi.login({ role: "admin", username: user, password: pass })
        onLogin("admin")
      } else {
        if (!selT) {
          setErr("Select a teacher")
          return
        }
        await authApi.login({ role: "teacher", teacher_id: selT.id, password: pass })
        onLogin("teacher", selT.id)
      }
    } catch (e: any) {
      if (role === "admin" && user === "admin" && pass === "admin") {
        onLogin("admin")
        return
      }
      if (role === "teacher" && selT && pass === selT.password) {
        onLogin("teacher", selT.id)
        return
      }
      setErr(e.message || (role === "admin" ? "Try admin / admin" : `Hint: ${selT?.dept.toLowerCase()}123`))
    }
  }
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: T.bg,
        position: "relative",
      }}
    >
      <DotGrid />
      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: 440,
          padding: "0 20px",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              background: T.primaryL,
              borderRadius: 16,
              padding: "12px 20px",
              border: `1px solid ${T.border}`,
            }}
          >
            <Sparkle size={20} color={T.primary} />
            <span
              style={{
                fontFamily: F.h,
                fontSize: 22,
                fontWeight: 700,
                color: T.primary,
              }}
            >
              AttendOS
            </span>
          </div>
          <div
            style={{
              fontFamily: F.b,
              fontSize: 12,
              color: T.muted,
              marginTop: 8,
            }}
          >
            SSIPMT Raipur · Attendance Management System
          </div>
        </div>
        {!role ? (
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}
          >
            {([
              ["admin", "Admin Portal", "Manage all departments & reports"],
              [
                "teacher",
                "Teacher Portal",
                "Take attendance & manage students",
              ],
            ] as const).map(([r, title, sub]) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                style={{
                  background: T.card,
                  border: `1.5px solid ${T.border}`,
                  borderRadius: 16,
                  padding: "24px 18px",
                  cursor: "pointer",
                  textAlign: "left",
                  fontFamily: F.b,
                  transition: "all .18s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = T.primary
                  e.currentTarget.style.background = T.primaryL
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = T.border
                  e.currentTarget.style.background = T.card
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: T.primaryL,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 12,
                  }}
                >
                  <Sparkle size={14} color={T.primary} />
                </div>
                <div
                  style={{
                    fontFamily: F.h,
                    fontSize: 16,
                    fontWeight: 700,
                    color: T.text,
                    marginBottom: 4,
                  }}
                >
                  {title}
                </div>
                <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.5 }}>
                  {sub}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <Card style={{ padding: 28 }}>
            <button
              onClick={() => {
                setRole(null)
                setErr("")
                setPass("")
                setUser("")
                setSelT(null)
              }}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: T.muted,
                fontSize: 12,
                fontFamily: F.b,
                marginBottom: 16,
              }}
            >
              ← Back
            </button>
            <div
              style={{
                fontFamily: F.h,
                fontSize: 20,
                fontWeight: 700,
                color: T.text,
                marginBottom: 18,
              }}
            >
              {role === "admin" ? "Admin Login" : "Teacher Login"}
            </div>
            {role === "admin" ? (
              <>
                {[
                  { l: "Username", v: user, s: setUser, ph: "admin" },
                  {
                    l: "Password",
                    v: pass,
                    s: setPass,
                    ph: "admin",
                    t: "password",
                  },
                ].map((f) => (
                  <div key={f.l} style={{ marginBottom: 14 }}>
                    <label
                      style={{
                        display: "block",
                        fontFamily: F.b,
                        fontSize: 12,
                        fontWeight: 700,
                        color: T.text,
                        marginBottom: 5,
                      }}
                    >
                      {f.l}
                    </label>
                    <input
                      type={f.t || "text"}
                      value={f.v}
                      onChange={(e) => f.s(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && submit()}
                      placeholder={f.ph}
                      style={{
                        width: "100%",
                        padding: "9px 12px",
                        borderRadius: 9,
                        border: `1.5px solid ${T.border}`,
                        fontFamily: F.b,
                        fontSize: 13,
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                ))}
                <div
                  style={{
                    textAlign: "center",
                    fontSize: 11,
                    color: T.muted,
                    marginBottom: 10,
                    fontFamily: F.b,
                  }}
                >
                  Demo: admin / admin
                </div>
              </>
            ) : (
              <>
                <div style={{ marginBottom: 14 }}>
                  <label
                    style={{
                      display: "block",
                      fontFamily: F.b,
                      fontSize: 12,
                      fontWeight: 700,
                      color: T.text,
                      marginBottom: 8,
                    }}
                  >
                    Select Teacher
                  </label>
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 6 }}
                  >
                    {TEACHERS.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setSelT(t)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "10px 12px",
                          borderRadius: 10,
                          border: `1.5px solid ${
                            selT?.id === t.id ? T.primary : T.border
                          }`,
                          background: selT?.id === t.id ? T.primaryL : T.card,
                          cursor: "pointer",
                          textAlign: "left",
                          transition: "all .12s",
                        }}
                      >
                        <div
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: 8,
                            background: DC[t.dept].light,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 10,
                            fontWeight: 700,
                            color: DC[t.dept].color,
                            fontFamily: F.b,
                            flexShrink: 0,
                          }}
                        >
                          {t.name
                            .split(" ")
                            .map((w) => w[0])
                            .join("")
                            .slice(0, 2)}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              fontFamily: F.b,
                              fontWeight: 600,
                              fontSize: 13,
                              color: T.text,
                            }}
                          >
                            {t.name}
                          </div>
                          <div
                            style={{
                              fontFamily: F.b,
                              fontSize: 10,
                              color: T.muted,
                            }}
                          >
                            {t.role}
                          </div>
                        </div>
                        <span
                          style={{
                            background: DC[t.dept].light,
                            color: DC[t.dept].text,
                            fontSize: 9,
                            fontWeight: 700,
                            padding: "2px 6px",
                            borderRadius: 20,
                            fontFamily: F.b,
                          }}
                        >
                          {t.dept}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label
                    style={{
                      display: "block",
                      fontFamily: F.b,
                      fontSize: 12,
                      fontWeight: 700,
                      color: T.text,
                      marginBottom: 5,
                    }}
                  >
                    Password
                  </label>
                  <input
                    type="password"
                    value={pass}
                    onChange={(e) => setPass(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && submit()}
                    placeholder="Enter password"
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: 9,
                      border: `1.5px solid ${T.border}`,
                      fontFamily: F.b,
                      fontSize: 13,
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </>
            )}
            {err && (
              <div
                style={{
                  background: T.roseL,
                  color: T.rose,
                  padding: "8px 12px",
                  borderRadius: 8,
                  fontSize: 12,
                  fontFamily: F.b,
                  marginBottom: 14,
                }}
              >
                {err}
              </div>
            )}
            <Btn onClick={submit} full>
              Sign In
            </Btn>
          </Card>
        )}
      </div>
    </div>
  )
}

// ── ADMIN SIDEBAR ─────────────────────────────────────────────────────────────
const ANAV: { key: AView; label: string }[] = [
  { key: "dashboard", label: "Dashboard" },
  { key: "attendance", label: "Attendance" },
  { key: "calendar", label: "Calendar" },
  { key: "students", label: "Students" },
  { key: "reports", label: "Reports" },
  { key: "settings", label: "Settings" },
]

function AdminSidebar({
  view,
  onNav,
  alerts,
  onLogout,
}: {
  view: AView
  onNav: (v: AView) => void
  alerts: number
  onLogout: () => void
}) {
  return (
    <aside
      style={{
        width: 200,
        background: T.sidebar,
        borderRight: `1px solid ${T.border}`,
        display: "flex",
        flexDirection: "column",
        padding: "24px 12px",
        position: "fixed",
        top: 0,
        left: 0,
        height: "100vh",
        zIndex: 50,
        overflowY: "auto",
      }}
    >
      <div
        style={{ padding: "0 8px 20px", borderBottom: `1px solid ${T.border}` }}
      >
        <div
          style={{
            fontFamily: F.h,
            fontSize: 20,
            fontWeight: 700,
            color: T.text,
          }}
        >
          AttendOS
        </div>
        <div
          style={{ fontSize: 9, color: T.muted, marginTop: 3, fontFamily: F.m }}
        >
          SSIPMT Raipur · Admin
        </div>
      </div>
      <nav
        style={{
          flex: 1,
          marginTop: 14,
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        {ANAV.map((n) => {
          const active = view === n.key
          return (
            <button
              key={n.key}
              onClick={() => onNav(n.key)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 11px",
                borderRadius: 9,
                border: "none",
                cursor: "pointer",
                fontFamily: F.b,
                fontSize: 13,
                fontWeight: active ? 700 : 500,
                background: active ? T.primaryL : "transparent",
                color: active ? T.primary : T.muted,
                textAlign: "left",
                transition: "all .1s",
              }}
            >
              {n.label}
              {n.key === "dashboard" && alerts > 0 && (
                <span
                  style={{
                    background: T.rose,
                    color: "#fff",
                    fontSize: 9,
                    fontWeight: 700,
                    padding: "1px 5px",
                    borderRadius: 10,
                    fontFamily: F.m,
                  }}
                >
                  {alerts}
                </span>
              )}
              {active && (
                <span
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    background: T.primary,
                  }}
                />
              )}
            </button>
          )
        })}
      </nav>
      <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 12 }}>
        <div
          style={{
            fontFamily: F.b,
            fontSize: 12,
            color: T.text,
            fontWeight: 700,
          }}
        >
          Admin
        </div>
        <div
          style={{
            fontFamily: F.b,
            fontSize: 11,
            color: T.muted,
            marginTop: 1,
          }}
        >
          Super Administrator
        </div>
        <button
          onClick={onLogout}
          style={{
            marginTop: 8,
            width: "100%",
            padding: "6px",
            borderRadius: 8,
            border: `1px solid ${T.border}`,
            background: "transparent",
            color: T.muted,
            cursor: "pointer",
            fontFamily: F.b,
            fontSize: 11,
          }}
        >
          Sign Out
        </button>
      </div>
    </aside>
  )
}

// ── ADMIN DASHBOARD ───────────────────────────────────────────────────────────
function DeptCard({
  dept,
  students,
  lectures,
  minPct,
  onNav,
}: {
  dept: Dept
  students: Person[]
  lectures: Lecture[]
  minPct: number
  onNav: (v: AView) => void
}) {
  const [hov, setHov] = useState(false)
  const conducted = lectures.filter((lecture) => lecture.dept === dept && lecture.status === "Conducted")
  const marks = conducted.flatMap((lecture) =>
    students
      .map((student) => finalAttendanceStatus(student.lectureAtt[lecture.id]))
      .filter((status): status is AttendanceStatus => !!status),
  )
  const pres = marks.filter((status) => status === "Present").length
  const absent = marks.filter((status) => status === "Absent").length
  const unmarked = Math.max(0, conducted.length * students.length - marks.length)
  const pct = marks.length ? Math.round((pres / marks.length) * 100) : null
  const cfg = DC[dept]
  return (
    <div
      className="hcard"
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={() => onNav("attendance")}
      style={{
        background: T.card,
        borderRadius: 12,
        border: `1px solid ${T.border}`,
        padding: 14,
        borderLeft: `4px solid ${cfg.color}`,
        cursor: "pointer",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div
          style={{
            fontFamily: F.h,
            fontSize: 15,
            fontWeight: 700,
            color: cfg.color,
          }}
        >
          {dept}
        </div>
        <span
          style={{
            fontFamily: F.m,
            fontSize: 13,
            fontWeight: 700,
            color: pct === null ? T.muted : pct >= minPct ? T.sage : T.rose,
          }}
        >
          {pct === null ? "Unmarked" : `${pct}%`}
        </span>
      </div>
      <div
        style={{
          fontFamily: F.b,
          fontSize: 10,
          color: T.muted,
          marginBottom: 8,
        }}
      >
        {cfg.full} · {students.length} students
      </div>
      <PBar pct={pct ?? 0} min={minPct} recorded={pct !== null} />
      {hov && (
        <div
          className="fade-in"
          style={{
            marginTop: 8,
            fontSize: 11,
            fontFamily: F.b,
            color: T.muted,
            borderTop: `1px solid ${T.border}`,
            paddingTop: 6,
          }}
        >
          <span style={{ color: T.sage }}>{pres} present</span> ·{" "}
          <span style={{ color: T.rose }}>{absent} absent</span> · <span>{unmarked} unmarked</span>
        </div>
      )}
    </div>
  )
}

function AdminDashboard({
  people,
  settings,
  onNav,
  lectures,
}: {
  people: Person[]
  settings: Settings
  onNav: (v: AView, x?: string) => void
  lectures: Lecture[]
}) {
  const [dept, setDept] = useState<"All" | Dept>("All")
  const students = useMemo(
    () =>
      people.filter(
        (p) => p.category === "Student" && (dept === "All" || p.dept === dept),
      ),
    [people, dept],
  )
  const todayConducted = lectures.filter(
    (lecture) =>
      lecture.date === todayStr() &&
      lecture.status === "Conducted" &&
      (dept === "All" || lecture.dept === dept),
  )
  const todayMarks = todayConducted
    .flatMap((lecture) => students.map((student) => finalAttendanceStatus(student.lectureAtt[lecture.id])))
    .filter((status): status is AttendanceStatus => !!status)
  const present = todayMarks.filter((status) => status === "Present").length
  const absent = todayMarks.filter((status) => status === "Absent").length
  const todayExpected = todayConducted.length * students.length
  const unmarked = Math.max(0, todayExpected - todayMarks.length)
  const rate = todayMarks.length ? Math.round((present / todayMarks.length) * 100) : null
  const defaulters = people.filter(
    (p) => p.category === "Student" && hasRecordedAttendance(p) && overallPct(p) < settings.minPct,
  )
  const today = todayStr()
  const now = nowStr()
  const todayLecs = lectures.filter(
    (l) => l.date === today && (dept === "All" || l.dept === dept),
  )
    .sort((a, b) => a.time.localeCompare(b.time))
    .slice(0, 6)
  const weekData = useMemo(() => {
    const days = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      if (d.getDay() === 0 || d.getDay() === 6) continue
      const ds = localDateKey(d)
      const dayLectures = lectures.filter(
        (lecture) => lecture.date === ds && lecture.status === "Conducted",
      )
      const marks = dayLectures.flatMap((lecture) =>
        students
          .map((student) => finalAttendanceStatus(student.lectureAtt[lecture.id]))
          .filter((status): status is AttendanceStatus => !!status),
      )
      days.push({
        l: d.toLocaleDateString("en", { weekday: "short" }),
        p: marks.length
          ? Math.round((marks.filter((status) => status === "Present").length / marks.length) * 100)
          : null,
      })
    }
    return days
  }, [students, lectures])

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: F.h,
              fontSize: 24,
              fontWeight: 700,
              color: T.text,
              display: "flex",
              alignItems: "center",
              gap: 7,
            }}
          >
            <Sparkle size={11} />
            Dashboard
          </h1>
          <p
            style={{
              color: T.muted,
              fontSize: 13,
              margin: "3px 0 0",
              fontFamily: F.b,
            }}
          >
            SSIPMT Raipur ·{" "}
            {people.filter((p) => p.category === "Student").length} students
            enrolled
          </p>
        </div>
        <select
          value={dept}
          onChange={(e) => setDept(e.target.value as any)}
          style={{
            padding: "7px 12px",
            borderRadius: 9,
            border: `1.5px solid ${T.border}`,
            fontFamily: F.b,
            fontSize: 12,
            background: "#fff",
          }}
        >
          <option value="All">All Departments</option>
          {DEPTS.map((d) => (
            <option key={d} value={d}>
              {d} — {DC[d].full}
            </option>
          ))}
        </select>
      </div>
      {defaulters.length > 0 && (
        <div
          style={{
            background: T.roseL,
            border: `1px solid ${T.rose}40`,
            borderRadius: 10,
            padding: "10px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <span
            style={{
              fontFamily: F.b,
              fontSize: 13,
              color: T.rose,
              fontWeight: 600,
            }}
          >
            <Sparkle size={10} color={T.rose} /> {defaulters.length} students
            below {settings.minPct}% ·{" "}
            {defaulters.filter((p) => overallPct(p) < 60).length} critical
          </span>
          <button
            onClick={() => onNav("students", "alerts")}
            style={{
              fontSize: 11,
              fontFamily: F.b,
              fontWeight: 700,
              color: T.rose,
              background: "none",
              border: `1px solid ${T.rose}`,
              borderRadius: 7,
              padding: "4px 10px",
              cursor: "pointer",
            }}
          >
            View All
          </button>
        </div>
      )}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))",
          gap: 12,
        }}
      >
        {[
          { l: "Students", v: students.length, c: T.primary },
          { l: "Present", v: present, c: T.sage },
          { l: "Absent", v: absent, c: T.rose },
          { l: "Unmarked", v: unmarked, c: T.muted },
          {
            l: "Rate",
            v: rate === null ? "Unmarked" : `${rate}%`,
            c: rate === null ? T.muted : rate >= settings.minPct ? T.sage : T.rose,
          },
        ].map((s) => (
          <div
            key={s.l}
            className="hcard"
            onClick={() => onNav("attendance")}
            style={{
              background: T.card,
              borderRadius: 12,
              border: `1px solid ${T.border}`,
              padding: "14px 16px",
              cursor: "pointer",
            }}
          >
            <div
              style={{
                fontFamily: F.h,
                fontSize: 26,
                fontWeight: 700,
                color: s.c,
                lineHeight: 1,
              }}
            >
              {s.v}
            </div>
            <div
              style={{
                fontFamily: F.b,
                fontSize: 11,
                color: T.muted,
                marginTop: 3,
              }}
            >
              {s.l}
            </div>
          </div>
        ))}
      </div>
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 14 }}
      >
        <Card style={{ padding: 18 }}>
          <div
            style={{
              fontFamily: F.h,
              fontSize: 15,
              fontWeight: 700,
              color: T.text,
              marginBottom: 14,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Sparkle size={9} />
            This Week
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 6,
              height: 90,
            }}
          >
            {weekData.map((w, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 3,
                }}
              >
                <div
                  style={{
                    width: "100%",
                    background: T.primaryL,
                    borderRadius: "4px 4px 0 0",
                    height: 70,
                    display: "flex",
                    alignItems: "flex-end",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      height: `${w.p ?? 0}%`,
                      background: w.p === null ? T.border : w.p >= settings.minPct ? T.sage : T.peach,
                      transition: "height .5s",
                    }}
                  />
                </div>
                <div style={{ fontFamily: F.m, fontSize: 9, color: T.muted }}>
                  {w.l}
                </div>
                <div
                  style={{
                    fontFamily: F.m,
                    fontSize: 9,
                    fontWeight: 700,
                    color: T.text,
                  }}
                >
                  {w.p === null ? "—" : `${w.p}%`}
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card style={{ padding: 18 }}>
          <div
            style={{
              fontFamily: F.h,
              fontSize: 15,
              fontWeight: 700,
              color: T.text,
              marginBottom: 12,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Sparkle size={9} />
            Today's Classes
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {todayLecs.length === 0 && (
              <div style={{ color: T.muted, fontFamily: F.b, fontSize: 12 }}>
                No classes today
              </div>
            )}
            {todayLecs.map((l) => {
              const done = l.time <= now
              return (
                <button
                  key={l.id}
                  onClick={() => onNav("attendance")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "7px 9px",
                    borderRadius: 9,
                    border: `1px solid ${T.border}`,
                    background: T.bg,
                    cursor: "pointer",
                    textAlign: "left",
                    width: "100%",
                  }}
                >
                  <span
                    style={{
                      fontFamily: F.m,
                      fontSize: 9,
                      color: T.muted,
                      minWidth: 32,
                    }}
                  >
                    {l.time}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontFamily: F.b,
                        fontWeight: 600,
                        fontSize: 11,
                        color: T.text,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {l.subject}
                    </div>
                    <div
                      style={{ fontFamily: F.b, fontSize: 9, color: T.muted }}
                    >
                      {l.dept}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      fontFamily: F.b,
                      color: done ? T.sage : T.muted,
                      flexShrink: 0,
                    }}
                  >
                    {done ? "Done" : "Soon"}
                  </span>
                </button>
              )
            })}
          </div>
        </Card>
      </div>
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 14 }}
      >
        <div>
          <div
            style={{
              fontFamily: F.h,
              fontSize: 15,
              fontWeight: 700,
              color: T.text,
              marginBottom: 10,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Sparkle size={9} />
            By Department
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill,minmax(175px,1fr))",
              gap: 10,
            }}
          >
            {DEPTS.map((d) => (
              <DeptCard
                key={d}
                dept={d}
                students={people.filter(
                  (p) => p.category === "Student" && p.dept === d,
                )}
                lectures={lectures}
                minPct={settings.minPct}
                onNav={onNav}
              />
            ))}
          </div>
        </div>
        <Card style={{ padding: 18 }}>
          <div
            style={{
              fontFamily: F.h,
              fontSize: 15,
              fontWeight: 700,
              color: T.text,
              marginBottom: 12,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Sparkle size={9} color={T.rose} />
            Needs Attention
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {defaulters.slice(0, 6).map((p) => (
              <button
                key={p.id}
                onClick={() => onNav("students", p.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  padding: "3px 0",
                }}
              >
                <Av av={p.avatar} dept={p.dept} size={26} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: F.b,
                      fontWeight: 600,
                      fontSize: 12,
                      color: T.text,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {p.name}
                  </div>
                  <div
                    style={{ fontFamily: F.b, fontSize: 10, color: T.muted }}
                  >
                    {p.dept} · {p.year}
                  </div>
                </div>
                <span
                  style={{
                    fontFamily: F.m,
                    fontSize: 12,
                    fontWeight: 700,
                    color: overallPct(p) < 60 ? T.rose : T.peach,
                  }}
                >
                  {overallPct(p)}%
                </span>
              </button>
            ))}
            {defaulters.length > 6 && (
              <button
                onClick={() => onNav("students", "alerts")}
                style={{
                  fontSize: 11,
                  fontFamily: F.b,
                  fontWeight: 700,
                  color: T.primary,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                View all {defaulters.length} →
              </button>
            )}
            {defaulters.length === 0 && (
              <div style={{ color: T.sage, fontFamily: F.b, fontSize: 12 }}>
                All above threshold
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}

// ── ADMIN ATTENDANCE (camera = check-in/out only) ─────────────────────────────
function AdminAttendance({
  people,
  onMark,
  settings,
}: {
  people: Person[]
  onMark: (id: string, s: DS, out?: boolean) => void
  settings: Settings
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [camOn, setCamOn] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [log, setLog] = useState<{
    name: string
    time: string
    dept: Dept
    action: "in" | "out"
  }[]>([])
  const [toast, setToast] = useState<string | null>(null)
  const [mode, setMode] = useState<"in" | "out">("in")
  const [dept, setDept] = useState<"All" | Dept>("All")

  const startCam = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      })
      streamRef.current = s
      if (videoRef.current) {
        videoRef.current.srcObject = s
        videoRef.current.play()
      }
    } catch {}
    setCamOn(true)
  }
  const stopCam = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setCamOn(false)
  }

  const scan = () => {
    if (!camOn || scanning) return
    setScanning(true)
    setTimeout(() => {
      const pool = people.filter(
        (p) =>
          p.category === "Student" &&
          (dept === "All" || p.dept === dept) &&
          (mode === "in" ? !p.checkedIn : p.checkedIn && !p.checkedOut),
      )
      if (!pool.length) {
        setToast(mode === "in" ? "All checked in!" : "All checked out!")
        setTimeout(() => setToast(null), 2500)
        setScanning(false)
        return
      }
      const p = pool[Math.floor(Math.random() * pool.length)]
      const h = new Date().getHours()
      const m = new Date().getMinutes()
      const s: DS =
        mode === "out"
          ? "Present"
          : h > 9 || (h === 9 && m > settings.lateAfter)
            ? "Late"
            : "Present"
      const time = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
      onMark(p.id, s, mode === "out")
      setLog((l) => [{ name: p.name, time, dept: p.dept, action: mode }, ...l])
      setToast(
        `${p.name} — ${
          mode === "in" ? `Check In ${s}` : "Check Out"
        } at ${time}`,
      )
      setTimeout(() => setToast(null), 3000)
      setScanning(false)
    }, 2200)
  }

  const checkedIn = people.filter(
    (p) => p.category === "Student" && p.checkedIn,
  ).length
  const checkedOut = people.filter(
    (p) => p.category === "Student" && p.checkedOut,
  ).length
  const total = people.filter((p) => p.category === "Student").length

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <h1
          style={{
            fontFamily: F.h,
            fontSize: 24,
            fontWeight: 700,
            color: T.text,
            display: "flex",
            alignItems: "center",
            gap: 7,
          }}
        >
          <Sparkle size={11} />
          Attendance
        </h1>
        <p
          style={{
            color: T.muted,
            fontSize: 13,
            margin: "3px 0 0",
            fontFamily: F.b,
          }}
        >
          Camera used for morning check-in / check-out only · Subject attendance
          in Teacher Portal
        </p>
      </div>

      {/* Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3,1fr)",
          gap: 12,
        }}
      >
        {[
          { l: "Checked In", v: checkedIn, t: total, c: T.sage },
          { l: "Checked Out", v: checkedOut, t: checkedIn, c: T.primary },
          { l: "Not Arrived", v: total - checkedIn, t: total, c: T.rose },
        ].map((s) => (
          <Card key={s.l} style={{ padding: "14px 18px" }}>
            <div
              style={{
                fontFamily: F.h,
                fontSize: 28,
                fontWeight: 700,
                color: s.c,
              }}
            >
              {s.v}
            </div>
            <div style={{ fontFamily: F.b, fontSize: 12, color: T.muted }}>
              {s.l}
            </div>
            <div style={{ marginTop: 8 }}>
              <div
                style={{
                  height: 4,
                  background: T.primaryL,
                  borderRadius: 4,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${s.t ? Math.round((s.v / s.t) * 100) : 0}%`,
                    background: s.c,
                    transition: "width .5s",
                  }}
                />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Camera panel */}
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 14 }}
      >
        <Card>
          <div
            style={{
              padding: "12px 16px",
              borderBottom: `1px solid ${T.border}`,
              display: "flex",
              gap: 8,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", gap: 4 }}>
              {(["in", "out"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  style={{
                    padding: "5px 14px",
                    borderRadius: 20,
                    border: "none",
                    cursor: "pointer",
                    fontFamily: F.b,
                    fontWeight: 600,
                    fontSize: 12,
                    background: mode === m ? T.primary : T.primaryL,
                    color: mode === m ? "#fff" : T.primary,
                  }}
                >
                  {m === "in" ? "Check In" : "Check Out"}
                </button>
              ))}
            </div>
            <select
              value={dept}
              onChange={(e) => setDept(e.target.value as any)}
              style={{
                padding: "5px 10px",
                borderRadius: 9,
                border: `1.5px solid ${T.border}`,
                fontFamily: F.b,
                fontSize: 12,
                background: "#fff",
              }}
            >
              <option value="All">All Depts</option>
              {DEPTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
              {camOn ? (
                <Btn v="danger" sm onClick={stopCam}>
                  Stop Camera
                </Btn>
              ) : (
                <Btn sm onClick={startCam}>
                  Start Camera
                </Btn>
              )}
            </div>
          </div>
          <div
            style={{
              position: "relative",
              background: "#100d1a",
              aspectRatio: "16/9",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: camOn ? "block" : "none",
              }}
            />
            {!camOn && (
              <div style={{ textAlign: "center", color: T.muted }}>
                <svg
                  width="36"
                  height="36"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={T.primary}
                  strokeWidth="1.5"
                  style={{ marginBottom: 8 }}
                >
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                <div style={{ fontFamily: F.b, fontSize: 13 }}>Camera off</div>
              </div>
            )}
            {camOn && (
              <>
                {([
                  [0, 0],
                  [0, 1],
                  [1, 0],
                  [1, 1],
                ] as [0 | 1, 0 | 1][]).map(([r, c]) => (
                  <div
                    key={`${r}${c}`}
                    style={{
                      position: "absolute",
                      top: r ? undefined : 12,
                      bottom: r ? 12 : undefined,
                      left: c ? undefined : 12,
                      right: c ? 12 : undefined,
                      width: 32,
                      height: 32,
                      borderTop: r ? undefined : `2px solid ${T.primary}`,
                      borderBottom: r ? `2px solid ${T.primary}` : undefined,
                      borderLeft: c ? undefined : `2px solid ${T.primary}`,
                      borderRight: c ? `2px solid ${T.primary}` : undefined,
                    }}
                  />
                ))}
                {scanning && (
                  <div
                    className="scan-line"
                    style={{
                      position: "absolute",
                      left: 12,
                      right: 12,
                      height: 2,
                      background: `linear-gradient(90deg,transparent,${T.primary},transparent)`,
                      top: "25%",
                    }}
                  />
                )}
              </>
            )}
          </div>
          <div style={{ padding: 12 }}>
            {toast && (
              <div
                className="fade-in"
                style={{
                  background: T.sageL,
                  borderRadius: 9,
                  padding: "9px 14px",
                  fontFamily: F.b,
                  fontSize: 13,
                  color: "#166534",
                  fontWeight: 600,
                  marginBottom: 10,
                }}
              >
                {toast}
              </div>
            )}
            <button
              onClick={scan}
              disabled={!camOn || scanning}
              style={{
                width: "100%",
                padding: "11px",
                borderRadius: 10,
                border: "none",
                background:
                  !camOn || scanning
                    ? T.border
                    : mode === "in"
                      ? T.primary
                      : T.peach,
                color: !camOn || scanning ? T.muted : "#fff",
                fontFamily: F.b,
                fontWeight: 700,
                fontSize: 14,
                cursor: camOn && !scanning ? "pointer" : "not-allowed",
              }}
            >
              {scanning
                ? "Scanning..."
                : `Scan Face — ${
                    mode === "in" ? "Mark Check In" : "Mark Check Out"
                  }`}
            </button>
          </div>
        </Card>

        <Card style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              padding: "12px 14px",
              borderBottom: `1px solid ${T.border}`,
              fontFamily: F.h,
              fontSize: 14,
              fontWeight: 700,
              color: T.text,
            }}
          >
            Live Log
          </div>
          {log.length === 0 ? (
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                padding: 30,
                color: T.muted,
                gap: 6,
              }}
            >
              <Sparkle size={18} color={T.border} />
              <span style={{ fontFamily: F.b, fontSize: 13 }}>
                No activity yet
              </span>
            </div>
          ) : (
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: 10,
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              {log.map((l, i) => (
                <div
                  key={i}
                  className="fade-in"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "7px 9px",
                    borderRadius: 9,
                    background: l.action === "in" ? T.sageL : T.peachL,
                    borderLeft: `3px solid ${
                      l.action === "in" ? T.sage : T.peach
                    }`,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontFamily: F.b,
                        fontWeight: 600,
                        fontSize: 12,
                        color: T.text,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {l.name}
                    </div>
                    <div
                      style={{ fontFamily: F.b, fontSize: 10, color: T.muted }}
                    >
                      {l.time} · {l.dept}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      fontFamily: F.b,
                      color: l.action === "in" ? T.sage : T.peach,
                    }}
                  >
                    {l.action === "in" ? "IN" : "OUT"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Today's roster */}
      <Card style={{ padding: 18 }}>
        <div
          style={{
            fontFamily: F.h,
            fontSize: 15,
            fontWeight: 700,
            color: T.text,
            marginBottom: 12,
          }}
        >
          Today's Roster
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#fdf9ff" }}>
                {[
                  "Name",
                  "Dept",
                  "Year",
                  "Check In",
                  "Check Out",
                  "Status",
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "8px 12px",
                      textAlign: "left",
                      fontSize: 9,
                      fontWeight: 700,
                      color: T.muted,
                      textTransform: "uppercase",
                      letterSpacing: 0.8,
                      fontFamily: F.b,
                      borderBottom: `1px solid ${T.border}`,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {people
                .filter(
                  (p) =>
                    p.category === "Student" &&
                    (dept === "All" || p.dept === dept),
                )
                .slice(0, 30)
                .map((p, i) => (
                  <tr
                    key={p.id}
                    style={{
                      borderTop: i ? `1px solid ${T.border}` : undefined,
                    }}
                  >
                    <td style={{ padding: "8px 12px" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <Av av={p.avatar} dept={p.dept} size={24} />
                        <span
                          style={{
                            fontFamily: F.b,
                            fontWeight: 600,
                            fontSize: 12,
                            color: T.text,
                          }}
                        >
                          {p.name}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: "8px 12px" }}>
                      <span
                        style={{
                          background: DC[p.dept].light,
                          color: DC[p.dept].text,
                          fontSize: 9,
                          fontWeight: 700,
                          padding: "2px 6px",
                          borderRadius: 20,
                          fontFamily: F.b,
                        }}
                      >
                        {p.dept}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "8px 12px",
                        fontFamily: F.b,
                        fontSize: 11,
                        color: T.muted,
                      }}
                    >
                      {p.year}
                    </td>
                    <td
                      style={{
                        padding: "8px 12px",
                        fontFamily: F.m,
                        fontSize: 11,
                        color: p.checkedIn ? T.sage : T.muted,
                      }}
                    >
                      {p.checkedIn || "—"}
                    </td>
                    <td
                      style={{
                        padding: "8px 12px",
                        fontFamily: F.m,
                        fontSize: 11,
                        color: p.checkedOut ? T.primary : T.muted,
                      }}
                    >
                      {p.checkedOut || "—"}
                    </td>
                    <td style={{ padding: "8px 12px" }}>
                      <Bdg s={p.todayStatus} />
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          {people.filter(
            (p) =>
              p.category === "Student" && (dept === "All" || p.dept === dept),
          ).length > 30 && (
            <div
              style={{
                padding: "8px 12px",
                fontFamily: F.b,
                fontSize: 11,
                color: T.muted,
                borderTop: `1px solid ${T.border}`,
              }}
            >
              Showing 30 of{" "}
              {
                people.filter(
                  (p) =>
                    p.category === "Student" &&
                    (dept === "All" || p.dept === dept),
                ).length
              }{" "}
              students
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

// ── ADMIN CALENDAR ────────────────────────────────────────────────────────────
function AdminCalendar({
  people,
  settings,
  lectures,
}: {
  people: Person[]
  settings: Settings
  lectures: Lecture[]
}) {
  const [dept, setDept] = useState<Dept>("CS")
  const [subj, setSubj] = useState(0)
  const [month, setMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
  })
  const [selDate, setSelDate] = useState<string | null>(null)
  const [detailP, setDetailP] = useState<Person | null>(null)
  const [calView, setCalView] = useState<"class" | "student">("class")
  const students = useMemo(
    () => people.filter((p) => p.category === "Student" && p.dept === dept),
    [people, dept],
  )
  const calDays = useMemo(() => {
    const [y, m] = month.split("-").map(Number)
    const first = new Date(y, m - 1, 1)
    const last = new Date(y, m, 0)
    const sd = (first.getDay() + 6) % 7
    const days: (string | null)[] = [...Array(sd).fill(null)]
    for (let d = 1; d <= last.getDate(); d++)
      days.push(`${month}-${String(d).padStart(2, "0")}`)
    return days
  }, [month])
  const getDayData = (date: string) => {
    const records = lectures.filter(
      (lecture) =>
        lecture.dept === dept &&
        lecture.subIdx === subj &&
        lecture.date === date,
    )
    const lecs = lectures.filter(
      (l) =>
        l.status === "Conducted" &&
        l.dept === dept &&
        l.subIdx === subj &&
        l.date === date,
    )
    if (!records.length) return null
    const marks = students.flatMap((person) =>
      lecs
        .map((lecture) => finalAttendanceStatus(person.lectureAtt[lecture.id]))
        .filter((status): status is AttendanceStatus => !!status),
    )
    const pres = marks.filter((status) => status === "Present").length
    const absent = marks.filter((status) => status === "Absent").length
    return {
      pct: marks.length ? Math.round((pres / marks.length) * 100) : null,
      pres,
      abs: absent,
      total: marks.length,
      lecs,
      records,
    }
  }
  const selData = selDate ? getDayData(selDate) : null
  const mo = (n: number) => {
    const [y, m] = month.split("-").map(Number)
    const d = new Date(y, m - 1 + n, 1)
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`)
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <h1
          style={{
            fontFamily: F.h,
            fontSize: 24,
            fontWeight: 700,
            color: T.text,
            display: "flex",
            alignItems: "center",
            gap: 7,
          }}
        >
          <Sparkle size={11} />
          Calendar
        </h1>
        <div style={{ display: "flex", gap: 6 }}>
          {(["class", "student"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setCalView(v)}
              style={{
                padding: "6px 14px",
                borderRadius: 20,
                border: "none",
                cursor: "pointer",
                fontFamily: F.b,
                fontWeight: 600,
                fontSize: 12,
                background: calView === v ? T.primary : T.primaryL,
                color: calView === v ? "#fff" : T.primary,
                textTransform: "capitalize",
              }}
            >
              {v === "class" ? "Class View" : "Heatmap"}
            </button>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <select
          value={dept}
          onChange={(e) => {
            setDept(e.target.value as Dept)
            setSubj(0)
          }}
          style={{
            padding: "7px 10px",
            borderRadius: 9,
            border: `1.5px solid ${T.border}`,
            fontFamily: F.b,
            fontSize: 12,
            background: "#fff",
          }}
        >
          {DEPTS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <select
          value={subj}
          onChange={(e) => setSubj(Number(e.target.value))}
          style={{
            padding: "7px 10px",
            borderRadius: 9,
            border: `1.5px solid ${T.border}`,
            fontFamily: F.b,
            fontSize: 12,
            background: "#fff",
          }}
        >
          {SUBJ[dept].map((s, i) => (
            <option key={i} value={i}>
              {s}
            </option>
          ))}
        </select>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: T.card,
            border: `1px solid ${T.border}`,
            borderRadius: 9,
            padding: "4px 4px 4px 12px",
          }}
        >
          <span style={{ fontFamily: F.b, fontSize: 12, color: T.text }}>
            {new Date(month + "-01").toLocaleString("default", {
              month: "long",
              year: "numeric",
            })}
          </span>
          <button
            onClick={() => mo(-1)}
            style={{
              padding: "4px 8px",
              borderRadius: 7,
              border: "none",
              background: T.primaryL,
              cursor: "pointer",
              color: T.primary,
              fontWeight: 700,
            }}
          >
            ‹
          </button>
          <button
            onClick={() => mo(1)}
            style={{
              padding: "4px 8px",
              borderRadius: 7,
              border: "none",
              background: T.primaryL,
              cursor: "pointer",
              color: T.primary,
              fontWeight: 700,
            }}
          >
            ›
          </button>
        </div>
      </div>
      {calView === "class" ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: selDate && selData ? "1fr 300px" : "1fr",
            gap: 14,
          }}
        >
          <Card style={{ padding: 18 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7,1fr)",
                gap: 3,
                marginBottom: 3,
              }}
            >
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <div
                  key={d}
                  style={{
                    textAlign: "center",
                    fontFamily: F.m,
                    fontSize: 9,
                    color: T.muted,
                    padding: "3px 0",
                  }}
                >
                  {d}
                </div>
              ))}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7,1fr)",
                gap: 3,
              }}
            >
              {calDays.map((date, i) => {
                if (!date) return <div key={i} />
                const data = getDayData(date)
                const isWknd = [6, 0].includes(new Date(date).getDay())
                const isToday = date === todayStr()
                const isSel = date === selDate
                const bg = !data || data.pct === null
                  ? T.border
                  : data.pct >= 75
                    ? T.sage
                    : data.pct >= 60
                      ? T.peach
                      : T.rose
                return (
                  <div
                    key={date}
                    onClick={() =>
                      !isWknd && data && setSelDate(isSel ? null : date)
                    }
                    style={{
                      borderRadius: 8,
                      padding: "5px 3px",
                      background: isSel
                        ? T.primary
                        : isToday
                          ? T.blushL
                          : data
                            ? `${bg}25`
                            : T.bg,
                      border: `1.5px solid ${
                        isSel
                          ? T.primary
                          : isToday
                            ? T.blush
                            : data
                              ? `${bg}60`
                              : T.border
                      }`,
                      cursor: data && !isWknd ? "pointer" : "default",
                      minHeight: 48,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 2,
                      opacity: isWknd ? 0.3 : 1,
                      transition: "all .12s",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: F.m,
                        fontSize: 10,
                        color: isSel ? "#fff" : isToday ? T.primary : T.text,
                        fontWeight: isToday || isSel ? 700 : 400,
                      }}
                    >
                      {Number(date.slice(-2))}
                    </span>
                    {data && (
                      <span
                        style={{
                          fontFamily: F.m,
                          fontSize: 9,
                          fontWeight: 700,
                          color: isSel ? "#fff" : bg,
                        }}
                      >
                        {data.pct === null ? "—" : `${data.pct}%`}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </Card>
          {selDate && selData && (
            <Card style={{ padding: 18 }}>
              <div
                style={{
                  fontFamily: F.h,
                  fontSize: 16,
                  fontWeight: 700,
                  color: T.text,
                  marginBottom: 2,
                }}
              >
                {new Date(selDate).toLocaleDateString("en", {
                  day: "numeric",
                  month: "long",
                })}
              </div>
              <div style={{ marginBottom: 14 }}>
                <div style={{fontFamily:F.b,fontWeight:700,fontSize:12,color:T.text,marginBottom:6}}>Lecture History</div>
                {selData.records.map((lecture: Lecture) => (
                  <div key={lecture.id} style={{padding:'6px 0',borderTop:`1px solid ${T.border}`,fontFamily:F.b,fontSize:10,color:T.muted}}>
                    <div style={{display:'flex',justifyContent:'space-between',gap:8}}>
                      <span>{lecture.time} · {lecture.status}</span>
                      {lecture.conductedBy && <span>{lecture.conductedBy}</span>}
                    </div>
                    {lecture.reason && <div style={{color:T.rose,marginTop:2}}>{lecture.reason}</div>}
                    {(lecture.sessionStartedAt || lecture.savedAt) && <div style={{marginTop:2}}>Started {formatTimestamp(lecture.sessionStartedAt)} · Saved {formatTimestamp(lecture.savedAt)}</div>}
                  </div>
                ))}
              </div>
              <div
                style={{
                  fontFamily: F.b,
                  fontSize: 12,
                  color: T.muted,
                  marginBottom: 14,
                }}
              >
                {SUBJ[dept][subj]}
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                  marginBottom: 14,
                }}
              >
                {[
                  { l: "Present", v: selData.pres, c: T.sage },
                  { l: "Absent", v: selData.abs, c: T.rose },
                  { l: "Total", v: selData.total, c: T.primary },
                  {
                    l: "Rate",
                    v: selData.pct === null ? "Unmarked" : `${selData.pct}%`,
                    c: selData.pct === null ? T.muted : selData.pct >= settings.minPct ? T.sage : T.rose,
                  },
                ].map((s) => (
                  <div
                    key={s.l}
                    style={{
                      background: T.bg,
                      borderRadius: 9,
                      padding: "9px 12px",
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        fontFamily: F.h,
                        fontSize: 18,
                        fontWeight: 700,
                        color: s.c,
                      }}
                    >
                      {s.v}
                    </div>
                    <div
                      style={{ fontFamily: F.b, fontSize: 10, color: T.muted }}
                    >
                      {s.l}
                    </div>
                  </div>
                ))}
              </div>
              <div
                style={{
                  fontFamily: F.b,
                  fontWeight: 700,
                  fontSize: 12,
                  color: T.text,
                  marginBottom: 8,
                }}
              >
                Absent
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 5,
                  maxHeight: 200,
                  overflowY: "auto",
                }}
              >
                {students
                  .filter((p) =>
                    selData.lecs.every((l) => p.lectureAtt[l.id] === "Absent"),
                  )
                  .map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setDetailP(p)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 9,
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        textAlign: "left",
                        padding: "3px 0",
                      }}
                    >
                      <Av av={p.avatar} dept={p.dept} size={24} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontFamily: F.b,
                            fontWeight: 600,
                            fontSize: 12,
                            color: T.text,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {p.name}
                        </div>
                        <div
                          style={{
                            fontFamily: F.m,
                            fontSize: 9,
                            color: T.muted,
                          }}
                        >
                          {hasRecordedAttendance(p) ? `${overallPct(p)}% overall` : "Unmarked"}
                        </div>
                      </div>
                    </button>
                  ))}
              </div>
            </Card>
          )}
        </div>
      ) : (
        <Card style={{ padding: 18, overflowX: "auto" }}>
          <div
            style={{
              fontFamily: F.b,
              fontWeight: 700,
              fontSize: 12,
              color: T.muted,
              marginBottom: 12,
            }}
          >
            Heatmap — {SUBJ[dept][subj]}
          </div>
          <div style={{ minWidth: 600 }}>
            {students.map((p) => {
              const lecs = lectures.filter(
                (l) =>
                  l.status === "Conducted" &&
                  l.dept === dept &&
                  l.subIdx === subj &&
                  l.date >= `${month}-01` &&
                  l.date <= `${month}-31`,
              )
                .sort((a, b) => a.date.localeCompare(b.date))
                .slice(0, 20)
              return (
                <div
                  key={p.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "4px 0",
                    borderBottom: `1px solid ${T.border}`,
                  }}
                >
                  <div
                    style={{
                      width: 130,
                      flexShrink: 0,
                      fontFamily: F.b,
                      fontSize: 11,
                      color: hasRecordedAttendance(p) && overallPct(p) < settings.minPct ? T.rose : T.text,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {p.name}
                  </div>
                  <div style={{ display: "flex", gap: 2 }}>
                    {lecs.map((l) => {
                      const s = p.lectureAtt[l.id]
                      const c = !s
                        ? T.border
                        : s === "Present"
                          ? T.sage
                          : s === "Late"
                            ? T.peach
                            : s === "HalfDay"
                              ? "#0ea5e9"
                              : T.rose
                      return (
                        <div
                          key={l.id}
                          title={`${l.date}: ${s || "Unmarked"}`}
                          style={{
                            width: 14,
                            height: 14,
                            borderRadius: 2,
                            background: c || T.roseL,
                            opacity: 0.85,
                          }}
                        />
                      )
                    })}
                  </div>
                  <span
                    style={{
                      fontFamily: F.m,
                      fontSize: 10,
                      color: !hasRecordedAttendance(p) ? T.muted : overallPct(p) < settings.minPct ? T.rose : T.sage,
                      fontWeight: 700,
                      marginLeft: 6,
                    }}
                  >
                    {hasRecordedAttendance(p) ? `${overallPct(p)}%` : "Unmarked"}
                  </span>
                </div>
              )
            })}
          </div>
        </Card>
      )}
      <Modal
        open={!!detailP}
        onClose={() => setDetailP(null)}
        title="Student Detail"
      >
        {detailP && (
          <>
            <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
              <Av av={detailP.avatar} dept={detailP.dept} size={44} />
              <div>
                <div
                  style={{
                    fontFamily: F.h,
                    fontSize: 17,
                    fontWeight: 700,
                    color: T.text,
                  }}
                >
                  {detailP.name}
                </div>
                <div style={{ fontFamily: F.b, fontSize: 12, color: T.muted }}>
                  {detailP.rollNo} · {DC[detailP.dept].full} · {detailP.year}{" "}
                  Year
                </div>
              </div>
            </div>
            <PBar pct={overallPct(detailP)} min={settings.minPct} recorded={hasRecordedAttendance(detailP)} />
            {(
              <div style={{ marginTop: 14 }}>
                {subjectAttendance(detailP, lectures).map((s) => {
                  return (
                    <div key={s.name} style={{ marginBottom: 8 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 12,
                          fontFamily: F.b,
                          marginBottom: 3,
                        }}
                      >
                        <span>{s.name}</span>
                        <span
                          style={{
                            fontFamily: F.m,
                            color: p >= 75 ? T.sage : T.rose,
                            fontWeight: 700,
                          }}
                        >
                          {s.attended}/{s.total}
                        </span>
                      </div>
                      <PBar pct={s.pct} min={settings.minPct} />
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </Modal>
    </div>
  )
}

// ── ADMIN STUDENTS ────────────────────────────────────────────────────────────
function AdminStudents({
  people,
  onAdd,
  settings,
  lectures,
  initFilter,
}: {
  people: Person[]
  onAdd: (p: Person) => void
  settings: Settings
  lectures: Lecture[]
  initFilter?: string
}) {
  const [dept, setDept] = useState<"All" | Dept>("All")
  const [search, setSearch] = useState("")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [selP, setSelP] = useState<Person | null>(null)
  const [showReg, setShowReg] = useState(false)
  const [step, setStep] = useState(1)
  const [showAlerts, setShowAlerts] = useState(initFilter === "alerts")
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [form, setForm] = useState({
    name: "",
    rollNo: "",
    dept: "CS" as Dept,
    year: "1st",
    section: "A",
    email: "",
    phone: "",
  })
  const setF = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const [year, setYear] = useState<"All" | string>("All")
  const students = useMemo(
    () =>
      people.filter(
        (p) =>
          p.category === "Student" &&
          (dept === "All" || p.dept === dept) &&
          (year === "All" || p.year === year) &&
          p.name.toLowerCase().includes(search.toLowerCase()),
      ),
    [people, dept, year, search],
  )
  const defaulters = people.filter(
    (p) => p.category === "Student" && hasRecordedAttendance(p) && overallPct(p) < settings.minPct,
  )

  const startCam = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true })
      streamRef.current = s
      if (videoRef.current) {
        videoRef.current.srcObject = s
        videoRef.current.play()
      }
    } catch {}
  }
  const stopReg = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }
  const doReg = () => {
    if (!form.name || !form.rollNo) return
    const seed = Date.now()
    const newStudent: Person = {
      ...form,
      id: `X${seed}`,
      category: "Student",
      avatar: `${form.name[0]}${form.name.split(" ")[1]?.[0] || ""}`,
      todayStatus: "Unmarked",
      history: [],
      lectureAtt: {},
      checkedIn: undefined,
      checkedOut: undefined,
      role: undefined,
    }
    onAdd(newStudent)
    studentsApi.create({
      name: form.name,
      rollNo: form.rollNo,
      dept: form.dept,
      year: form.year,
      section: form.section,
      email: form.email,
      phone: form.phone,
      category: "Student"
    }).catch(console.error)
    stopReg()
    setShowReg(false)
    setStep(1)
    setForm({
      name: "",
      rollNo: "",
      dept: "CS",
      year: "1st",
      section: "A",
      email: "",
      phone: "",
    })
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <h1
          style={{
            fontFamily: F.h,
            fontSize: 24,
            fontWeight: 700,
            color: T.text,
            display: "flex",
            alignItems: "center",
            gap: 7,
          }}
        >
          <Sparkle size={11} />
          Students
          <span
            style={{
              fontFamily: F.b,
              fontSize: 13,
              fontWeight: 400,
              color: T.muted,
              marginLeft: 8,
            }}
          >
            {students.length}
          </span>
        </h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setShowAlerts((v) => !v)}
            style={{
              padding: "7px 14px",
              borderRadius: 20,
              border: "none",
              cursor: "pointer",
              fontFamily: F.b,
              fontWeight: 600,
              fontSize: 12,
              background: showAlerts ? T.rose : T.roseL,
              color: showAlerts ? "#fff" : T.rose,
            }}
          >
            {defaulters.length} At Risk
          </button>
          <button
            onClick={() => {
              setShowReg(true)
              setStep(1)
            }}
            style={{
              padding: "7px 14px",
              borderRadius: 20,
              border: "none",
              cursor: "pointer",
              fontFamily: F.b,
              fontWeight: 700,
              fontSize: 12,
              background: T.primary,
              color: "#fff",
            }}
          >
            + Register
          </button>
        </div>
      </div>
      {showAlerts && (
        <Card style={{ padding: 14 }}>
          <div
            style={{
              fontFamily: F.h,
              fontSize: 14,
              fontWeight: 700,
              color: T.rose,
              marginBottom: 10,
            }}
          >
            Below {settings.minPct}%
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 5,
              maxHeight: 200,
              overflowY: "auto",
            }}
          >
            {defaulters.map((p) => (
              <div
                key={p.id}
                className="hcard"
                onClick={() => setSelP(p)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 10px",
                  borderRadius: 9,
                  background: T.roseL,
                  cursor: "pointer",
                }}
              >
                <Av av={p.avatar} dept={p.dept} size={26} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: F.b,
                      fontWeight: 600,
                      fontSize: 12,
                      color: T.text,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {p.name}
                  </div>
                  <div
                    style={{ fontFamily: F.b, fontSize: 10, color: T.muted }}
                  >
                    {DC[p.dept].full} · {p.year}
                  </div>
                </div>
                <span
                  style={{
                    fontFamily: F.m,
                    fontSize: 12,
                    fontWeight: 700,
                    color: T.rose,
                  }}
                >
                  {hasRecordedAttendance(p) ? `${overallPct(p)}%` : "Unmarked"}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search students..."
          style={{
            flex: "1 1 180px",
            padding: "7px 12px",
            borderRadius: 9,
            border: `1.5px solid ${T.border}`,
            fontFamily: F.b,
            fontSize: 13,
            outline: "none",
            background: "#fff",
          }}
        />
        <select
          value={dept}
          onChange={(e) => setDept(e.target.value as any)}
          style={{
            padding: "7px 10px",
            borderRadius: 9,
            border: `1.5px solid ${T.border}`,
            fontFamily: F.b,
            fontSize: 12,
            background: "#fff",
          }}
        >
          <option value="All">All Depts</option>
          {DEPTS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <select
          value={year}
          onChange={(e) => setYear(e.target.value)}
          style={{
            padding: "7px 10px",
            borderRadius: 9,
            border: `1.5px solid ${T.border}`,
            fontFamily: F.b,
            fontSize: 12,
            background: "#fff",
          }}
        >
          <option value="All">All Years</option>
          {["1st", "2nd", "3rd", "4th"].map((y) => (
            <option key={y} value={y}>
              {y} Year
            </option>
          ))}
        </select>
        {(["grid", "list"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setViewMode(v)}
            style={{
              padding: "6px 12px",
              borderRadius: 9,
              border: `1px solid ${T.border}`,
              cursor: "pointer",
              fontFamily: F.b,
              fontSize: 12,
              background: viewMode === v ? T.primary : T.card,
              color: viewMode === v ? "#fff" : T.muted,
              textTransform: "capitalize",
            }}
          >
            {v}
          </button>
        ))}
      </div>
      {viewMode === "grid" ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill,minmax(190px,1fr))",
            gap: 10,
          }}
        >
          {students.map((p) => {
            const pct = overallPct(p)
            return (
              <div
                key={p.id}
                className="hcard"
                onClick={() => setSelP(p)}
                style={{
                  background: T.card,
                  borderRadius: 14,
                  border: `1px solid ${T.border}`,
                  padding: 14,
                  borderTop: `3px solid ${DC[p.dept].color}`,
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", gap: 9, marginBottom: 9 }}>
                  <Av av={p.avatar} dept={p.dept} size={38} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontFamily: F.h,
                        fontWeight: 700,
                        fontSize: 13,
                        color: T.text,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {p.name}
                    </div>
                    <div
                      style={{ fontFamily: F.m, fontSize: 9, color: T.muted }}
                    >
                      {p.rollNo}
                    </div>
                    <div
                      style={{ fontFamily: F.b, fontSize: 10, color: T.muted }}
                    >
                      {p.year} · Sec {p.section}
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 7,
                  }}
                >
                  <span
                    style={{
                      background: DC[p.dept].light,
                      color: DC[p.dept].text,
                      fontSize: 9,
                      fontWeight: 700,
                      padding: "2px 6px",
                      borderRadius: 20,
                      fontFamily: F.b,
                    }}
                  >
                    {p.dept}
                  </span>
                  <Bdg s={p.todayStatus} />
                </div>
                <PBar pct={pct} min={settings.minPct} />
              </div>
            )
          })}
        </div>
      ) : (
        <Card>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#fdf9ff" }}>
                {["Name", "Roll", "Dept", "Year", "Today", "Overall"].map(
                  (h) => (
                    <th
                      key={h}
                      style={{
                        padding: "9px 12px",
                        textAlign: "left",
                        fontSize: 9,
                        fontWeight: 700,
                        color: T.muted,
                        textTransform: "uppercase",
                        letterSpacing: 0.8,
                        fontFamily: F.b,
                        borderBottom: `1px solid ${T.border}`,
                      }}
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {students.map((p, i) => (
                <tr
                  key={p.id}
                  onClick={() => setSelP(p)}
                  style={{
                    borderTop: i ? `1px solid ${T.border}` : undefined,
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = T.primaryL)
                  }
                  onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                >
                  <td style={{ padding: "8px 12px" }}>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <Av av={p.avatar} dept={p.dept} size={24} />
                      <span
                        style={{
                          fontFamily: F.b,
                          fontWeight: 600,
                          fontSize: 12,
                          color: T.text,
                        }}
                      >
                        {p.name}
                      </span>
                    </div>
                  </td>
                  <td
                    style={{
                      padding: "8px 12px",
                      fontFamily: F.m,
                      fontSize: 10,
                      color: T.muted,
                    }}
                  >
                    {p.rollNo}
                  </td>
                  <td style={{ padding: "8px 12px" }}>
                    <span
                      style={{
                        background: DC[p.dept].light,
                        color: DC[p.dept].text,
                        fontSize: 9,
                        fontWeight: 700,
                        padding: "2px 6px",
                        borderRadius: 20,
                        fontFamily: F.b,
                      }}
                    >
                      {p.dept}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: "8px 12px",
                      fontFamily: F.b,
                      fontSize: 11,
                      color: T.muted,
                    }}
                  >
                    {p.year}
                  </td>
                  <td style={{ padding: "8px 12px" }}>
                    <Bdg s={p.todayStatus} />
                  </td>
                  <td style={{ padding: "8px 12px", minWidth: 110 }}>
                    <PBar pct={overallPct(p)} min={settings.minPct} recorded={hasRecordedAttendance(p)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      {/* Drawer */}
      {selP && (
        <div
          style={{
            position: "fixed",
            top: 0,
            right: 0,
            bottom: 0,
            width: 360,
            background: T.card,
            borderLeft: `1px solid ${T.border}`,
            zIndex: 100,
            overflowY: "auto",
            padding: 22,
            boxShadow: "-8px 0 30px rgba(45,31,63,.1)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 18,
            }}
          >
            <div
              style={{
                fontFamily: F.h,
                fontSize: 17,
                fontWeight: 700,
                color: T.text,
              }}
            >
              Student Profile
            </div>
            <button
              onClick={() => setSelP(null)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: T.muted,
                fontSize: 20,
              }}
            >
              ×
            </button>
          </div>
          <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
            <Av av={selP.avatar} dept={selP.dept} size={50} />
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontFamily: F.h,
                  fontSize: 18,
                  fontWeight: 700,
                  color: T.text,
                }}
              >
                {selP.name}
              </div>
              <div style={{ fontFamily: F.b, fontSize: 12, color: T.muted }}>
                {selP.rollNo} · {DC[selP.dept].full}
              </div>
              <div style={{ fontFamily: F.b, fontSize: 11, color: T.muted }}>
                {selP.year} Year · Section {selP.section}
              </div>
            </div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              marginBottom: 14,
            }}
          >
            {(() => {
              const statuses = Object.values(selP.lectureAtt)
                .map((status) => finalAttendanceStatus(status))
                .filter((status): status is AttendanceStatus => !!status)
              const todayStatus = finalAttendanceStatus(selP.todayStatus) || "Unmarked"
              return [
                { l: "Overall", v: `${overallPct(selP)}%`, c: T.primary },
                { l: "Today", v: todayStatus, c: SC[todayStatus].dot },
                { l: "Present", v: statuses.filter((status) => status === "Present").length, c: T.sage },
                { l: "Absent", v: statuses.filter((status) => status === "Absent").length, c: T.rose },
              ]
            })().map((s) => (
              <div
                key={s.l}
                style={{
                  background: T.bg,
                  borderRadius: 9,
                  padding: "9px",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontFamily: F.h,
                    fontSize: 17,
                    fontWeight: 700,
                    color: s.c,
                  }}
                >
                  {s.v}
                </div>
                <div style={{ fontFamily: F.b, fontSize: 10, color: T.muted }}>
                  {s.l}
                </div>
              </div>
            ))}
          </div>
          {hasRecordedAttendance(selP) && overallPct(selP) < settings.minPct && (
            <div
              style={{
                background: T.roseL,
                borderRadius: 9,
                padding: "7px 10px",
                fontSize: 12,
                fontFamily: F.b,
                color: T.rose,
                fontWeight: 600,
                marginBottom: 12,
              }}
            >
              Below {settings.minPct}% minimum
            </div>
          )}
          {(
            <>
              <div
                style={{
                  fontFamily: F.b,
                  fontWeight: 700,
                  fontSize: 12,
                  color: T.text,
                  marginBottom: 8,
                }}
              >
                Subject-wise
              </div>
              {subjectAttendance(selP, lectures).map((s) => {
                return (
                  <div key={s.name} style={{ marginBottom: 7 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 11,
                        fontFamily: F.b,
                        marginBottom: 2,
                      }}
                    >
                      <span>{s.name}</span>
                      <span
                        style={{
                          fontFamily: F.m,
                          color: p >= 75 ? T.sage : T.rose,
                          fontWeight: 700,
                        }}
                      >
                        {s.attended}/{s.total}
                      </span>
                    </div>
                    <PBar pct={s.pct} min={settings.minPct} />
                  </div>
                )
              })}
            </>
          )}
          <div
            style={{
              marginTop: 12,
              fontFamily: F.b,
              fontSize: 11,
              color: T.muted,
            }}
          >
            {selP.email}
          </div>
        </div>
      )}
      {/* Register */}
      <Modal
        open={showReg}
        onClose={() => {
          setShowReg(false)
          stopReg()
          setStep(1)
        }}
        title={`Register Student — Step ${step}/3`}
        wide
      >
        {step === 1 && (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              {[
                { l: "Full Name *", k: "name", ph: "Arjun Sharma" },
                { l: "Roll No *", k: "rollNo", ph: "CS21001" },
                { l: "Email", k: "email", ph: "arjun@ssipmt.ac.in" },
                { l: "Phone", k: "phone", ph: "9876543210" },
              ].map((f) => (
                <div key={f.k}>
                  <label
                    style={{
                      display: "block",
                      fontFamily: F.b,
                      fontSize: 11,
                      fontWeight: 700,
                      color: T.text,
                      marginBottom: 4,
                    }}
                  >
                    {f.l}
                  </label>
                  <input
                    value={(form as any)[f.k]}
                    onChange={(e) => setF(f.k, e.target.value)}
                    placeholder={f.ph}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: 9,
                      border: `1.5px solid ${T.border}`,
                      fontFamily: F.b,
                      fontSize: 12,
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              ))}
              <div>
                <label
                  style={{
                    display: "block",
                    fontFamily: F.b,
                    fontSize: 11,
                    fontWeight: 700,
                    color: T.text,
                    marginBottom: 4,
                  }}
                >
                  Department
                </label>
                <select
                  value={form.dept}
                  onChange={(e) => setF("dept", e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px",
                    borderRadius: 9,
                    border: `1.5px solid ${T.border}`,
                    fontFamily: F.b,
                    fontSize: 12,
                    background: "#fff",
                    outline: "none",
                  }}
                >
                  {DEPTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontFamily: F.b,
                      fontSize: 11,
                      fontWeight: 700,
                      color: T.text,
                      marginBottom: 4,
                    }}
                  >
                    Year
                  </label>
                  <select
                    value={form.year}
                    onChange={(e) => setF("year", e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px",
                      borderRadius: 9,
                      border: `1.5px solid ${T.border}`,
                      fontFamily: F.b,
                      fontSize: 12,
                      background: "#fff",
                      outline: "none",
                    }}
                  >
                    {["1st", "2nd", "3rd", "4th"].map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontFamily: F.b,
                      fontSize: 11,
                      fontWeight: 700,
                      color: T.text,
                      marginBottom: 4,
                    }}
                  >
                    Section
                  </label>
                  <select
                    value={form.section}
                    onChange={(e) => setF("section", e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px",
                      borderRadius: 9,
                      border: `1.5px solid ${T.border}`,
                      fontFamily: F.b,
                      fontSize: 12,
                      background: "#fff",
                      outline: "none",
                    }}
                  >
                    {["A", "B", "C"].map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div
              style={{
                marginTop: 18,
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <Btn
                onClick={() => form.name && form.rollNo && setStep(2)}
                disabled={!form.name || !form.rollNo}
              >
                Next: Face Registration →
              </Btn>
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <div
              style={{
                textAlign: "center",
                marginBottom: 12,
                fontFamily: F.b,
                fontSize: 13,
                color: T.muted,
              }}
            >
              Capture face for recognition
            </div>
            <div
              style={{
                background: "#100d1a",
                aspectRatio: "4/3",
                borderRadius: 12,
                overflow: "hidden",
                marginBottom: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
            <div
              style={{
                display: "flex",
                gap: 8,
                justifyContent: "center",
                marginBottom: 12,
              }}
            >
              <Btn v="ghost" sm onClick={startCam}>
                Open Camera
              </Btn>
              <Btn sm onClick={() => setStep(3)}>
                Capture & Continue →
              </Btn>
            </div>
            <div
              style={{
                textAlign: "center",
                fontSize: 11,
                color: T.muted,
                fontFamily: F.b,
              }}
            >
              Camera opens real webcam for preview.
            </div>
          </>
        )}
        {step === 3 && (
          <>
            <div
              style={{
                background: T.sageL,
                borderRadius: 10,
                padding: "10px 14px",
                marginBottom: 14,
                fontFamily: F.b,
                fontSize: 13,
                color: "#166534",
              }}
            >
              Face registered. Review and confirm.
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
                marginBottom: 16,
              }}
            >
              {[
                { l: "Name", v: form.name },
                { l: "Roll No", v: form.rollNo },
                { l: "Department", v: DC[form.dept].full },
                { l: "Year", v: form.year },
                { l: "Section", v: form.section },
                { l: "Email", v: form.email || "—" },
              ].map((f) => (
                <div
                  key={f.l}
                  style={{
                    background: T.bg,
                    borderRadius: 9,
                    padding: "9px 12px",
                  }}
                >
                  <div
                    style={{ fontFamily: F.b, fontSize: 10, color: T.muted }}
                  >
                    {f.l}
                  </div>
                  <div
                    style={{
                      fontFamily: F.b,
                      fontWeight: 600,
                      fontSize: 12,
                      color: T.text,
                      marginTop: 2,
                    }}
                  >
                    {f.v}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn v="ghost" onClick={() => setStep(1)}>
                Edit
              </Btn>
              <button
                onClick={doReg}
                style={{
                  flex: 1,
                  padding: "11px",
                  borderRadius: 10,
                  border: "none",
                  background: T.primary,
                  color: "#fff",
                  cursor: "pointer",
                  fontFamily: F.b,
                  fontWeight: 700,
                  fontSize: 14,
                }}
              >
                Register Student
              </button>
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}

// ── ADMIN REPORTS ─────────────────────────────────────────────────────────────
function AdminReports({
  people,
  settings,
  lectures,
}: {
  people: Person[]
  settings: Settings
  lectures: Lecture[]
}) {
  const [dept, setDept] = useState<"All" | Dept>("All")
  const [threshold, setThreshold] = useState(settings.minPct)
  const filtered = useMemo(
    () =>
      people.filter(
        (p) => p.category === "Student" && (dept === "All" || p.dept === dept),
      ),
    [people, dept],
  )
  const recordedStudents = filtered.filter(hasRecordedAttendance)
  const avg = recordedStudents.length
    ? Math.round(recordedStudents.reduce((total, person) => total + overallPct(person), 0) / recordedStudents.length)
    : 0
  const deptBars = DEPTS.map((d) => {
    const s = people.filter((p) => p.category === "Student" && p.dept === d && hasRecordedAttendance(p))
    return {
      d,
      pct: s.length
        ? Math.round(s.reduce((a, p) => a + overallPct(p), 0) / s.length)
        : 0,
      n: s.length,
    }
  }).sort((a, b) => b.pct - a.pct)
  const below = recordedStudents.filter((p) => overallPct(p) < threshold)
  const exportRows = lectureExportRows(filtered, lectures.filter((lecture) => dept === "All" || lecture.dept === dept))

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <h1
          style={{
            fontFamily: F.h,
            fontSize: 24,
            fontWeight: 700,
            color: T.text,
            display: "flex",
            alignItems: "center",
            gap: 7,
          }}
        >
          <Sparkle size={11} />
          Reports
        </h1>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn
            v="ghost"
            sm
            onClick={() =>
              downloadCSV("report.csv", exportRows)
            }
          >
            Export CSV
          </Btn>
          <Btn
            v="ghost"
            sm
            onClick={() =>
              exportToExcel("attendance-report", "Attendance", exportRows)
            }
          >
            Export Excel
          </Btn>
          <Btn sm onClick={() => window.print()}>
            Print
          </Btn>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <select
          value={dept}
          onChange={(e) => setDept(e.target.value as any)}
          style={{
            padding: "7px 10px",
            borderRadius: 9,
            border: `1.5px solid ${T.border}`,
            fontFamily: F.b,
            fontSize: 12,
            background: "#fff",
          }}
        >
          <option value="All">All Departments</option>
          {DEPTS.map((d) => (
            <option key={d} value={d}>
              {d} — {DC[d].full}
            </option>
          ))}
        </select>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))",
          gap: 12,
        }}
      >
        {[
          { l: "Avg Attendance", v: `${avg}%`, c: T.primary },
          {
            l: "Present Today",
            v: filtered.filter((p) => p.todayStatus === "Present").length,
            c: T.sage,
          },
          {
            l: "Absent Today",
            v: filtered.filter((p) => p.todayStatus === "Absent").length,
            c: T.rose,
          },
          {
            l: "Unmarked Today",
            v: filtered.filter((p) => p.todayStatus === "Unmarked").length,
            c: T.muted,
          },
          { l: "Defaulters", v: below.length, c: T.rose },
        ].map((s) => (
          <Card key={s.l} style={{ padding: "14px 16px" }}>
            <div
              style={{
                fontFamily: F.h,
                fontSize: 24,
                fontWeight: 700,
                color: s.c,
              }}
            >
              {s.v}
            </div>
            <div
              style={{
                fontFamily: F.b,
                fontSize: 11,
                color: T.muted,
                marginTop: 3,
              }}
            >
              {s.l}
            </div>
          </Card>
        ))}
      </div>
      <Card style={{ padding: 20 }}>
        <div
          style={{
            fontFamily: F.h,
            fontSize: 15,
            fontWeight: 700,
            color: T.text,
            marginBottom: 14,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Sparkle size={9} />
          Department Comparison
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {deptBars.map((r) => (
            <div
              key={r.d}
              style={{ display: "flex", alignItems: "center", gap: 12 }}
            >
              <span
                style={{
                  fontFamily: F.b,
                  fontWeight: 700,
                  fontSize: 12,
                  color: DC[r.d].color,
                  minWidth: 40,
                }}
              >
                {r.d}
              </span>
              <div
                style={{
                  flex: 1,
                  height: 24,
                  background: T.primaryL,
                  borderRadius: 6,
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${r.pct}%`,
                    background: r.pct >= settings.minPct ? T.sage : T.peach,
                    borderRadius: 6,
                    transition: "width .5s",
                  }}
                />
                <span
                  style={{
                    position: "absolute",
                    left: 8,
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontSize: 10,
                    fontFamily: F.b,
                    color: T.text,
                    fontWeight: 600,
                  }}
                >
                  {DC[r.d].full} ({r.n})
                </span>
              </div>
              <span
                style={{
                  fontFamily: F.m,
                  fontSize: 12,
                  fontWeight: 700,
                  color: r.pct >= settings.minPct ? T.sage : T.rose,
                  minWidth: 34,
                }}
              >
                {r.pct}%
              </span>
            </div>
          ))}
        </div>
      </Card>
      <Card style={{ padding: 20 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 14,
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <div
            style={{
              fontFamily: F.h,
              fontSize: 15,
              fontWeight: 700,
              color: T.text,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Sparkle size={9} color={T.rose} />
            Below Threshold
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontFamily: F.b, fontSize: 12, color: T.muted }}>
              Below
            </span>
            <input
              type="number"
              min={0}
              max={100}
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              style={{
                width: 52,
                padding: "4px 8px",
                borderRadius: 7,
                border: `1.5px solid ${T.border}`,
                fontFamily: F.m,
                fontSize: 13,
                outline: "none",
                textAlign: "center",
              }}
            />
            <span style={{ fontFamily: F.b, fontSize: 12, color: T.muted }}>
              %
            </span>
          </div>
        </div>
        {below.length === 0 ? (
          <div style={{ color: T.sage, fontFamily: F.b, fontSize: 13 }}>
            No students below {threshold}%
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Name", "Dept", "Year", "Overall %", "Today"].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "7px 10px",
                        textAlign: "left",
                        fontSize: 9,
                        fontWeight: 700,
                        color: T.muted,
                        textTransform: "uppercase",
                        letterSpacing: 0.8,
                        fontFamily: F.b,
                        borderBottom: `1px solid ${T.border}`,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {below.map((p, i) => (
                  <tr
                    key={p.id}
                    style={{
                      borderTop: i ? `1px solid ${T.border}` : undefined,
                    }}
                  >
                    <td style={{ padding: "7px 10px" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <Av av={p.avatar} dept={p.dept} size={24} />
                        <span
                          style={{
                            fontFamily: F.b,
                            fontWeight: 600,
                            fontSize: 12,
                            color: T.text,
                          }}
                        >
                          {p.name}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: "7px 10px" }}>
                      <span
                        style={{
                          background: DC[p.dept].light,
                          color: DC[p.dept].text,
                          fontSize: 9,
                          fontWeight: 700,
                          padding: "1px 6px",
                          borderRadius: 20,
                          fontFamily: F.b,
                        }}
                      >
                        {p.dept}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "7px 10px",
                        fontFamily: F.b,
                        fontSize: 11,
                        color: T.muted,
                      }}
                    >
                      {p.year}
                    </td>
                    <td style={{ padding: "7px 10px", minWidth: 110 }}>
                      <PBar pct={overallPct(p)} min={threshold} recorded={hasRecordedAttendance(p)} />
                    </td>
                    <td style={{ padding: "7px 10px" }}>
                      <Bdg s={p.todayStatus} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

// ── ADMIN SETTINGS ────────────────────────────────────────────────────────────
function AdminSettings({
  settings,
  onSave,
}: {
  settings: Settings
  onSave: (s: Settings) => void
}) {
  const [local, setLocal] = useState(settings)
  const set = (k: keyof Settings, v: any) => setLocal((s) => ({ ...s, [k]: v }))
  const Toggle = ({ on, onToggle }: { on: boolean; onToggle: () => void }) => (
    <button
      onClick={onToggle}
      style={{
        width: 40,
        height: 20,
        borderRadius: 10,
        background: on ? T.primary : "#e0d8f0",
        border: "none",
        cursor: "pointer",
        position: "relative",
        transition: "background .2s",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: on ? 22 : 2,
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: "#fff",
          transition: "left .2s",
          boxShadow: "0 1px 3px rgba(0,0,0,.15)",
        }}
      />
    </button>
  )
  return (
    <div
      style={{
        maxWidth: 540,
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <h1
        style={{
          fontFamily: F.h,
          fontSize: 24,
          fontWeight: 700,
          color: T.text,
          display: "flex",
          alignItems: "center",
          gap: 7,
        }}
      >
        <Sparkle size={11} />
        Settings
      </h1>
      {[
        {
          t: "Attendance",
          items: [
            { l: "Minimum Attendance %", k: "minPct", ty: "number" },
            {
              l: "Late after N minutes past 9 AM",
              k: "lateAfter",
              ty: "number",
            },
            { l: "Prevent Duplicate Marking", k: "dupePrev", ty: "toggle" },
            { l: "College Name", k: "college", ty: "text" },
          ],
        },
        {
          t: "Camera",
          items: [{ l: "Auto Start Camera", k: "autoStart", ty: "toggle" }],
        },
        {
          t: "Notifications",
          items: [{ l: "Low Attendance Alerts", k: "lowAlert", ty: "toggle" }],
        },
      ].map((g) => (
        <Card key={g.t} style={{ overflow: "hidden" }}>
          <div
            style={{
              padding: "9px 18px",
              borderBottom: `1px solid ${T.border}`,
              fontFamily: F.m,
              fontSize: 9,
              color: T.muted,
              letterSpacing: 1,
              textTransform: "uppercase",
            }}
          >
            {g.t}
          </div>
          {g.items.map((item) => (
            <div
              key={item.k}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "11px 18px",
                borderBottom: `1px solid ${T.border}`,
              }}
            >
              <div style={{ fontFamily: F.b, fontSize: 13, color: T.text }}>
                {item.l}
              </div>
              {item.ty === "toggle" ? (
                <Toggle
                  on={(local as any)[item.k]}
                  onToggle={() =>
                    set(item.k as keyof Settings, !(local as any)[item.k])
                  }
                />
              ) : (
                <input
                  type={item.ty}
                  value={(local as any)[item.k]}
                  onChange={(e) =>
                    set(
                      item.k as keyof Settings,
                      item.ty === "number"
                        ? Number(e.target.value)
                        : e.target.value,
                    )
                  }
                  style={{
                    width: item.ty === "text" ? 170 : 60,
                    padding: "5px 8px",
                    borderRadius: 8,
                    border: `1.5px solid ${T.border}`,
                    fontFamily: item.ty === "number" ? F.m : F.b,
                    fontSize: 13,
                    outline: "none",
                    textAlign: item.ty === "number" ? "center" : "left",
                  }}
                />
              )}
            </div>
          ))}
        </Card>
      ))}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <Btn v="ghost" onClick={() => setLocal(settings)}>
          Reset
        </Btn>
        <Btn onClick={() => onSave(local)}>Save Changes</Btn>
      </div>
    </div>
  )
}

// ── ADMIN PORTAL ───────────────────────────────────────────────────────────────
function AdminPortal({
  people,
  setPeople,
  lectures,
  onLogout,
}: {
  people: Person[]
  setPeople: React.Dispatch<React.SetStateAction<Person[]>>
  lectures: Lecture[]
  onLogout: () => void
}) {
  const adminViewKey = viewStorageKey("admin")
  const [view, setView] = useState<AView>(() =>
    readSavedView(adminViewKey, APP_ROUTES, "dashboard"),
  )
  useEffect(() => saveStoredValue(adminViewKey, view), [adminViewKey, view])
  const [navExtra, setNavExtra] = useState<string | undefined>()
  const [settings, setSettings] = useState<Settings>({
    minPct: 75,
    college: "SSIPMT Raipur",
    lateAfter: 5,
    dupePrev: true,
    autoStart: false,
    lowAlert: true,
  })
  const markAtt = useCallback(
    (id: string, status: DS, out?: boolean) => {
      const now = new Date()
      const recordedAt = now.toISOString()
      const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
      const today = todayStr()
      setPeople((ps) =>
        ps.map((p) => {
          if (p.id !== id) return p
          const hist = p.history.filter((e) => e.date !== today || !!e.lectureId)
          return out
            ? { ...p, checkedOut: time, checkedOutAt: recordedAt }
            : {
                ...p,
                todayStatus: status,
                checkedIn: time,
                checkedInAt: recordedAt,
                history: [...hist, { date: today, status, recordedAt }],
              }
        }),
      )
      attendanceApi.markGate({ student_id: id, status, is_out: !!out }).catch(console.error)
    },
    [setPeople],
  )
  const addPerson = useCallback(
    (p: Person) => setPeople((ps) => [p, ...ps]),
    [setPeople],
  )
  const alerts = people.filter(
    (p) => p.category === "Student" && hasRecordedAttendance(p) && overallPct(p) < settings.minPct,
  ).length
  const navigate = (v: AView, x?: string) => {
    setView(v)
    setNavExtra(x)
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: T.bg }}>
      <DotGrid />
      <AdminSidebar
        view={view}
        onNav={(v) => navigate(v)}
        alerts={alerts}
        onLogout={onLogout}
      />
      <main
        style={{
          marginLeft: 200,
          flex: 1,
          padding: "24px 26px 40px",
          position: "relative",
          zIndex: 1,
          minWidth: 0,
        }}
      >
        {view === "dashboard" && (
          <AdminDashboard
            people={people}
            settings={settings}
            onNav={navigate}
            lectures={lectures}
          />
        )}
        {view === "attendance" && (
          <AdminAttendance
            people={people}
            onMark={markAtt}
            settings={settings}
          />
        )}
        {view === "calendar" && (
          <AdminCalendar
            people={people}
            settings={settings}
            lectures={lectures}
          />
        )}
        {view === "students" && (
          <AdminStudents
            people={people}
            onAdd={addPerson}
            settings={settings}
            lectures={lectures}
            initFilter={navExtra}
          />
        )}
        {view === "reports" && (
          <AdminReports people={people} settings={settings} lectures={lectures} />
        )}
        {view === "settings" && (
          <AdminSettings settings={settings} onSave={setSettings} />
        )}
      </main>
    </div>
  )
}


function TeacherAttendView({teacher, myStudents, lectures, setLectures, setPeople, todayLecs, events, setEvents, nowStr}: any) {
  const [selLecId, setSelLecId] = useState<string|null>(null);
  const [listenLec, setListenLec] = useState<string|null>(null);
  const [voiceState, setVoiceState] = useState<'listening'|'stopped'|'error'>('stopped');
  const [voiceLog, setVoiceLog] = useState<any[]>([]);
  const continuousStopRef = useRef<(() => void) | null>(null);
  const spokenCommandsRef = useRef(new Set<string>());
  const voiceStatusesRef = useRef(new Map<string, AttendanceStatus | undefined>());
  const [voiceReasonLec, setVoiceReasonLec] = useState<string|null>(null);
  const [reasonLecId, setReasonLecId] = useState<string|null>(null);
  const [reasonStatus, setReasonStatus] = useState<"College Event" | "Holiday">("College Event");
  const [exceptionReason, setExceptionReason] = useState("");
  const [toast, setToast] = useState<string|null>(null);
  
  const selectedLec = lectures.find((l:any) => l.id === selLecId);

  const updateLec = (id: string, updates: any) => {
    setLectures((ls:any) => ls.map((l:any) => l.id === id ? { ...l, ...updates, modifiedBy: teacher.name, modifiedAt: new Date().toISOString() } : l));
  };

  const markStudent = (studentId: string, status: string, lecId: string) => {
    const lecture = lectures.find((item: Lecture) => item.id === lecId);
    if (!lecture || !["In Progress", "Conducted"].includes(lecture.status)) return;
    if (status !== "Present" && status !== "Absent") return;
    voiceStatusesRef.current.set(studentId, status);
    setPeople((ps: Person[]) => ps.map((p) =>
      p.id === studentId ? recordLectureAttendance(p, lecture, status as AttendanceStatus) : p,
    ));
    attendanceApi.markLectureSingle(lecId, studentId, status as AttendanceStatus, teacher.name).catch(console.error);
  };

  const markAll = (status: string, lecId: string) => {
    const lecture = lectures.find((item: Lecture) => item.id === lecId);
    if (!lecture || !["In Progress", "Conducted"].includes(lecture.status)) return;
    if (status !== "Present" && status !== "Absent") return;
    if (listenLec === lecId) {
      myStudents
        .filter((person: Person) => person.dept === teacher.dept)
        .forEach((person: Person) => voiceStatusesRef.current.set(person.id, status as AttendanceStatus))
    }
    setPeople((ps: Person[]) => ps.map((p) =>
      p.dept === teacher.dept && p.category === "Student"
        ? recordLectureAttendance(p, lecture, status as AttendanceStatus)
        : p,
    ));
    attendanceApi.markLectureAll(lecId, status as AttendanceStatus, teacher.name).catch(console.error);
    setToast(`Marked all ${status}`);
    setTimeout(() => setToast(null), 2000);
  };

  const openLectureAttendance = (lec: Lecture) => {
    const startedAt = new Date().toISOString();
    setLectures((current: Lecture[]) => current.map((lecture) =>
      lecture.id === lec.id
        ? {
            ...lecture,
            status: "In Progress",
            sessionStartedAt: startedAt,
            attendanceSessions: [
              ...(lecture.attendanceSessions || []),
              { startedAt },
            ],
          }
        : lecture,
    ));
    lecturesApi.startSession(lec.id).catch(console.error);
    setSelLecId(lec.id);
  };

  const saveAttendance = (lec: any) => {
    if (["Cancelled", "College Event", "Holiday"].includes(lec.status)) return;
    const savedAt = new Date().toISOString();
    updateLec(lec.id, {
      status: 'Conducted',
      conductedBy: teacher.name,
      savedAt,
      attendanceSessions: (lec.attendanceSessions || []).map((session: any, index: number, sessions: any[]) =>
        index === sessions.length - 1 && !session.savedAt ? { ...session, savedAt } : session,
      ),
    });
    lecturesApi.saveAttendance(lec.id, teacher.name).catch(console.error);
    setEvents((current: CalendarEvent[]) =>
      current.filter((event) => !sameLectureSlot(event as Lecture, lec)),
    );
    setSelLecId(null);
    setToast(`Saved ${lec.subject} attendance.`);
    setTimeout(() => setToast(null), 3000);
  };

  const setException = (lec: any, status: string, reason: string = '') => {
    updateLec(lec.id, { status, reason, conductedBy: teacher.name });
    lecturesApi.setException(lec.id, status, reason, teacher.name).catch(console.error);
    setPeople((ps: Person[]) => ps.map((person) => {
      const lectureAtt = { ...person.lectureAtt };
      delete lectureAtt[lec.id];
      return {
        ...person,
        lectureAtt,
      };
    }));
    if (status === "College Event" || status === "Holiday") {
      const eventId = `${lec.id}:${status}`;
      const event: CalendarEvent = {
        id: eventId,
        date: lec.date,
        time: lec.time,
        dept: lec.dept,
        subject: lec.subject,
        status,
        reason,
        participationRequired: false,
      };
      setEvents((current: CalendarEvent[]) => [
        ...current.filter((item) => !sameLectureSlot(item as Lecture, lec)),
        event,
      ]);
    } else {
      setEvents((current: CalendarEvent[]) =>
        current.filter((event) => !sameLectureSlot(event as Lecture, lec)),
      );
    }
  };
  
  const startVoiceReason = (lec: any) => {
    setVoiceReasonLec(lec.id);
    VoiceService.listen((text) => {
      setException(lec, 'Cancelled', text);
      setVoiceReasonLec(null);
      setToast('Voice added: ' + text);
      setTimeout(()=>setToast(null),3000);
    }, () => setVoiceReasonLec(null));
  };
  
  const startVoiceAtt = (lec: any) => {
    if (!["In Progress", "Conducted"].includes(lec.status)) return;
    if (continuousStopRef.current && listenLec === lec.id) return;
    continuousStopRef.current?.();
    spokenCommandsRef.current.clear();
    voiceStatusesRef.current = new Map(
      myStudents.map((student: Person) => [
        student.id,
        finalAttendanceStatus(student.lectureAtt[lec.id]),
      ]),
    );
    setVoiceLog([]);
    setListenLec(lec.id);
    updateLec(lec.id, { attendanceMethod: 'Voice' });
    continuousStopRef.current = VoiceService.listenContinuously((text) => {
      const command = text.trim().match(/^(.*?)\s+(present|absent)[.!?]*$/i);
      if (!command) {
        setVoiceLog((items) => [{ text, result: 'Not marked: say a student name or roll number followed by Present or Absent.', time: new Date().toISOString() }, ...items]);
        return;
      }
      const identifier = command[1].trim();
      const status = command[2].toLowerCase() as AttendanceStatus;
      const compact = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');
      const normalizedIdentifier = compact(identifier);
      const matches = myStudents.filter((student: Person) =>
        compact(student.rollNo) === normalizedIdentifier ||
        compact(student.name) === normalizedIdentifier,
      );
      const duplicateKey = text.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (spokenCommandsRef.current.has(duplicateKey)) return;
      spokenCommandsRef.current.add(duplicateKey);
      if (matches.length !== 1) {
        const result = matches.length ? 'Not marked: name or roll number is ambiguous.' : 'Not marked: student not recognized.';
        setVoiceLog((items) => [{ text, result, time: new Date().toISOString() }, ...items]);
        return;
      }
      const student = matches[0];
      const current = voiceStatusesRef.current.get(student.id);
      if (current === status) return;
      markStudent(student.id, status, lec.id);
      setVoiceLog((items) => [{ text, name: student.name, rollNo: student.rollNo, status, result: `Marked ${status}`, time: new Date().toISOString() }, ...items]);
      setToast(`${student.name} — ${status}`);
      setTimeout(()=>setToast(null),3000);
    }, (state) => {
      setVoiceState(state);
      if (state !== 'listening') {
        continuousStopRef.current = null;
        setListenLec(null);
      }
    });
  };

  const stopVoiceAtt = () => {
    continuousStopRef.current?.();
    continuousStopRef.current = null;
    setListenLec(null);
    setVoiceState('stopped');
    const counts = myStudents.reduce((result: any, student: Person) => {
      const status = finalAttendanceStatus(student.lectureAtt[selLecId || '']);
      if (status === 'Present') result.present++;
      else if (status === 'Absent') result.absent++;
      else result.unmarked++;
      return result;
    }, { present: 0, absent: 0, unmarked: 0 });
    window.alert(`Present: ${counts.present}\nAbsent: ${counts.absent}\nUnmarked: ${counts.unmarked}`);
    if (counts.unmarked && window.confirm(`Mark the remaining ${counts.unmarked} unmarked students Absent?`)) {
      markAll('Absent', selLecId);
    }
  };

  useEffect(() => () => continuousStopRef.current?.(), []);

  if (selLecId && selectedLec) {
    return (
      <div style={{display:'flex',flexDirection:'column',gap:14}}>
         <button onClick={() => setSelLecId(null)} style={{background:'none',border:'none',cursor:'pointer',color:T.muted,fontSize:12,fontFamily:F.b,textAlign:'left'}}>← Back to Classes</button>
         <div><h1 style={{fontFamily:F.h,fontSize:24,fontWeight:700,color:T.text}}>{selectedLec.subject}</h1><p style={{color:T.muted,fontSize:13,margin:'4px 0 0',fontFamily:F.b}}>{selectedLec.time} · {selectedLec.status}</p>{selectedLec.sessionStartedAt && <p style={{color:T.muted,fontSize:10,margin:'3px 0 0',fontFamily:F.b}}>Started {formatTimestamp(selectedLec.sessionStartedAt)}{selectedLec.savedAt ? ` · Saved ${formatTimestamp(selectedLec.savedAt)}` : ''}</p>}</div>
         <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            <Btn sm v="sage" onClick={() => markAll('Present', selectedLec.id)}>Mark All Present</Btn>
            <Btn sm v="danger" onClick={() => markAll('Absent', selectedLec.id)}>Mark All Absent</Btn>
            {listenLec !== selectedLec.id ? (
              <Btn sm v="ghost" onClick={() => startVoiceAtt(selectedLec)}>🎤 Start Voice Attendance</Btn>
            ) : (
              <Btn sm v="danger" onClick={stopVoiceAtt}>Stop Voice Attendance</Btn>
            )}
            <span style={{fontFamily:F.b,fontSize:11,fontWeight:700,color:voiceState==='listening'?T.sage:voiceState==='error'?T.rose:T.muted,alignSelf:'center'}}>{voiceState==='listening'?'Listening':voiceState==='error'?'Recognition unavailable':'Stopped'}</span>
            <Btn sm onClick={() => saveAttendance(selectedLec)}>Save Attendance</Btn>
         </div>
         {toast&&<div className="fade-in" style={{background:T.sageL,borderRadius:9,padding:'8px 14px',fontFamily:F.b,fontSize:13,color:'#166534',fontWeight:600}}>{toast}</div>}
          {voiceLog.length > 0 && <Card style={{padding:'8px 12px',maxHeight:140,overflowY:'auto'}}><div style={{fontFamily:F.h,fontSize:13,fontWeight:700,color:T.text,marginBottom:5}}>Voice Log</div>{voiceLog.slice(0,8).map((item:any,index:number)=><div key={`${item.time}-${index}`} style={{fontFamily:F.b,fontSize:11,color:item.status==='Absent'?T.rose:item.status==='Present'?T.sage:T.muted,padding:'3px 0',borderTop:index?`1px solid ${T.border}`:undefined}}>{formatTimestamp(item.time)} · {item.name ? `${item.name} (${item.rollNo}) · ${item.result}` : `${item.text} · ${item.result}`}</div>)}</Card>}
         
         <div style={{maxHeight: 500, overflowY: 'auto', display:'flex', flexDirection:'column', gap:6}}>
             {myStudents.map((p:any) => {
                const marked = finalAttendanceStatus(p.lectureAtt[selectedLec.id]);
                const statusColor = marked ? SC[marked].dot : T.muted;
                return (
                  <div key={p.id} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 10px',borderRadius:9,background:marked?SC[marked].bg:T.bg,border:`1px solid ${marked?`${statusColor}30`:T.border}`}}>
                    <Av av={p.avatar} dept={p.dept} size={26}/>
                    <div style={{flex:1,minWidth:0}}><div style={{fontFamily:F.b,fontWeight:600,fontSize:12,color:T.text}}>{p.name}</div><div style={{fontFamily:F.b,fontSize:10,color:T.muted}}>{p.rollNo}{p.history.find((entry: HistEntry) => entry.lectureId === selectedLec.id)?.recordedAt ? ` · ${formatTimestamp(p.history.find((entry: HistEntry) => entry.lectureId === selectedLec.id)?.recordedAt)}` : ''}</div></div>
                    <span style={{fontFamily:F.b,fontSize:11,fontWeight:700,color:marked?SC[marked].text:T.muted,minWidth:58,textAlign:'center'}}>{marked || 'Unmarked'}</span>
                    <div style={{display:'flex',gap:4}}>
                      {(['Present','Absent'] as AttendanceStatus[]).map(s=><button key={s} onClick={()=>markStudent(p.id, s, selectedLec.id)} title={`Mark ${s}`} style={{padding:'4px 8px',borderRadius:7,border:`1px solid ${SC[s].dot}40`,background:marked===s?SC[s].bg:T.bg,color:marked===s?SC[s].text:T.muted,cursor:'pointer',fontFamily:F.b,fontWeight:700,fontSize:9}}>{s==='Present'?'P':'A'}</button>)}
                    </div>
                  </div>
                )
             })}
         </div>
      </div>
    )
  }

  return (
    <div style={{display:'flex',flexDirection:'column',gap:14}}>
      <div><h1 style={{fontFamily:F.h,fontSize:24,fontWeight:700,color:T.text,display:'flex',alignItems:'center',gap:7}}><Sparkle size={11}/>Today's Classes</h1><p style={{color:T.muted,fontSize:13,margin:'4px 0 0',fontFamily:F.b}}>Automated schedule · Click to take attendance</p></div>
      {toast&&<div className="fade-in" style={{background:T.sageL,borderRadius:9,padding:'8px 14px',fontFamily:F.b,fontSize:13,color:'#166534',fontWeight:600}}>{toast}</div>}
      <div style={{display:'flex',flexDirection:'column',gap:12}}>
         {todayLecs.map((l:any) => {
            const isDone = ['Conducted', 'Cancelled', 'Rescheduled', 'College Event', 'Holiday'].includes(l.status);
            return (
              <Card key={l.id} style={{padding: 16, borderLeft: `4px solid ${isDone ? T.sage : T.primary}`}}>
                 <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                    <div>
                       <div style={{fontFamily:F.h,fontSize:18,fontWeight:700,color:T.text}}>{l.subject}</div>
                       <div style={{fontFamily:F.b,fontSize:12,color:T.muted}}>{l.time} · {l.status} {l.reason ? ` - ${l.reason}`:''}</div>
                       {l.conductedBy && <div style={{fontFamily:F.b,fontSize:10,color:T.muted,marginTop:4}}>Updated by {l.conductedBy} at {formatTimestamp(l.savedAt || l.modifiedAt)}</div>}
                    </div>
                    {!isDone ? (
                      <div style={{display:'flex', gap:6, flexDirection:'column'}}>
                         <Btn sm onClick={() => openLectureAttendance(l)}>Take Attendance</Btn>
                         <Btn sm v="danger" onClick={() => startVoiceReason(l)}>{voiceReasonLec === l.id ? 'Listening...' : '🎤 Cancel/Reschedule'}</Btn>
                         <button onClick={() => { setReasonLecId(l.id); setReasonStatus('College Event'); setExceptionReason(l.reason || ''); }} style={{fontSize:10,fontFamily:F.b,color:T.muted,background:'none',border:'none',cursor:'pointer',textAlign:'right',textDecoration:'underline'}}>Mark College Event</button>
                         <button onClick={() => { setReasonLecId(l.id); setReasonStatus('Holiday'); setExceptionReason(l.reason || ''); }} style={{fontSize:10,fontFamily:F.b,color:T.muted,background:'none',border:'none',cursor:'pointer',textAlign:'right',textDecoration:'underline'}}>Mark Holiday</button>
                         {reasonLecId === l.id && <div style={{display:'flex',gap:5,alignItems:'center',flexWrap:'wrap'}}><input aria-label={`${reasonStatus} reason (optional)`} value={exceptionReason} onChange={(event) => setExceptionReason(event.target.value)} placeholder="Reason (optional)" style={{padding:'5px 7px',borderRadius:6,border:`1px solid ${T.border}`,fontFamily:F.b,fontSize:10,minWidth:120}}/><Btn sm onClick={() => { setException(l, reasonStatus, exceptionReason.trim()); setReasonLecId(null); }}>Save</Btn><Btn sm v="ghost" onClick={() => setReasonLecId(null)}>Cancel</Btn></div>}
                      </div>
                    ) : (
                      <div style={{display:'flex', gap:6, flexDirection:'column'}}>
                         <div style={{fontFamily:F.b,fontSize:13,color:T.sage,fontWeight:700,textAlign:'right'}}>✓ Recorded</div>
                         {l.status === 'Conducted' && <Btn sm v="ghost" onClick={() => openLectureAttendance(l)}>Edit Attendance</Btn>}
                      </div>
                    )}
                 </div>
              </Card>
            )
         })}
      </div>
    </div>
  )
}



// ── TEACHER PORTAL ─────────────────────────────────────────────────────────────
function StudentHistoryChart({ student }: { student: Person }) {
  const last30 = student.history
    .filter((entry) => entry.lectureId && student.lectureAtt[entry.lectureId])
    .slice(-30)
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap: 2,
        height: 40,
        marginTop: 6,
      }}
    >
      {last30.map((e, i) => {
        const status = finalAttendanceStatus(e.status)
        const c = status === "Present" ? T.sage : status === "Absent" ? T.rose : T.border
        return (
          <div
            key={i}
            title={`${e.date}: ${status || "Unmarked"}`}
            style={{
              flex: 1,
              height: status === "Present" ? 38 : status === "Absent" ? 12 : 6,
              background: c,
              borderRadius: 2,
              opacity: 0.85,
            }}
          />
        )
      })}
    </div>
  )
}

function TeacherPortal({
  teacher,
  people,
  setPeople,
  lectures,
  setLectures,
  events,
  setEvents,
  onLogout,
}: {
  teacher: Teacher
  people: Person[]
  setPeople: React.Dispatch<React.SetStateAction<Person[]>>
  lectures: Lecture[]
  setLectures: React.Dispatch<React.SetStateAction<Lecture[]>>
  events: CalendarEvent[]
  setEvents: React.Dispatch<React.SetStateAction<CalendarEvent[]>>
  onLogout: () => void
}) {
  const teacherViewKey = viewStorageKey("teacher", teacher.id)
  const [view, setView] = useState<TView>(() =>
    readSavedView(teacherViewKey, TEACHER_ROUTES, "overview"),
  )
  useEffect(
    () => saveStoredValue(teacherViewKey, view),
    [teacherViewKey, view],
  )
  const [settings] = useState<Settings>({
    minPct: 75,
    college: "SSIPMT Raipur",
    lateAfter: 5,
    dupePrev: true,
    autoStart: false,
    lowAlert: true,
  })
  const [selSubj, setSelSubj] = useState(0)
  const [selStudent, setSelStudent] = useState<Person | null>(null)
  const [search, setSearch] = useState("")
  const [rosterDept, setRosterDept] = useState<"my" | "all">("my")
  const [attLog, setAttLog] = useState<{
    id: string
    name: string
    time: string
    recordedAt?: string
    status: DS
  }[]>([])
  const [toast, setToast] = useState<string | null>(null)
  const [sessionOn, setSessionOn] = useState(false)
  const [sortBy, setSortBy] = useState<"name" | "pct" | "status">("name")
  const [filterPct, setFilterPct] = useState<"all" | "low" | "critical">("all")
  const [remarkText, setRemarkText] = useState("")
  const [isListeningRemark, setIsListeningRemark] = useState(false)

  const myStudents = useMemo(
    () =>
      people.filter((p) => p.category === "Student" && p.dept === teacher.dept),
    [people, teacher.dept],
  )
  const today = todayStr()
  const now = nowStr()
  const todayLecs = lectures.filter(
    (l) => l.dept === teacher.dept && l.date === today,
  ).sort((a, b) => a.time.localeCompare(b.time))
  const sessionLecture = todayLecs.find((lecture) => lecture.subIdx === selSubj)
  const currentLec = todayLecs.find((l) => l.time <= now)
  const atRisk = myStudents.filter((p) => hasRecordedAttendance(p) && overallPct(p) < settings.minPct)

  const rosterStudents = useMemo(() => {
    let s =
      rosterDept === "my"
        ? myStudents
        : people.filter((p) => p.category === "Student")
    if (search)
      s = s.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.rollNo.toLowerCase().includes(search.toLowerCase()),
      )
    if (filterPct === "low")
      s = s.filter((p) => hasRecordedAttendance(p) && overallPct(p) < settings.minPct)
    if (filterPct === "critical") s = s.filter((p) => hasRecordedAttendance(p) && overallPct(p) < 60)
    if (sortBy === "name")
      s = [...s].sort((a, b) => a.name.localeCompare(b.name))
    if (sortBy === "pct")
      s = [...s].sort((a, b) => overallPct(a) - overallPct(b))
    if (sortBy === "status")
      s = [...s].sort((a, b) => a.todayStatus.localeCompare(b.todayStatus))
    return s
  }, [
    myStudents,
    people,
    search,
    rosterDept,
    filterPct,
    sortBy,
    settings.minPct,
  ])

  const markAtt = useCallback(
    (id: string, status: AttendanceStatus) => {
      const recordedAt = new Date().toISOString()
      setPeople((ps) =>
        ps.map((p) => {
          if (p.id !== id) return p
          const updated = sessionLecture
            ? recordLectureAttendance(p, sessionLecture, status, recordedAt)
            : p
          const localTime = new Intl.DateTimeFormat(undefined, {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }).format(new Date(recordedAt))
          return {
            ...updated,
            todayStatus: status,
            checkedIn: status !== "Absent" ? localTime : undefined,
          }
        }),
      )
      const p = myStudents.find((s) => s.id === id)
      if (p) {
        setAttLog((l) => [
          { id, name: p.name, time: formatTimestamp(recordedAt), status, recordedAt },
          ...l.filter((entry) => entry.id !== id),
        ])
        setToast(`${p.name} — ${status}`)
        setTimeout(() => setToast(null), 2000)
      }
    },
    [setPeople, myStudents, sessionLecture],
  )

  const startManualSession = () => {
    if (!sessionLecture || ["Cancelled", "College Event", "Holiday", "Rescheduled"].includes(sessionLecture.status)) {
      window.alert("No valid timetable lecture is available for this subject today.")
      return
    }
    const startedAt = new Date().toISOString()
    setLectures((current) => current.map((lecture) =>
      lecture.id === sessionLecture.id
        ? {
            ...lecture,
            status: "In Progress",
            sessionStartedAt: startedAt,
            attendanceSessions: [
              ...(lecture.attendanceSessions || []),
              { startedAt },
            ],
          }
        : lecture,
    ))
    setAttLog(myStudents.flatMap((student) => {
      const status = finalAttendanceStatus(student.lectureAtt[sessionLecture.id])
      if (!status) return []
      const record = student.history.find((entry) => entry.lectureId === sessionLecture.id)
      return [{
        id: student.id,
        name: student.name,
        time: formatTimestamp(record?.recordedAt),
        recordedAt: record?.recordedAt,
        status,
      }]
    }))
    setSessionOn(true)
  }

  const TVIEWS = [
    { k: "overview" as TView, l: "Overview" },
    { k: "attend" as TView, l: "Take Attendance" },
    { k: "classes" as TView, l: "Today's Classes" },
    { k: "roster" as TView, l: "Students" },
    { k: "analytics" as TView, l: "Analytics" },
  ]

  const deptRecorded = myStudents.filter(hasRecordedAttendance)
  const deptAvg = deptRecorded.length
    ? Math.round(deptRecorded.reduce((a, p) => a + overallPct(p), 0) / deptRecorded.length)
    : null
  const presentToday = myStudents.filter(
    (p) => finalAttendanceStatus(p.todayStatus) === "Present",
  ).length
  const currentClassMarks = currentLec
    ? myStudents
        .map((student) => finalAttendanceStatus(student.lectureAtt[currentLec.id]))
        .filter((status): status is AttendanceStatus => !!status)
    : []
  const currentClassPresent = currentClassMarks.filter((status) => status === "Present").length
  const currentClassAbsent = currentClassMarks.filter((status) => status === "Absent").length

  // subject stats
  const subjStats = teacher.subjects.map((s, i) => {
    const lecs = lectures.filter(
      (l) =>
        l.dept === teacher.dept &&
        l.subIdx === i &&
        l.date <= today &&
        l.status === "Conducted",
    )
    const scores = myStudents
      .map((student) => lectureScore(student, lecs))
      .filter((score): score is number => score !== null)
    const avg = scores.length
      ? Math.round(scores.reduce((total, score) => total + score, 0) / scores.length)
      : null
    return { name: s, avg, lecs: lecs.length }
  })
  const analyticsStudents = myStudents.filter(hasRecordedAttendance)
  const teacherExportRows = lectureExportRows(
    myStudents,
    lectures.filter((lecture) => lecture.dept === teacher.dept),
  )

  return (
    <div style={{ minHeight: "100vh", background: T.bg }}>
      <DotGrid />
      {/* Top bar */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: 54,
          background: T.card,
          borderBottom: `1px solid ${T.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
          zIndex: 50,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              fontFamily: F.h,
              fontSize: 17,
              fontWeight: 700,
              color: T.text,
            }}
          >
            AttendOS
          </div>
          <span style={{ fontFamily: F.b, fontSize: 11, color: T.muted }}>
            Teacher Portal · {DC[teacher.dept].full}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {TVIEWS.map((v) => (
            <button
              key={v.k}
              onClick={() => setView(v.k)}
              style={{
                padding: "5px 12px",
                borderRadius: 20,
                border: "none",
                cursor: "pointer",
                fontFamily: F.b,
                fontWeight: 600,
                fontSize: 12,
                background: view === v.k ? T.primary : T.primaryL,
                color: view === v.k ? "#fff" : T.primary,
              }}
            >
              {v.l}
            </button>
          ))}
          <div
            style={{
              width: 1,
              height: 18,
              background: T.border,
              marginLeft: 4,
            }}
          />
          <span
            style={{
              fontFamily: F.b,
              fontSize: 12,
              color: T.text,
              fontWeight: 600,
            }}
          >
            {teacher.name.split(" ")[0]}
          </span>
          <button
            onClick={onLogout}
            style={{
              fontSize: 11,
              fontFamily: F.b,
              color: T.muted,
              background: "none",
              border: `1px solid ${T.border}`,
              borderRadius: 7,
              padding: "4px 9px",
              cursor: "pointer",
            }}
          >
            Sign Out
          </button>
        </div>
      </div>

      <main
        style={{
          paddingTop: 74,
          paddingBottom: 40,
          padding: "74px 22px 40px",
          position: "relative",
          zIndex: 1,
          maxWidth: 1100,
          margin: "0 auto",
        }}
      >
        {/* ─── OVERVIEW ─── */}
        {view === "overview" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div
              style={{
                background: `linear-gradient(120deg,${T.primaryL},${T.blushL})`,
                borderRadius: 16,
                border: `1px solid ${T.border}`,
                padding: "18px 22px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: F.h,
                    fontSize: 21,
                    fontWeight: 700,
                    color: T.text,
                  }}
                >
                  Good morning, {teacher.name.split(" ").slice(-1)[0]}{" "}
                  <Sparkle color={T.blush} />
                </div>
                <div
                  style={{
                    fontFamily: F.b,
                    fontSize: 12,
                    color: T.muted,
                    marginTop: 2,
                  }}
                >
                  {teacher.role} · SSIPMT Raipur
                </div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                {[
                  { l: "My Students", v: myStudents.length, c: T.primary },
                  { l: "Present", v: presentToday, c: T.sage },
                  { l: "At Risk", v: atRisk.length, c: T.rose },
                  { l: "Dept Avg", v: deptAvg === null ? "Unmarked" : `${deptAvg}%`, c: T.peach },
                ].map((s) => (
                  <div
                    key={s.l}
                    style={{
                      textAlign: "center",
                      background: "rgba(255,255,255,.6)",
                      borderRadius: 10,
                      padding: "9px 14px",
                    }}
                  >
                    <div
                      style={{
                        fontFamily: F.h,
                        fontSize: 20,
                        fontWeight: 700,
                        color: s.c,
                      }}
                    >
                      {s.v}
                    </div>
                    <div
                      style={{ fontFamily: F.b, fontSize: 10, color: T.muted }}
                    >
                      {s.l}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 300px",
                gap: 14,
              }}
            >
              <Card style={{ padding: 18 }}>
                <div
                  style={{
                    fontFamily: F.m,
                    fontSize: 9,
                    color: T.muted,
                    letterSpacing: 1,
                    marginBottom: 10,
                  }}
                >
                  CURRENT / NEXT CLASS
                </div>
                {currentLec ? (
                  <>
                    <div
                      style={{
                        fontFamily: F.h,
                        fontSize: 18,
                        fontWeight: 700,
                        color: T.text,
                      }}
                    >
                      {currentLec.subject}
                    </div>
                    <div
                      style={{
                        fontFamily: F.b,
                        fontSize: 12,
                        color: T.muted,
                        marginTop: 2,
                      }}
                    >
                      {DC[teacher.dept].full} · {currentLec.time}
                    </div>
                    <div
                      style={{
                        fontFamily: F.b,
                        fontSize: 13,
                        color: T.text,
                        marginTop: 10,
                        fontWeight: 600,
                      }}
                    >
                      {currentClassPresent} present · {currentClassAbsent} absent · {myStudents.length - currentClassMarks.length} unmarked
                    </div>
                    <div style={{ marginTop: 7 }}>
                      <PBar
                        pct={currentClassMarks.length ? Math.round((currentClassPresent / currentClassMarks.length) * 100) : 0}
                        recorded={currentClassMarks.length > 0}
                      />
                    </div>
                    <div style={{ marginTop: 12 }}>
                      <Btn sm onClick={() => setView("classes")}>
                        Take Attendance →
                      </Btn>
                    </div>
                  </>
                ) : (
                  <div
                    style={{ color: T.muted, fontFamily: F.b, fontSize: 13 }}
                  >
                    No more classes today
                  </div>
                )}
              </Card>

              <Card style={{ padding: 18 }}>
                <div
                  style={{
                    fontFamily: F.m,
                    fontSize: 9,
                    color: T.muted,
                    letterSpacing: 1,
                    marginBottom: 10,
                  }}
                >
                  SUBJECT ATTENDANCE
                </div>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 7 }}
                >
                  {subjStats.map((s) => (
                    <div key={s.name} style={{}}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 11,
                          fontFamily: F.b,
                          marginBottom: 2,
                        }}
                      >
                        <span
                          style={{
                            color: T.text,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            flex: 1,
                            minWidth: 0,
                            marginRight: 6,
                          }}
                        >
                          {s.name}
                        </span>
                        <span
                          style={{
                            fontFamily: F.m,
                            fontSize: 10,
                            fontWeight: 700,
                            color: s.avg === null ? T.muted : s.avg >= 75 ? T.sage : T.rose,
                            flexShrink: 0,
                          }}
                        >
                          {s.avg === null ? "Unmarked" : `${s.avg}%`}
                        </span>
                      </div>
                      <PBar pct={s.avg ?? 0} recorded={s.avg !== null} />
                    </div>
                  ))}
                </div>
              </Card>

              <Card style={{ padding: 18 }}>
                <div
                  style={{
                    fontFamily: F.m,
                    fontSize: 9,
                    color: T.muted,
                    letterSpacing: 1,
                    marginBottom: 10,
                  }}
                >
                  TODAY'S SCHEDULE
                </div>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 7 }}
                >
                  {todayLecs.length === 0 && (
                    <div
                      style={{ color: T.muted, fontFamily: F.b, fontSize: 12 }}
                    >
                      No classes today
                    </div>
                  )}
                  {todayLecs.map((l) => {
                    const done = l.time <= now
                    return (
                      <div
                        key={l.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "7px 9px",
                          borderRadius: 9,
                          background: T.bg,
                          borderLeft: `3px solid ${done ? T.sage : T.primary}`,
                        }}
                      >
                        <span
                          style={{
                            fontFamily: F.m,
                            fontSize: 9,
                            color: T.muted,
                            minWidth: 32,
                          }}
                        >
                          {l.time}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontFamily: F.b,
                              fontWeight: 600,
                              fontSize: 11,
                              color: T.text,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {l.subject}
                          </div>
                        </div>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            fontFamily: F.b,
                            color: done ? T.sage : T.muted,
                          }}
                        >
                          {done ? "Done" : "Soon"}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </Card>
            </div>

            {atRisk.length > 0 && (
              <Card style={{ padding: 18 }}>
                <div
                  style={{
                    fontFamily: F.h,
                    fontSize: 15,
                    fontWeight: 700,
                    color: T.rose,
                    marginBottom: 12,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Sparkle size={9} color={T.rose} />
                  Students at Risk ({atRisk.length}) — below {settings.minPct}%
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))",
                    gap: 8,
                  }}
                >
                  {atRisk.map((p) => (
                    <div
                      key={p.id}
                      className="hcard"
                      onClick={() => {
                        setSelStudent(p)
                        setView("roster")
                      }}
                      style={{
                        background: T.roseL,
                        borderRadius: 10,
                        padding: "10px 12px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <Av av={p.avatar} dept={p.dept} size={28} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontFamily: F.b,
                            fontWeight: 600,
                            fontSize: 12,
                            color: T.text,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {p.name}
                        </div>
                        <div
                          style={{
                            fontFamily: F.b,
                            fontSize: 10,
                            color: T.muted,
                          }}
                        >
                          {p.year} · Sec {p.section}
                        </div>
                      </div>
                      <span
                        style={{
                          fontFamily: F.m,
                          fontSize: 13,
                          fontWeight: 700,
                          color: T.rose,
                        }}
                      >
                        {hasRecordedAttendance(p) ? `${overallPct(p)}%` : "Unmarked"}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}

        {view === "classes" && (
          <TeacherAttendView
            teacher={teacher}
            myStudents={myStudents}
            lectures={lectures}
            setLectures={setLectures}
            setPeople={setPeople}
            todayLecs={todayLecs}
            events={events}
            setEvents={setEvents}
            nowStr={nowStr}
          />
        )}

        {/* ─── TAKE ATTENDANCE (manual only) ─── */}
        {view === "attend" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <h1
                style={{
                  fontFamily: F.h,
                  fontSize: 24,
                  fontWeight: 700,
                  color: T.text,
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                }}
              >
                <Sparkle size={11} />
                Take Attendance
              </h1>
              <p
                style={{
                  color: T.muted,
                  fontSize: 13,
                  margin: "4px 0 0",
                  fontFamily: F.b,
                }}
              >
                Manual subject-wise marking · {DC[teacher.dept].full}
              </p>
            </div>

            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              {teacher.subjects.map((s, i) => (
                <button
                  key={i}
                  disabled={sessionOn}
                  onClick={() => {
                    if (sessionOn) return
                    setSelSubj(i)
                    setAttLog([])
                  }}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 20,
                    border: "none",
                    cursor: "pointer",
                    fontFamily: F.b,
                    fontWeight: 600,
                    fontSize: 12,
                    background: selSubj === i ? T.primary : T.primaryL,
                    color: selSubj === i ? "#fff" : T.primary,
                  }}
                >
                  {s}
                </button>
              ))}
              {!sessionOn ? (
                <Btn sm v="sage" onClick={startManualSession}>
                  Start Session
                </Btn>
              ) : (
                <Btn
                  sm
                  v="danger"
                  onClick={() => {
                    const present = attLog.filter((entry) => entry.status === "Present").length
                    const absent = attLog.filter((entry) => entry.status === "Absent").length
                    const unmarked = myStudents.length - present - absent
                    const markRemaining = unmarked > 0 && window.confirm(
                      `Present: ${present}\nAbsent: ${absent}\nUnmarked: ${unmarked}\n\nMark the remaining unmarked students Absent?`,
                    )
                    if (markRemaining) {
                      myStudents
                        .filter((student) => !attLog.some((entry) => entry.id === student.id))
                        .forEach((student) => markAtt(student.id, "Absent"))
                    }
                    const savedAt = new Date().toISOString()
                    if (sessionLecture) {
                      setLectures((current) => current.map((lecture) =>
                        lecture.id === sessionLecture.id
                          ? {
                              ...lecture,
                              status: "Conducted",
                              conductedBy: teacher.name,
                              savedAt,
                              attendanceSessions: (lecture.attendanceSessions || []).map((session, index, sessions) =>
                                index === sessions.length - 1 && !session.savedAt
                                  ? { ...session, savedAt }
                                  : session,
                              ),
                            }
                          : lecture,
                      ))
                    }
                    setSessionOn(false)
                    alert(
                      `Session Summary\n\n${teacher.subjects[selSubj]}\n\nPresent: ${present}\nAbsent: ${absent + (markRemaining ? unmarked : 0)}\nUnmarked: ${markRemaining ? 0 : unmarked}`,
                    )
                  }}
                >
                  End Session
                </Btn>
              )}
            </div>

            {sessionOn && (
              <div
                style={{
                  background: T.primaryL,
                  borderRadius: 10,
                  border: `1px solid ${T.border}`,
                  padding: "10px 16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div
                    style={{
                      fontFamily: F.h,
                      fontSize: 15,
                      fontWeight: 700,
                      color: T.text,
                    }}
                  >
                    {teacher.subjects[selSubj]}
                  </div>
                  <div
                    style={{ fontFamily: F.b, fontSize: 11, color: T.muted }}
                  >
                    {DC[teacher.dept].full} · Started {formatTimestamp(sessionLecture?.sessionStartedAt)}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div
                    style={{
                      fontFamily: F.h,
                      fontSize: 18,
                      fontWeight: 700,
                      color: T.primary,
                    }}
                  >
                    {attLog.filter((entry) => entry.status === "Present").length} / {attLog.filter((entry) => entry.status === "Absent").length} / {myStudents.length - attLog.length}
                  </div>
                  <div
                    style={{ fontFamily: F.b, fontSize: 10, color: T.muted }}
                  >
                    present / absent / unmarked
                  </div>
                </div>
              </div>
            )}
            {sessionOn && (
              <div
                style={{
                  height: 5,
                  background: T.primaryL,
                  borderRadius: 5,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${
                      myStudents.length
                        ? Math.round((attLog.length / myStudents.length) * 100)
                        : 0
                    }%`,
                    background: T.primary,
                    transition: "width .4s",
                  }}
                />
              </div>
            )}

            {toast && (
              <div
                className="fade-in"
                style={{
                  background: T.sageL,
                  borderRadius: 9,
                  padding: "8px 14px",
                  fontFamily: F.b,
                  fontSize: 13,
                  color: "#166534",
                  fontWeight: 600,
                }}
              >
                {toast}
              </div>
            )}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 280px",
                gap: 14,
              }}
            >
              <Card style={{ padding: 14 }}>
                {!sessionOn && (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "30px 20px",
                      color: T.muted,
                      fontFamily: F.b,
                      fontSize: 13,
                    }}
                  >
                    Start a session to mark attendance
                  </div>
                )}
                {sessionOn && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 5,
                      maxHeight: 480,
                      overflowY: "auto",
                    }}
                  >
                    {myStudents.map((p) => {
                      const marked = attLog.find((l) => l.id === p.id)
                      return (
                        <div
                          key={p.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: "9px 10px",
                            borderRadius: 9,
                            background: marked ? SC[marked.status].bg : T.bg,
                            border: `1px solid ${
                              marked ? SC[marked.status].dot + "30" : T.border
                            }`,
                          }}
                        >
                          <Av av={p.avatar} dept={p.dept} size={26} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                fontFamily: F.b,
                                fontWeight: 600,
                                fontSize: 12,
                                color: T.text,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {p.name}
                            </div>
                            <div
                              style={{
                                fontFamily: F.b,
                                fontSize: 10,
                                color: T.muted,
                              }}
                            >
                              {p.rollNo}
                              {` · ${marked ? marked.status : "Unmarked"}${marked ? ` at ${marked.time}` : ""}`}
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 4 }}>
                              {(["Present", "Absent"] as AttendanceStatus[]).map((s) => (
                                <button
                                  key={s}
                                  onClick={() => markAtt(p.id, s)}
                                  title={`Mark ${s}`}
                                  style={{
                                    padding: "4px 8px",
                                    borderRadius: 7,
                                    border: `1px solid ${SC[s].dot}40`,
                                    background: marked?.status === s ? SC[s].bg : T.bg,
                                    color: marked?.status === s ? SC[s].text : T.muted,
                                    cursor: "pointer",
                                    fontFamily: F.b,
                                    fontWeight: 700,
                                    fontSize: 9,
                                  }}
                                >
                                  {s === "Present" ? "P" : "A"}
                                </button>
                              ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </Card>
              <Card style={{ display: "flex", flexDirection: "column" }}>
                <div
                  style={{
                    padding: "11px 14px",
                    borderBottom: `1px solid ${T.border}`,
                    fontFamily: F.h,
                    fontSize: 14,
                    fontWeight: 700,
                    color: T.text,
                  }}
                >
                  Live Log
                </div>
                {attLog.length === 0 ? (
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: T.muted,
                      fontFamily: F.b,
                      fontSize: 13,
                      flexDirection: "column",
                      gap: 6,
                      padding: 20,
                    }}
                  >
                    <Sparkle size={16} color={T.border} />
                    {sessionOn
                      ? "Mark students on the left"
                      : "Start session first"}
                  </div>
                ) : (
                  <div
                    style={{
                      flex: 1,
                      overflowY: "auto",
                      padding: 8,
                      display: "flex",
                      flexDirection: "column",
                      gap: 5,
                    }}
                  >
                    {attLog.map((l, i) => (
                      <div
                        key={i}
                        className="fade-in"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "6px 9px",
                          borderRadius: 9,
                          background: SC[l.status].bg,
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontFamily: F.b,
                              fontWeight: 600,
                              fontSize: 12,
                              color: T.text,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {l.name}
                          </div>
                          <div
                            style={{
                              fontFamily: F.b,
                              fontSize: 10,
                              color: T.muted,
                            }}
                          >
                            {l.time}
                          </div>
                        </div>
                        <Bdg s={l.status} />
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
        )}

        {/* ─── STUDENTS ROSTER ─── */}
        {view === "roster" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <h1
              style={{
                fontFamily: F.h,
                fontSize: 24,
                fontWeight: 700,
                color: T.text,
                display: "flex",
                alignItems: "center",
                gap: 7,
              }}
            >
              <Sparkle size={11} />
              Student Roster
            </h1>
            {/* Filters */}
            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or roll no..."
                style={{
                  flex: "1 1 200px",
                  padding: "7px 12px",
                  borderRadius: 9,
                  border: `1.5px solid ${T.border}`,
                  fontFamily: F.b,
                  fontSize: 13,
                  outline: "none",
                  background: "#fff",
                }}
              />
              {(["my", "all"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setRosterDept(v)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 20,
                    border: "none",
                    cursor: "pointer",
                    fontFamily: F.b,
                    fontWeight: 600,
                    fontSize: 12,
                    background: rosterDept === v ? T.primary : T.primaryL,
                    color: rosterDept === v ? "#fff" : T.primary,
                  }}
                >
                  {v === "my" ? "My Dept" : "All Students"}
                </button>
              ))}
              <select
                value={filterPct}
                onChange={(e) => setFilterPct(e.target.value as any)}
                style={{
                  padding: "7px 10px",
                  borderRadius: 9,
                  border: `1.5px solid ${T.border}`,
                  fontFamily: F.b,
                  fontSize: 12,
                  background: "#fff",
                }}
              >
                <option value="all">All Students</option>
                <option value="low">Below {settings.minPct}%</option>
                <option value="critical">Below 60%</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                style={{
                  padding: "7px 10px",
                  borderRadius: 9,
                  border: `1.5px solid ${T.border}`,
                  fontFamily: F.b,
                  fontSize: 12,
                  background: "#fff",
                }}
              >
                <option value="name">Sort: Name</option>
                <option value="pct">Sort: Attendance %</option>
                <option value="status">Sort: Today's Status</option>
              </select>
              <span
                style={{
                  fontFamily: F.b,
                  fontSize: 12,
                  color: T.muted,
                  flexShrink: 0,
                }}
              >
                {rosterStudents.length} students
              </span>
              <Btn
                v="ghost"
                sm
                onClick={() =>
                  downloadCSV("roster.csv", [
                    ["Name", "Roll", "Dept", "Year", "Sec", "Overall%", "Today"],
                    ...rosterStudents.map((p) => [
                      p.name,
                      p.rollNo,
                      p.dept,
                      p.year || "",
                      p.section || "",
                      String(overallPct(p)),
                      p.todayStatus,
                    ]),
                  ])
                }
              >
                Export CSV
              </Btn>
              <Btn
                v="ghost"
                sm
                onClick={() =>
                  exportToExcel("roster", "Roster", [
                    ["Name", "Roll", "Dept", "Year", "Sec", "Overall%", "Today"],
                    ...rosterStudents.map((p) => [
                      p.name,
                      p.rollNo,
                      p.dept,
                      p.year || "",
                      p.section || "",
                      overallPct(p),
                      p.todayStatus,
                    ]),
                  ])
                }
              >
                Export Excel
              </Btn>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: selStudent ? "1fr 380px" : "1fr",
                gap: 14,
                alignItems: "start",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {rosterStudents.map((p) => {
                  const pct = overallPct(p)
                  return (
                    <div
                      key={p.id}
                      className="hcard"
                      onClick={() =>
                        setSelStudent(selStudent?.id === p.id ? null : p)
                      }
                      style={{
                        background: T.card,
                        borderRadius: 12,
                        border: `1.5px solid ${
                          selStudent?.id === p.id ? T.primary : T.border
                        }`,
                        padding: "12px 14px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <Av av={p.avatar} dept={p.dept} size={36} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            flexWrap: "wrap",
                          }}
                        >
                          <span
                            style={{
                              fontFamily: F.h,
                              fontWeight: 700,
                              fontSize: 14,
                              color: T.text,
                            }}
                          >
                            {p.name}
                          </span>
                          <span
                            style={{
                              fontFamily: F.m,
                              fontSize: 9,
                              color: T.muted,
                            }}
                          >
                            {p.rollNo}
                          </span>
                          <span
                            style={{
                              background: DC[p.dept].light,
                              color: DC[p.dept].text,
                              fontSize: 9,
                              fontWeight: 700,
                              padding: "2px 6px",
                              borderRadius: 20,
                              fontFamily: F.b,
                            }}
                          >
                            {p.dept}
                          </span>
                          {pct < settings.minPct && (
                            <span
                              style={{
                                background: T.roseL,
                                color: T.rose,
                                fontSize: 9,
                                fontWeight: 700,
                                padding: "2px 6px",
                                borderRadius: 20,
                                fontFamily: F.b,
                              }}
                            >
                              At Risk
                            </span>
                          )}
                        </div>
                        <div
                          style={{
                            fontFamily: F.b,
                            fontSize: 11,
                            color: T.muted,
                            marginTop: 1,
                          }}
                        >
                          {p.year} Year · Sec {p.section}
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          flexShrink: 0,
                        }}
                      >
                        <TeacherAttendanceBdg status={p.todayStatus} />
                        <div style={{ minWidth: 100 }}>
                          <PBar pct={pct} min={settings.minPct} />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Student detail panel */}
              {selStudent && (
                <div style={{ position: "sticky", top: 80 }}>
                  <Card style={{ padding: 20 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: 14,
                      }}
                    >
                      <div style={{ display: "flex", gap: 12 }}>
                        <Av
                          av={selStudent.avatar}
                          dept={selStudent.dept}
                          size={50}
                        />
                        <div>
                          <div
                            style={{
                              fontFamily: F.h,
                              fontSize: 18,
                              fontWeight: 700,
                              color: T.text,
                            }}
                          >
                            {selStudent.name}
                          </div>
                          <div
                            style={{
                              fontFamily: F.b,
                              fontSize: 12,
                              color: T.muted,
                            }}
                          >
                            {selStudent.rollNo} · {DC[selStudent.dept].full}
                          </div>
                          <div
                            style={{
                              fontFamily: F.b,
                              fontSize: 11,
                              color: T.muted,
                            }}
                          >
                            {selStudent.year} Year · Section{" "}
                            {selStudent.section}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelStudent(null)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: T.muted,
                          fontSize: 18,
                        }}
                      >
                        ×
                      </button>
                    </div>

                    {/* Stats */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(4,1fr)",
                        gap: 6,
                        marginBottom: 14,
                      }}
                    >
                      {[
                        {
                          l: "Overall",
                          v: `${overallPct(selStudent)}%`,
                          c: T.primary,
                        },
                        {
                          l: "Present",
                          v: selStudent.history.filter(
                            (e) => e.status === "Present",
                          ).length,
                          c: T.sage,
                        },
                        {
                          l: "Absent",
                          v: selStudent.history.filter(
                            (e) => e.status === "Absent",
                          ).length,
                          c: T.rose,
                        },
                        {
                          l: "Late",
                          v: selStudent.history.filter(
                            (e) => e.status === "Late",
                          ).length,
                          c: T.peach,
                        },
                      ].map((s) => (
                        <div
                          key={s.l}
                          style={{
                            background: T.bg,
                            borderRadius: 8,
                            padding: "8px",
                            textAlign: "center",
                          }}
                        >
                          <div
                            style={{
                              fontFamily: F.h,
                              fontSize: 16,
                              fontWeight: 700,
                              color: s.c,
                            }}
                          >
                            {s.v}
                          </div>
                          <div
                            style={{
                              fontFamily: F.b,
                              fontSize: 9,
                              color: T.muted,
                            }}
                          >
                            {s.l}
                          </div>
                        </div>
                      ))}
                    </div>

                    {overallPct(selStudent) < settings.minPct && (
                      <div
                        style={{
                          background: T.roseL,
                          borderRadius: 8,
                          padding: "7px 10px",
                          fontSize: 12,
                          fontFamily: F.b,
                          color: T.rose,
                          fontWeight: 600,
                          marginBottom: 12,
                        }}
                      >
                        Below {settings.minPct}% minimum attendance threshold
                      </div>
                    )}

                    {/* 30-day bar chart */}
                    <div style={{ marginBottom: 14 }}>
                      <div
                        style={{
                          fontFamily: F.b,
                          fontWeight: 700,
                          fontSize: 11,
                          color: T.text,
                          marginBottom: 4,
                        }}
                      >
                        Last 30 Days
                      </div>
                      <StudentHistoryChart student={selStudent} />
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          marginTop: 5,
                          flexWrap: "wrap",
                        }}
                      >
                        {(["Present", "Absent", "Unmarked"] as const).map((s) => (
                          <span
                            key={s}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 3,
                              fontSize: 9,
                              fontFamily: F.b,
                              color: s === "Present" ? T.sage : s === "Absent" ? T.rose : T.muted,
                            }}
                          >
                            <span
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: 1,
                                background: SC[s].dot,
                                display: "inline-block",
                              }}
                            />
                            {SC[s].label}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Subject stats */}
                    {(
                      <>
                        <div
                          style={{
                            fontFamily: F.b,
                            fontWeight: 700,
                            fontSize: 11,
                            color: T.text,
                            marginBottom: 8,
                          }}
                        >
                          Subject-wise Attendance
                        </div>
                        {subjectAttendance(selStudent, lectures).map((s) => {
                          return (
                            <div key={s.name} style={{ marginBottom: 6 }}>
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  fontSize: 11,
                                  fontFamily: F.b,
                                  marginBottom: 2,
                                }}
                              >
                                <span
                                  style={{
                                    color: T.text,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                    flex: 1,
                                    minWidth: 0,
                                    marginRight: 6,
                                  }}
                                >
                                  {s.name}
                                </span>
                                <span
                                  style={{
                                    fontFamily: F.m,
                                    color: s.pct >= 75 ? T.sage : T.rose,
                                    fontWeight: 700,
                                    flexShrink: 0,
                                  }}
                                >
                                  {s.attended}/{s.total}
                                </span>
                              </div>
                              <PBar pct={s.pct} min={settings.minPct} />
                            </div>
                          )
                        })}
                      </>
                    )}

                    {/* Recent history */}
                    <div style={{ marginTop: 12 }}>
                      <div
                        style={{
                          fontFamily: F.b,
                          fontWeight: 700,
                          fontSize: 11,
                          color: T.text,
                          marginBottom: 8,
                        }}
                      >
                        Recent History
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 4,
                          maxHeight: 160,
                          overflowY: "auto",
                        }}
                      >
                        {selStudent.history.filter((entry) => entry.lectureId && selStudent.lectureAtt[entry.lectureId])
                          .reverse()
                          .slice(0, 15)
                          .map((e, i) => (
                            <div
                              key={i}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "5px 8px",
                                borderRadius: 7,
                                background: SC[e.status].bg,
                              }}
                            >
                              <span
                                style={{
                                  fontFamily: F.b,
                                  fontSize: 11,
                                  color: T.text,
                                }}
                              >
                                {new Date(e.date).toLocaleDateString("en", {
                                  weekday: "short",
                                  month: "short",
                                  day: "numeric",
                                })}
                              </span>
                              <span style={{fontFamily:F.b,fontSize:10,color:T.muted}}>{formatTimestamp(e.recordedAt)}</span>
                              <TeacherAttendanceBdg status={e.status} />
                            </div>
                          ))}
                      </div>
                    </div>

                    {/* Voice to Structured Remarks */}
                    <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${T.border}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <div style={{ fontFamily: F.b, fontWeight: 700, fontSize: 11, color: T.text, display: 'flex', alignItems: 'center', gap: 5 }}>
                          <Sparkle size={10} color={T.primary} />
                          Remarks & Behavioral Notes
                        </div>
                        <Btn
                          sm
                          v={isListeningRemark ? "danger" : "ghost"}
                          onClick={() => {
                            if (isListeningRemark) return
                            setIsListeningRemark(true)
                            VoiceService.listen((spokenText: string) => {
                              setIsListeningRemark(false)
                              const lower = spokenText.toLowerCase()
                              let category = "General"
                              if (lower.includes("medical") || lower.includes("sick") || lower.includes("fever") || lower.includes("doctor")) category = "Medical"
                              else if (lower.includes("academic") || lower.includes("assignment") || lower.includes("exam") || lower.includes("marks")) category = "Academic"
                              else if (lower.includes("discipline") || lower.includes("late") || lower.includes("disruptive") || lower.includes("warning")) category = "Discipline"
                              else if (lower.includes("praise") || lower.includes("good") || lower.includes("excellent") || lower.includes("active")) category = "Commendation"

                              const newRemark = { text: spokenText, category, date: todayStr() }
                              setPeople((ps) => ps.map((p) => {
                                if (p.id !== selStudent.id) return p
                                const remarks = p.remarks ? [newRemark, ...p.remarks] : [newRemark]
                                return { ...p, remarks }
                              }))
                              setSelStudent((prev: any) => prev ? { ...prev, remarks: prev.remarks ? [newRemark, ...prev.remarks] : [newRemark] } : null)
                              studentsApi.addRemark(selStudent.id, newRemark).catch(console.error)
                            }, () => setIsListeningRemark(false))
                          }}
                        >
                          {isListeningRemark ? "Listening..." : "🎤 Voice Remark"}
                        </Btn>
                      </div>

                      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                        <input
                          value={remarkText}
                          onChange={(e) => setRemarkText(e.target.value)}
                          placeholder="Type or speak a note..."
                          style={{
                            flex: 1,
                            padding: "5px 9px",
                            borderRadius: 7,
                            border: `1px solid ${T.border}`,
                            fontFamily: F.b,
                            fontSize: 11,
                            outline: 'none',
                            background: '#fff'
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && remarkText.trim()) {
                              const lower = remarkText.toLowerCase()
                              let category = "General"
                              if (lower.includes("medical") || lower.includes("sick") || lower.includes("fever")) category = "Medical"
                              else if (lower.includes("academic") || lower.includes("exam") || lower.includes("assignment")) category = "Academic"
                              else if (lower.includes("late") || lower.includes("warning") || lower.includes("discipline")) category = "Discipline"
                              else if (lower.includes("good") || lower.includes("excellent")) category = "Commendation"

                              const newRemark = { text: remarkText.trim(), category, date: todayStr() }
                              setPeople((ps) => ps.map((p) => {
                                if (p.id !== selStudent.id) return p
                                const remarks = p.remarks ? [newRemark, ...p.remarks] : [newRemark]
                                return { ...p, remarks }
                              }))
                              setSelStudent((prev: any) => prev ? { ...prev, remarks: prev.remarks ? [newRemark, ...prev.remarks] : [newRemark] } : null)
                              studentsApi.addRemark(selStudent.id, newRemark).catch(console.error)
                              setRemarkText("")
                            }
                          }}
                        />
                        <Btn
                          sm
                          onClick={() => {
                            if (!remarkText.trim()) return
                            const lower = remarkText.toLowerCase()
                            let category = "General"
                            if (lower.includes("medical") || lower.includes("sick") || lower.includes("fever")) category = "Medical"
                            else if (lower.includes("academic") || lower.includes("exam") || lower.includes("assignment")) category = "Academic"
                            else if (lower.includes("late") || lower.includes("warning") || lower.includes("discipline")) category = "Discipline"
                            else if (lower.includes("good") || lower.includes("excellent")) category = "Commendation"

                            const newRemark = { text: remarkText.trim(), category, date: todayStr() }
                            setPeople((ps) => ps.map((p) => {
                              if (p.id !== selStudent.id) return p
                              const remarks = p.remarks ? [newRemark, ...p.remarks] : [newRemark]
                              return { ...p, remarks }
                            }))
                            setSelStudent((prev: any) => prev ? { ...prev, remarks: prev.remarks ? [newRemark, ...prev.remarks] : [newRemark] } : null)
                            studentsApi.addRemark(selStudent.id, newRemark).catch(console.error)
                            setRemarkText("")
                          }}
                        >
                          Add
                        </Btn>
                      </div>

                      {selStudent.remarks && selStudent.remarks.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 120, overflowY: 'auto' }}>
                          {selStudent.remarks.map((r, i) => (
                            <div key={i} style={{ padding: '6px 8px', borderRadius: 7, background: T.bg, border: `1px solid ${T.border}`, fontSize: 11 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                                <span style={{
                                  fontSize: 9,
                                  fontWeight: 700,
                                  fontFamily: F.b,
                                  padding: '1px 6px',
                                  borderRadius: 10,
                                  background: r.category === 'Medical' ? T.roseL : r.category === 'Academic' ? T.primaryL : r.category === 'Commendation' ? T.sageL : T.peachL,
                                  color: r.category === 'Medical' ? T.rose : r.category === 'Academic' ? T.primary : r.category === 'Commendation' ? '#166534' : T.peach
                                }}>{r.category}</span>
                                <span style={{ fontFamily: F.m, fontSize: 9, color: T.muted }}>{r.date}</span>
                              </div>
                              <div style={{ fontFamily: F.b, color: T.text, fontSize: 11 }}>{r.text}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ fontSize: 11, color: T.muted, fontFamily: F.b, fontStyle: 'italic' }}>No remarks yet. Click Voice Remark to speak.</div>
                      )}
                    </div>

                    <div
                      style={{
                        marginTop: 12,
                        fontFamily: F.b,
                        fontSize: 11,
                        color: T.muted,
                      }}
                    >
                      {selStudent.email}
                    </div>
                  </Card>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── ANALYTICS ─── */}
        {view === "analytics" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <h1
              style={{
                fontFamily: F.h,
                fontSize: 24,
                fontWeight: 700,
                color: T.text,
                display: "flex",
                alignItems: "center",
                gap: 7,
              }}
            >
              <Sparkle size={11} />
              Department Analytics
            </h1>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))",
                gap: 12,
              }}
            >
              {[
                { l: "Dept Avg", v: deptAvg === null ? "Unmarked" : `${deptAvg}%`, c: T.primary },
                { l: "Students", v: myStudents.length, c: T.primary },
                { l: "At Risk", v: atRisk.length, c: T.rose },
                {
                  l: "Critical",
                  v: myStudents.filter((p) => hasRecordedAttendance(p) && overallPct(p) < 60).length,
                  c: T.rose,
                },
                {
                  l: "Excellent",
                  v: myStudents.filter((p) => hasRecordedAttendance(p) && overallPct(p) >= 90).length,
                  c: T.sage,
                },
              ].map((s) => (
                <Card key={s.l} style={{ padding: "14px 16px" }}>
                  <div
                    style={{
                      fontFamily: F.h,
                      fontSize: 24,
                      fontWeight: 700,
                      color: s.c,
                    }}
                  >
                    {s.v}
                  </div>
                  <div
                    style={{
                      fontFamily: F.b,
                      fontSize: 11,
                      color: T.muted,
                      marginTop: 3,
                    }}
                  >
                    {s.l}
                  </div>
                </Card>
              ))}
            </div>

            {/* Attendance distribution bar */}
            <Card style={{ padding: 18 }}>
              <div
                style={{
                  fontFamily: F.h,
                  fontSize: 15,
                  fontWeight: 700,
                  color: T.text,
                  marginBottom: 14,
                }}
              >
                Attendance Distribution
              </div>
              {[
                { r: [0, 60], l: "Critical (<60%)", c: T.rose },
                { r: [60, 75], l: "Low (60-75%)", c: T.peach },
                { r: [75, 90], l: "Good (75-90%)", c: "#a8d5a2" },
                { r: [90, 101], l: "Excellent (>90%)", c: T.sage },
              ].map((b) => {
                const n = analyticsStudents.filter((p) => {
                  const pct = overallPct(p)
                  return pct >= b.r[0] && pct < b.r[1]
                }).length
                const pct = analyticsStudents.length
                  ? Math.round((n / analyticsStudents.length) * 100)
                  : 0
                return (
                  <div key={b.l} style={{ marginBottom: 10 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 12,
                        fontFamily: F.b,
                        marginBottom: 4,
                      }}
                    >
                      <span style={{ color: T.text }}>{b.l}</span>
                      <span
                        style={{ fontFamily: F.m, fontWeight: 700, color: b.c }}
                      >
                        {n} students ({pct}%)
                      </span>
                    </div>
                    <div
                      style={{
                        height: 20,
                        background: T.primaryL,
                        borderRadius: 6,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${pct}%`,
                          background: b.c,
                          borderRadius: 6,
                          transition: "width .5s",
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </Card>

            {/* Subject comparison */}
            <Card style={{ padding: 18 }}>
              <div
                style={{
                  fontFamily: F.h,
                  fontSize: 15,
                  fontWeight: 700,
                  color: T.text,
                  marginBottom: 14,
                }}
              >
                By Subject
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                {subjStats
                  .sort((a, b) => b.avg - a.avg)
                  .map((s) => (
                    <div
                      key={s.name}
                      style={{ display: "flex", alignItems: "center", gap: 12 }}
                    >
                      <span
                        style={{
                          fontFamily: F.b,
                          fontSize: 12,
                          color: T.text,
                          minWidth: 150,
                          flex: "0 0 150px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {s.name}
                      </span>
                      <div
                        style={{
                          flex: 1,
                          height: 22,
                          background: T.primaryL,
                          borderRadius: 6,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${s.avg ?? 0}%`,
                            background: s.avg === null ? T.border : s.avg >= 75 ? T.sage : T.peach,
                            borderRadius: 6,
                            transition: "width .5s",
                          }}
                        />
                      </div>
                      <span
                        style={{
                          fontFamily: F.m,
                          fontSize: 12,
                          fontWeight: 700,
                          color: s.avg === null ? T.muted : s.avg >= 75 ? T.sage : T.rose,
                          minWidth: 38,
                        }}
                      >
                        {s.avg === null ? "Unmarked" : `${s.avg}%`}
                      </span>
                      <span
                        style={{
                          fontFamily: F.b,
                          fontSize: 10,
                          color: T.muted,
                          minWidth: 50,
                        }}
                      >
                        {s.lecs} classes
                      </span>
                    </div>
                  ))}
              </div>
            </Card>

            {/* Per-student table */}
            <Card style={{ padding: 18 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    fontFamily: F.h,
                    fontSize: 15,
                    fontWeight: 700,
                    color: T.text,
                  }}
                >
                  All Students
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <Btn
                    v="ghost"
                    sm
                    onClick={() => downloadCSV("my-dept-report.csv", teacherExportRows)}
                  >
                    Export CSV
                  </Btn>
                  <Btn
                    v="ghost"
                    sm
                    onClick={() => exportToExcel("my-dept-report", `${teacher.dept} Attendance`, teacherExportRows)}
                  >
                    Export Excel
                  </Btn>
                </div>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#fdf9ff" }}>
                      {["Name", "Roll", "Year", "Sec", "Overall", "Today"].map(
                        (h) => (
                          <th
                            key={h}
                            style={{
                              padding: "8px 10px",
                              textAlign: "left",
                              fontSize: 9,
                              fontWeight: 700,
                              color: T.muted,
                              textTransform: "uppercase",
                              letterSpacing: 0.8,
                              fontFamily: F.b,
                              borderBottom: `1px solid ${T.border}`,
                            }}
                          >
                            {h}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {myStudents
                      .sort((a, b) => overallPct(a) - overallPct(b))
                      .map((p, i) => {
                        const pct = overallPct(p)
                        return (
                          <tr
                            key={p.id}
                            onClick={() => {
                              setSelStudent(p)
                              setView("roster")
                            }}
                            style={{
                              borderTop: i
                                ? `1px solid ${T.border}`
                                : undefined,
                              cursor: "pointer",
                            }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.background = T.primaryL)
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.background = "")
                            }
                          >
                            <td style={{ padding: "7px 10px" }}>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 8,
                                }}
                              >
                                <Av av={p.avatar} dept={p.dept} size={22} />
                                <span
                                  style={{
                                    fontFamily: F.b,
                                    fontWeight: 600,
                                    fontSize: 12,
                                    color: T.text,
                                  }}
                                >
                                  {p.name}
                                </span>
                                {hasRecordedAttendance(p) && pct < settings.minPct && (
                                  <span
                                    style={{
                                      background: T.roseL,
                                      color: T.rose,
                                      fontSize: 8,
                                      fontWeight: 700,
                                      padding: "1px 5px",
                                      borderRadius: 20,
                                      fontFamily: F.b,
                                    }}
                                  >
                                    Risk
                                  </span>
                                )}
                              </div>
                            </td>
                            <td
                              style={{
                                padding: "7px 10px",
                                fontFamily: F.m,
                                fontSize: 10,
                                color: T.muted,
                              }}
                            >
                              {p.rollNo}
                            </td>
                            <td
                              style={{
                                padding: "7px 10px",
                                fontFamily: F.b,
                                fontSize: 11,
                                color: T.muted,
                              }}
                            >
                              {p.year}
                            </td>
                            <td
                              style={{
                                padding: "7px 10px",
                                fontFamily: F.b,
                                fontSize: 11,
                                color: T.muted,
                              }}
                            >
                              {p.section}
                            </td>
                            <td style={{ padding: "7px 10px", minWidth: 100 }}>
                              <PBar pct={pct} min={settings.minPct} recorded={hasRecordedAttendance(p)} />
                            </td>
                            <td style={{ padding: "7px 10px" }}>
                              <TeacherAttendanceBdg status={p.todayStatus} />
                            </td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}

// ── APP ROOT ──────────────────────────────────────────────────────────────────
export default function App() {
  const [portal, setPortal] = useState<Portal>(() => readCurrentRoute().portal)
  const [teacherId, setTeacherId] = useState<string | undefined>(
    () => readCurrentRoute().teacherId,
  )
  const [people, setPeople] = useState<Person[]>(loadPeople)
  const [lectures, setLectures] = useState<Lecture[]>(() =>
    mergeLectureRecords(
      ALL_LECS,
      readStoredRecords<unknown>(LECTURES_STORAGE_KEY),
    ),
  )
  const [events, setEvents] = useState<CalendarEvent[]>(() =>
    mergeEventRecords(
      mergeLectureRecords(
        ALL_LECS,
        readStoredRecords<unknown>(LECTURES_STORAGE_KEY),
      ),
      readStoredRecords<unknown>(EVENTS_STORAGE_KEY),
    ),
  )
  CURRENT_LECTURES = lectures

  // Live Sync with FastAPI + Supabase backend
  useEffect(() => {
    let active = true

    // Fetch students from Supabase API
    studentsApi.getAll().then((data) => {
      if (active && data && data.length > 0) {
        setPeople(data)
      }
    }).catch((err) => {
      console.warn("Backend API not reachable, using local cache:", err)
    })

    // Fetch lectures from Supabase API
    lecturesApi.getAll().then((data) => {
      if (active && data && data.length > 0) {
        setLectures(data)
      }
    }).catch(() => {})

    // Fetch calendar events
    calendarApi.getEvents().then((data) => {
      if (active && data && data.length > 0) {
        setEvents(data)
      }
    }).catch(() => {})

    return () => {
      active = false
    }
  }, [])

  useEffect(
    () => saveStoredValue(ROUTE_STORAGE_KEY, { portal, teacherId }),
    [portal, teacherId],
  )
  useEffect(() => writeStoredRecords(PEOPLE_STORAGE_KEY, people), [people])
  useEffect(
    () => writeStoredRecords(LECTURES_STORAGE_KEY, lectures),
    [lectures],
  )
  useEffect(() => writeStoredRecords(EVENTS_STORAGE_KEY, events), [events])
  const handleLogin = (p: Portal, tid?: string) => {
    setPortal(p)
    setTeacherId(tid)
  }
  const handleLogout = () => {
    authApi.logout()
    setPortal("login")
    setTeacherId(undefined)
  }
  const teacher = TEACHERS.find((t) => t.id === teacherId)
  if (portal === "login") return <LoginScreen onLogin={handleLogin} />
  if (portal === "teacher" && teacher)
    return (
      <TeacherPortal
        teacher={teacher}
        people={people}
        setPeople={setPeople}
        lectures={lectures}
        setLectures={setLectures}
        events={events}
        setEvents={setEvents}
        onLogout={handleLogout}
      />
    )
  return (
    <AdminPortal
      people={people}
      setPeople={setPeople}
      lectures={lectures}
      onLogout={handleLogout}
    />
  )
}

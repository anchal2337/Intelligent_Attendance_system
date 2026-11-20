import datetime
import random
from sqlalchemy.orm import Session
from app.models.entities import (
    Department, User, Teacher, Student, Subject, TeacherSubject,
    Lecture, GateAttendance, LectureAttendance, SystemSettings
)
from app.core.security import get_password_hash

DEPTS = ["CS", "IT", "Mech", "Civil", "ECE", "EEE"]

DEPT_INFO = {
    "CS": {"name": "Computer Science", "color": "#7c6b9e", "light": "#f0ebff", "text": "#5b21b6"},
    "IT": {"name": "Info Technology", "color": "#6b8cae", "light": "#e6f0fb", "text": "#1e4d7a"},
    "Mech": {"name": "Mechanical", "color": "#b87052", "light": "#fdf0ea", "text": "#92400e"},
    "Civil": {"name": "Civil Engg.", "color": "#5a9e7c", "light": "#e6f5ee", "text": "#1a5c3a"},
    "ECE": {"name": "Electronics", "color": "#ae6b8c", "light": "#f9e6f0", "text": "#7a1e50"},
    "EEE": {"name": "Electrical", "color": "#ae9c52", "light": "#f7f0d6", "text": "#705c00"},
}

SUBJ = {
    "CS": ["Data Structures", "Algorithms", "DBMS", "OS", "Comp. Networks", "Software Engg."],
    "IT": ["Web Technology", "Database Sys.", "Networking", "Python", "Cloud Computing", "Cyber Security"],
    "Mech": ["Thermodynamics", "Fluid Mechanics", "Manufacturing", "Machine Design", "Heat Transfer", "Kinematics"],
    "Civil": ["Structural Analysis", "Fluid Mechanics", "Surveying", "Soil Mechanics", "Concrete Design", "Highway Engg."],
    "ECE": ["Signals & Systems", "Digital Electronics", "Microprocessors", "Communication", "VLSI Design", "Electromagnetics"],
    "EEE": ["Circuit Theory", "Power Systems", "Elec. Machines", "Control Systems", "Power Electronics", "Measurement"],
}

TIMES = ["09:00", "10:00", "11:00", "14:00", "15:00"]

TEACHERS_DATA = [
    {"id": "T001", "name": "Dr. Ramesh Iyer", "dept": "CS", "role": "HOD, CS Dept", "password": "cs123", "email": "ramesh.iyer@ssipmt.ac.in"},
    {"id": "T002", "name": "Prof. Sunita Das", "dept": "IT", "role": "Asst. Professor, IT", "password": "it123", "email": "sunita.das@ssipmt.ac.in"},
    {"id": "T003", "name": "Dr. Ajay Tiwari", "dept": "Mech", "role": "Professor, Mech", "password": "mech123", "email": "ajay.tiwari@ssipmt.ac.in"},
    {"id": "T004", "name": "Ms. Rekha Nair", "dept": "Civil", "role": "Lecturer, Civil", "password": "civil123", "email": "rekha.nair@ssipmt.ac.in"},
    {"id": "T005", "name": "Dr. Meena Pillai", "dept": "EEE", "role": "Professor, EEE", "password": "eee123", "email": "meena.pillai@ssipmt.ac.in"},
    {"id": "T006", "name": "Mr. Vishal Bose", "dept": "ECE", "role": "Lab Incharge, ECE", "password": "ece123", "email": "vishal.bose@ssipmt.ac.in"},
]

FNAMES = [
    "Aarav", "Aditi", "Ajay", "Akash", "Akshay", "Amar", "Ananya", "Anil", "Anjali", "Ankit",
    "Ansh", "Anushka", "Arjun", "Aryan", "Asha", "Ayaan", "Bhavya", "Chirag", "Deepak", "Deepika",
    "Dev", "Divya", "Gaurav", "Harsh", "Isha", "Jatin", "Jaya", "Karan", "Kavya", "Komal",
    "Krishna", "Kunal", "Lakshmi", "Lalit", "Manish", "Manisha", "Meera", "Mohit", "Naina", "Neha",
    "Nikhil", "Nikita", "Nisha", "Nitesh", "Pallavi", "Pooja", "Prachi", "Priya", "Rahul", "Raj",
    "Rajan", "Rajesh", "Ravi", "Rekha", "Rishi", "Ritika", "Rohan", "Rohit", "Ruchi", "Sachin",
    "Sahil", "Sai", "Sanchi", "Sanjay", "Sara", "Shivam", "Shreya", "Shubham", "Siddharth", "Sneha",
    "Sonam", "Suresh", "Swati", "Tanvi", "Tarun", "Uday", "Uma", "Varun", "Vedant", "Vibha",
    "Vikas", "Vikram", "Vishal", "Vivek", "Yash", "Yogesh"
]

LNAMES = [
    "Agarwal", "Ahuja", "Bajaj", "Bansal", "Bose", "Chauhan", "Chopra", "Dalal", "Das", "Desai",
    "Dixit", "Dubey", "Ghosh", "Gupta", "Iyer", "Jain", "Joshi", "Kapoor", "Kaur", "Khan",
    "Khanna", "Kumar", "Lal", "Mahajan", "Mehta", "Mishra", "Nair", "Pandey", "Patel", "Patil",
    "Pillai", "Rao", "Rastogi", "Reddy", "Sahu", "Saxena", "Shah", "Sharma", "Shukla", "Singh",
    "Sinha", "Srivastava", "Tiwari", "Tripathi", "Varma", "Verma", "Yadav"
]

def seed_database(db: Session):
    # Check if already seeded
    if db.query(Department).first():
        print("Database already seeded. Skipping initial seeding.")
        return

    print("Seeding database...")
    today = datetime.date.today()
    today_str = today.strftime("%Y-%m-%d")

    # 1. Settings
    settings = SystemSettings(
        id=1,
        college="SSIPMT Raipur",
        min_pct=75,
        late_after=5,
        dupe_prev=True,
        auto_start=False,
        low_alert=True
    )
    db.add(settings)

    # 2. Admin User
    admin_user = User(
        id="ADMIN01",
        username="admin",
        email="admin@ssipmt.ac.in",
        password_hash=get_password_hash("admin"),
        role="admin"
    )
    db.add(admin_user)

    # 3. Departments & Subjects
    for code in DEPTS:
        info = DEPT_INFO[code]
        dept = Department(
            code=code,
            name=info["name"],
            color=info["color"],
            light_color=info["light"],
            text_color=info["text"]
        )
        db.add(dept)

        for si, sname in enumerate(SUBJ[code]):
            subject = Subject(
                dept=code,
                name=sname,
                sub_idx=si
            )
            db.add(subject)
    db.flush()

    # 4. Teachers
    for t_data in TEACHERS_DATA:
        teacher = Teacher(
            id=t_data["id"],
            name=t_data["name"],
            dept=t_data["dept"],
            role=t_data["role"],
            password=t_data["password"],
            email=t_data["email"],
            phone="9876543210"
        )
        db.add(teacher)

        # Also create a user record for teacher
        user = User(
            id=f"USER_{t_data['id']}",
            username=t_data["id"].lower(),
            email=t_data["email"],
            password_hash=get_password_hash(t_data["password"]),
            role="teacher"
        )
        db.add(user)

        # Link teacher to subjects
        dept_subjects = db.query(Subject).filter(Subject.dept == t_data["dept"]).all()
        for s in dept_subjects:
            ts = TeacherSubject(teacher_id=t_data["id"], subject_id=s.id)
            db.add(ts)
    db.flush()

    # 5. Students (600 students: 100 per dept)
    rng = random.Random(42)
    YEARS = ["1st", "2nd", "3rd", "4th"]
    SECS = ["A", "B", "C"]
    used_names = set()
    idx = 0
    all_students = []

    for dept_code in DEPTS:
        for i in range(100):
            while True:
                fn = rng.choice(FNAMES)
                ln = rng.choice(LNAMES)
                if (fn, ln) not in used_names:
                    used_names.add((fn, ln))
                    break
            year = rng.choice(YEARS)
            sec = rng.choice(SECS)
            roll_num = str(2100 + idx)[1:]
            student_id = f"S{str(idx + 1).zfill(3)}"
            roll_no = f"{dept_code}{year[0]}{roll_num}"

            student = Student(
                id=student_id,
                name=f"{fn} {ln}",
                roll_no=roll_no,
                dept=dept_code,
                category="Student",
                year=year,
                section=sec,
                avatar=f"{fn[0]}{ln[0]}",
                phone=f"9{rng.randint(100000000, 999999999)}",
                email=f"{fn.lower()}.{ln.lower()}@ssipmt.ac.in",
                is_active=True
            )
            db.add(student)
            all_students.append(student)
            idx += 1

    # Staff Members
    staff_members = [
        Student(id="A001", name="Mohan Das", roll_no="ADM001", dept="CS", category="Staff", role="Office Superintendent", avatar="MD", phone="9876500001", email="mohan@ssipmt.ac.in"),
        Student(id="P001", name="Ramkumar Singh", roll_no="PEO001", dept="CS", category="Staff", role="Peon", avatar="RS", phone="9876500002", email="ramkumar@ssipmt.ac.in"),
        Student(id="B001", name="Archana Mishra", roll_no="LIB001", dept="CS", category="Staff", role="Chief Librarian", avatar="AM", phone="9876500003", email="archana@ssipmt.ac.in")
    ]
    for sm in staff_members:
        db.add(sm)
        all_students.append(sm)

    db.flush()

    # 6. Lectures Generation (past 89 days to future 7 days)
    sched = [[1, 3], [2, 4], [1, 4], [2, 3], [1, 2], [3, 4]]
    all_lectures = []

    for day_offset in range(89, -8, -1):
        d = today - datetime.timedelta(days=day_offset)
        dow = d.weekday() + 1  # 1=Monday, ..., 7=Sunday
        if dow in [6, 7]:  # skip weekends
            continue
        ds = d.strftime("%Y-%m-%d")

        for dept_code in DEPTS:
            subjects = SUBJ[dept_code]
            for si, sname in enumerate(subjects):
                d1, d2 = sched[si % len(sched)]
                if dow in [d1, d2]:
                    ti = (si + (2 if dow == d2 else 0)) % len(TIMES)
                    lec_id = f"{dept_code}-{si}-{ds}"
                    is_past = ds < today_str
                    status = "Conducted" if is_past else "Upcoming"

                    lec = Lecture(
                        id=lec_id,
                        dept=dept_code,
                        subject=sname,
                        sub_idx=si,
                        date=ds,
                        time=TIMES[ti],
                        status=status,
                        conducted_by=f"Dr. Faculty ({dept_code})" if is_past else None,
                        saved_at=f"{ds}T{TIMES[ti]}:50:00Z" if is_past else None
                    )
                    db.add(lec)
                    all_lectures.append(lec)

    db.flush()

    # 7. Seed Past Attendance for Students (recent 14 days sample for speed & realism)
    print("Seeding realistic sample attendance...")
    conducted_lectures = [l for l in all_lectures if l.status == "Conducted" and l.date >= (today - datetime.timedelta(days=14)).strftime("%Y-%m-%d")]
    
    # Pre-index students by dept
    dept_students = {}
    for s in all_students:
        if s.category == "Student":
            dept_students.setdefault(s.dept, []).append(s)

    att_records = []
    gate_records = []

    for lec in conducted_lectures:
        students = dept_students.get(lec.dept, [])
        for s in students:
            # 85% attendance rate on average
            is_present = rng.random() < 0.85
            status = "Present" if is_present else "Absent"
            att_records.append(LectureAttendance(
                lecture_id=lec.id,
                student_id=s.id,
                status=status,
                recorded_at=f"{lec.date}T{lec.time}:15:00Z"
            ))

    # Seed today's Gate Attendance (sample)
    for s in all_students:
        if s.category == "Student":
            val = rng.random()
            if val < 0.70:
                gate_records.append(GateAttendance(
                    student_id=s.id,
                    date=today_str,
                    status="Present",
                    checked_in="08:45",
                    checked_in_at=f"{today_str}T08:45:00Z"
                ))
            elif val < 0.82:
                gate_records.append(GateAttendance(
                    student_id=s.id,
                    date=today_str,
                    status="Late",
                    checked_in="09:15",
                    checked_in_at=f"{today_str}T09:15:00Z"
                ))
            elif val < 0.90:
                gate_records.append(GateAttendance(
                    student_id=s.id,
                    date=today_str,
                    status="Absent"
                ))
        elif s.category == "Staff":
            gate_records.append(GateAttendance(
                student_id=s.id,
                date=today_str,
                status="Present",
                checked_in="07:45",
                checked_in_at=f"{today_str}T07:45:00Z"
            ))

    db.bulk_save_objects(att_records)
    db.bulk_save_objects(gate_records)
    db.commit()
    print("Database seeding completed successfully!")

import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from app.main import app

def test_endpoints():
    with TestClient(app) as client:
        print("1. Testing Root & Health...")
        r = client.get("/")
        assert r.status_code == 200, f"Root failed: {r.text}"
        print("   Root OK:", r.json())

    print("\n2. Testing Admin Login...")
    r = client.post("/api/v1/auth/login", json={"role": "admin", "username": "admin", "password": "admin"})
    assert r.status_code == 200, f"Admin login failed: {r.text}"
    admin_token = r.json()["access_token"]
    print("   Admin Login OK! Token acquired.")

    print("\n3. Testing Teacher Login...")
    r = client.post("/api/v1/auth/login", json={"role": "teacher", "teacher_id": "T001", "password": "cs123"})
    assert r.status_code == 200, f"Teacher login failed: {r.text}"
    teacher_token = r.json()["access_token"]
    print("   Teacher Login OK! Token acquired.")

    print("\n4. Testing Departments...")
    r = client.get("/api/v1/departments/")
    assert r.status_code == 200, f"Departments failed: {r.text}"
    depts = r.json()
    print(f"   Departments OK! Total depts: {len(depts)}")

    print("\n5. Testing Students Query...")
    r = client.get("/api/v1/students/?dept=CS")
    assert r.status_code == 200, f"Students failed: {r.text}"
    students = r.json()
    print(f"   Students OK! CS students count: {len(students)}")
    first_student = students[0]
    print(f"   First student: {first_student['name']} ({first_student['rollNo']}), Remarks count: {len(first_student['remarks'])}")

    print("\n6. Testing Lectures...")
    r = client.get("/api/v1/lectures/today?dept=CS")
    assert r.status_code == 200, f"Lectures failed: {r.text}"
    lecs = r.json()
    print(f"   Today's CS Lectures count: {len(lecs)}")

    print("\n7. Testing Reports Dashboard...")
    r = client.get("/api/v1/reports/dashboard")
    assert r.status_code == 200, f"Dashboard failed: {r.text}"
    dash = r.json()
    print(f"   Dashboard OK! Today's Rate: {dash.get('rate')}, Total Students: {dash.get('totalStudents')}, Defaulters: {dash.get('defaulters')}")

    print("\n8. Testing Settings...")
    r = client.get("/api/v1/settings/")
    assert r.status_code == 200, f"Settings failed: {r.text}"
    settings = r.json()
    print(f"   Settings OK! College: {settings['college']}, Min %: {settings['minPct']}")

    print("\n9. Testing Gate Attendance Marking...")
    r = client.post("/api/v1/attendance/gate/mark", json={"student_id": first_student["id"], "status": "Present", "is_out": False})
    assert r.status_code == 200, f"Gate mark failed: {r.text}"
    print(f"   Gate Mark OK! Check-in: {r.json()['time']}")

    print("\n10. Testing Remarks Creation with Auto-Categorization...")
    r = client.post(f"/api/v1/students/{first_student['id']}/remarks", json={"text": "Student has mild fever and went home", "category": "General"})
    assert r.status_code == 200, f"Remark failed: {r.text}"
    print(f"   Remark OK! Categorized as: {r.json()['category']}")

    print("\n11. Testing Lecture Attendance Marking...")
    if lecs:
        lec_id = lecs[0]["id"]
        # Start lecture
        r = client.post(f"/api/v1/lectures/{lec_id}/start")
        assert r.status_code == 200, f"Start lecture failed: {r.text}"
        # Mark student present
        r = client.post(f"/api/v1/attendance/lecture/{lec_id}/mark", json={"student_id": first_student["id"], "status": "Present"})
        assert r.status_code == 200, f"Mark lecture failed: {r.text}"
        # Save attendance
        r = client.post(f"/api/v1/lectures/{lec_id}/save?conducted_by=Dr.%20Iyer")
        assert r.status_code == 200, f"Save lecture failed: {r.text}"
        print(f"   Lecture Lifecycle & Attendance Marking OK for lecture: {lec_id}")

    print("\n12. Testing CSV Export...")
    r = client.get("/api/v1/reports/export/csv?dept=CS")
    assert r.status_code == 200, f"Export CSV failed: {r.text}"
    assert "Student,Roll No,Department" in r.text
    print(f"   CSV Export OK! Output size: {len(r.text)} bytes")

    print("\n🎉 ALL 12 BACKEND ENDPOINTS AND WORKFLOWS VERIFIED SUCCESSFULLY! 🚀")

if __name__ == "__main__":
    test_endpoints()

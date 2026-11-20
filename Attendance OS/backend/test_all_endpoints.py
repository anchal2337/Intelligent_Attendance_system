import requests
import json
import time

BASE_URL = "http://localhost:8000"

def run_tests():
    print("=" * 70)
    print("ATTENDANCE OS - FULL API ENDPOINT TEST SUITE")
    print(f"Target: {BASE_URL}")
    print("=" * 70)

    results = []

    def log_result(name, method, url, status, expected_status, details=""):
        passed = (status in expected_status if isinstance(expected_status, list) else status == expected_status)
        symbol = "✅ PASS" if passed else "❌ FAIL"
        print(f"{symbol} [{method:4}] {url:48} -> {status} {details}")
        results.append({
            "name": name,
            "method": method,
            "url": url,
            "status": status,
            "passed": passed,
            "details": details
        })
        return passed

    # 1. Root & Health
    r = requests.get(f"{BASE_URL}/")
    log_result("Root /", "GET", "/", r.status_code, 200, f"Response: {r.json().get('message')}")

    # 2. OpenAPI JSON
    r = requests.get(f"{BASE_URL}/api/v1/openapi.json")
    log_result("OpenAPI Spec", "GET", "/api/v1/openapi.json", r.status_code, 200, f"Title: {r.json().get('info', {}).get('title')}")

    # 3. Swagger Docs
    r = requests.get(f"{BASE_URL}/api/v1/docs")
    log_result("Swagger UI Docs", "GET", "/api/v1/docs", r.status_code, 200)

    # 4. ReDoc
    r = requests.get(f"{BASE_URL}/api/v1/redoc")
    log_result("ReDoc", "GET", "/api/v1/redoc", r.status_code, 200)

    # 5. Auth: Admin Login
    r = requests.post(f"{BASE_URL}/api/v1/auth/login", json={"role": "admin", "username": "admin", "password": "admin"})
    admin_token = None
    if r.status_code == 200:
        admin_token = r.json().get("access_token")
    log_result("Auth Admin Login", "POST", "/api/v1/auth/login", r.status_code, 200, f"Token: {admin_token[:15]}..." if admin_token else "Failed")

    # 6. Auth: Teacher Login
    r = requests.post(f"{BASE_URL}/api/v1/auth/login", json={"role": "teacher", "teacher_id": "T001", "password": "cs123"})
    teacher_token = None
    if r.status_code == 200:
        teacher_token = r.json().get("access_token")
    log_result("Auth Teacher Login", "POST", "/api/v1/auth/login", r.status_code, 200, f"Teacher: Dr. Ramesh Iyer (T001)")

    # 7. Auth: Invalid Login test
    r = requests.post(f"{BASE_URL}/api/v1/auth/login", json={"role": "admin", "username": "admin", "password": "wrongpassword"})
    log_result("Auth Invalid Login (Rejection)", "POST", "/api/v1/auth/login", r.status_code, 401, "Correctly rejected bad password")

    # 8. Auth: Me endpoint
    headers = {"Authorization": f"Bearer {admin_token}"} if admin_token else {}
    r = requests.get(f"{BASE_URL}/api/v1/auth/me", headers=headers)
    log_result("Auth /me", "GET", "/api/v1/auth/me", r.status_code, 200, f"User: {r.json().get('username') if r.status_code == 200 else ''}")

    # 9. Departments: List All
    r = requests.get(f"{BASE_URL}/api/v1/departments/")
    depts = r.json() if r.status_code == 200 else []
    log_result("Departments List", "GET", "/api/v1/departments/", r.status_code, 200, f"Count: {len(depts)} departments")

    # 10. Departments: Single Dept
    r = requests.get(f"{BASE_URL}/api/v1/departments/CS")
    log_result("Department Get Single (CS)", "GET", "/api/v1/departments/CS", r.status_code, 200, f"Name: {r.json().get('name') if r.status_code == 200 else ''}")

    # 11. Students: List All
    r = requests.get(f"{BASE_URL}/api/v1/students/")
    students = r.json() if r.status_code == 200 else []
    log_result("Students List (All)", "GET", "/api/v1/students/", r.status_code, 200, f"Count: {len(students)} students")

    # 12. Students: Filter by Dept
    r = requests.get(f"{BASE_URL}/api/v1/students/?dept=CS")
    cs_students = r.json() if r.status_code == 200 else []
    first_student = cs_students[0] if cs_students else None
    log_result("Students Filter (dept=CS)", "GET", "/api/v1/students/?dept=CS", r.status_code, 200, f"CS Students: {len(cs_students)}")

    # 13. Students: Get Single Student
    if first_student:
        r = requests.get(f"{BASE_URL}/api/v1/students/{first_student['id']}")
        log_result(f"Student Get Single ({first_student['id']})", "GET", f"/api/v1/students/{first_student['id']}", r.status_code, 200, f"Name: {first_student['name']}, Roll: {first_student['rollNo']}")

    # 14. Gate Attendance: Today's status
    r = requests.get(f"{BASE_URL}/api/v1/attendance/gate/today")
    gate_records = r.json() if r.status_code == 200 else []
    log_result("Gate Attendance Today", "GET", "/api/v1/attendance/gate/today", r.status_code, 200, f"Records: {len(gate_records)}")

    # 15. Gate Attendance: Mark In/Present
    if first_student:
        r = requests.post(f"{BASE_URL}/api/v1/attendance/gate/mark", json={"student_id": first_student["id"], "status": "Present", "is_out": False})
        log_result("Gate Attendance Mark In", "POST", "/api/v1/attendance/gate/mark", r.status_code, 200, f"Status: {r.json().get('status') if r.status_code == 200 else ''}")

    # 16. Gate Attendance: Mark Out
    if first_student:
        r = requests.post(f"{BASE_URL}/api/v1/attendance/gate/mark", json={"student_id": first_student["id"], "status": "Out", "is_out": True})
        log_result("Gate Attendance Mark Out", "POST", "/api/v1/attendance/gate/mark", r.status_code, 200, f"Out time recorded")

    # 17. Lectures: Today's lectures
    r = requests.get(f"{BASE_URL}/api/v1/lectures/today?dept=CS")
    cs_lectures = r.json() if r.status_code == 200 else []
    log_result("Lectures Today (CS)", "GET", "/api/v1/lectures/today?dept=CS", r.status_code, 200, f"Lectures count: {len(cs_lectures)}")

    # 18. Lectures: Date Query
    today_str = time.strftime("%Y-%m-%d")
    r = requests.get(f"{BASE_URL}/api/v1/lectures/?date={today_str}&dept=CS")
    log_result("Lectures by Date", "GET", f"/api/v1/lectures/?date={today_str}&dept=CS", r.status_code, 200, f"Found: {len(r.json() if r.status_code == 200 else [])}")

    # 19. Lectures: Lifecycle & Lecture Attendance
    if cs_lectures and first_student:
        lec = cs_lectures[0]
        lec_id = lec["id"]

        # Start Lecture
        r = requests.post(f"{BASE_URL}/api/v1/lectures/{lec_id}/start")
        log_result("Lecture Start", "POST", f"/api/v1/lectures/{lec_id}/start", r.status_code, 200, f"Subject: {lec.get('subject')}")

        # Mark Lecture Attendance
        r = requests.post(f"{BASE_URL}/api/v1/attendance/lecture/{lec_id}/mark", json={"student_id": first_student["id"], "status": "Present"})
        log_result("Lecture Attendance Mark", "POST", f"/api/v1/attendance/lecture/{lec_id}/mark", r.status_code, 200, f"Student {first_student['id']} marked Present")

        # Get Lecture Attendance
        r = requests.get(f"{BASE_URL}/api/v1/attendance/lecture/{lec_id}")
        log_result("Lecture Attendance Get", "GET", f"/api/v1/attendance/lecture/{lec_id}", r.status_code, 200, f"Records: {len(r.json() if r.status_code == 200 else [])}")

        # Save / Complete Lecture
        r = requests.post(f"{BASE_URL}/api/v1/lectures/{lec_id}/save?conducted_by=Dr.%20Ramesh%20Iyer")
        log_result("Lecture Save/Complete", "POST", f"/api/v1/lectures/{lec_id}/save", r.status_code, 200, f"Conducted by Dr. Ramesh Iyer")

    # 20. Remarks: Add Remark
    if first_student:
        r = requests.post(f"{BASE_URL}/api/v1/students/{first_student['id']}/remarks", json={
            "text": "Student showed excellent participation in today's class discussion.",
            "category": "Academic",
            "author": "Dr. Ramesh Iyer"
        })
        remark_data = r.json() if r.status_code == 200 else {}
        log_result("Add Student Remark", "POST", f"/api/v1/students/{first_student['id']}/remarks", r.status_code, 200, f"Category: {remark_data.get('category')}")

        # Get Remarks for student
        r = requests.get(f"{BASE_URL}/api/v1/students/{first_student['id']}/remarks")
        log_result("Get Student Remarks", "GET", f"/api/v1/students/{first_student['id']}/remarks", r.status_code, 200, f"Remarks count: {len(r.json() if r.status_code == 200 else [])}")

    # 21. Reports: Dashboard Summary
    r = requests.get(f"{BASE_URL}/api/v1/reports/dashboard")
    dash = r.json() if r.status_code == 200 else {}
    log_result("Reports: Dashboard", "GET", "/api/v1/reports/dashboard", r.status_code, 200, f"Rate: {dash.get('rate')}, Total Students: {dash.get('totalStudents')}, Defaulters: {dash.get('defaulters')}")

    # 22. Reports: CSV Export
    r = requests.get(f"{BASE_URL}/api/v1/reports/export/csv?dept=CS")
    log_result("Reports: CSV Export", "GET", "/api/v1/reports/export/csv?dept=CS", r.status_code, 200, f"CSV Bytes: {len(r.text)} bytes")

    # 23. Calendar: Events
    r = requests.get(f"{BASE_URL}/api/v1/calendar/events")
    log_result("Calendar: Events List", "GET", "/api/v1/calendar/events", r.status_code, 200, f"Events: {len(r.json() if r.status_code == 200 else [])}")

    # 24. Settings: Get Settings
    r = requests.get(f"{BASE_URL}/api/v1/settings/")
    settings_data = r.json() if r.status_code == 200 else {}
    log_result("Settings: Get Settings", "GET", "/api/v1/settings/", r.status_code, 200, f"College: {settings_data.get('college')}, Min %: {settings_data.get('minPct')}%")

    # 25. Settings: Update Settings
    r = requests.put(f"{BASE_URL}/api/v1/settings/", json={
        "college": "SSIPMT Raipur",
        "minPct": 75,
        "lateAfter": 5,
        "dupePrev": True,
        "autoStart": False,
        "lowAlert": True
    })
    log_result("Settings: Update Settings", "PUT", "/api/v1/settings/", r.status_code, 200, "Successfully saved settings")

    # Summary
    total = len(results)
    passed = sum(1 for x in results if x["passed"])
    failed = total - passed

    print("\n" + "=" * 70)
    print(f"TEST RESULTS SUMMARY: {passed}/{total} Passed ({(passed/total)*100:.1f}%)")
    if failed == 0:
        print("🎉 ALL TESTED ENDPOINTS PASSED SUCCESSFULLY! 🚀")
    else:
        print(f"⚠️ {failed} test(s) failed.")
    print("=" * 70)

if __name__ == "__main__":
    run_tests()

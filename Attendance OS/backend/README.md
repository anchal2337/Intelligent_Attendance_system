# AttendOS - FastAPI Backend

Modern, high-performance RESTful API powering the AttendOS attendance management system.

## 🚀 Quick Start

### 1. Prerequisites
- Python 3.10+ installed
- Virtual environment in `backend/.venv`

### 2. Activate Virtual Environment
**Windows (PowerShell):**
```powershell
.\.venv\Scripts\Activate.ps1
```

**macOS/Linux:**
```bash
source .venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Run Development Server
```bash
python run.py
```
Or with uvicorn directly:
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The server will automatically:
- Create the database tables (`attend_os.db` by default)
- Seed master data (6 departments, 6 teachers, 600 students, timetable schedule, sample attendance)
- Serve the API at `http://localhost:8000`
- Open interactive API documentation at:
  - **Swagger UI**: `http://localhost:8000/api/v1/docs`
  - **ReDoc**: `http://localhost:8000/api/v1/redoc`

---

## 🗄️ Database Configuration

By default, the backend operates on SQLite (`sqlite:///./attend_os.db`) for instant zero-config setup.

To connect to a **PostgreSQL** database:
Set the `DATABASE_URL` environment variable:
```bash
export DATABASE_URL="postgresql+psycopg2://username:password@localhost:5432/attend_os"
```
Or in a `.env` file in the `backend/` directory:
```env
DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5432/attend_os
SECRET_KEY=your-secure-jwt-secret-key
```

---

## 🔑 Default Credentials

- **Admin Portal**:
  - Username: `admin`
  - Password: `admin`
- **Teacher Portal**:
  - `T001` (Dr. Ramesh Iyer - CS): `cs123`
  - `T002` (Prof. Sunita Das - IT): `it123`
  - `T003` (Dr. Ajay Tiwari - Mech): `mech123`
  - `T004` (Ms. Rekha Nair - Civil): `civil123`
  - `T005` (Dr. Meena Pillai - EEE): `eee123`
  - `T006` (Mr. Vishal Bose - ECE): `ece123`

---

## 📂 Architecture Overview

```
backend/
├── app/
│   ├── core/           # Config, DB connection, JWT & security helpers
│   ├── models/         # SQLAlchemy ORM database models
│   ├── schemas/        # Pydantic request/response validation schemas
│   ├── routers/        # REST API route handlers
│   │   ├── auth.py
│   │   ├── departments.py
│   │   ├── students.py
│   │   ├── gate_attendance.py
│   │   ├── lectures.py
│   │   ├── lecture_attendance.py
│   │   ├── remarks.py
│   │   ├── reports.py
│   │   ├── calendar.py
│   │   └── settings.py
│   ├── services/       # Database seeder & calculation services
│   └── main.py         # App factory, CORS & router mounting
├── test_api.py         # Automated integration tests
├── requirements.txt    # Frozen Python dependencies
├── run.py              # Server execution script
└── README.md
```

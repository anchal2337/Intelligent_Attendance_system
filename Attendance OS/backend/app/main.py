from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine, Base, SessionLocal
from app.services.seeder import seed_database

# Routers
from app.routers import (
    auth,
    departments,
    students,
    gate_attendance,
    lectures,
    lecture_attendance,
    remarks,
    reports,
    calendar,
    settings as settings_router
)

def init_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()

# Ensure tables exist immediately
init_db()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure tables and seed data exist
    init_db()
    yield
    # Shutdown

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount all API Routers under /api/v1
api_v1 = settings.API_V1_STR
app.include_router(auth.router, prefix=api_v1)
app.include_router(departments.router, prefix=api_v1)
app.include_router(students.router, prefix=api_v1)
app.include_router(gate_attendance.router, prefix=api_v1)
app.include_router(lectures.router, prefix=api_v1)
app.include_router(lecture_attendance.router, prefix=api_v1)
app.include_router(remarks.router, prefix=api_v1)
app.include_router(reports.router, prefix=api_v1)
app.include_router(calendar.router, prefix=api_v1)
app.include_router(settings_router.router, prefix=api_v1)

@app.get("/")
def root():
    return {
        "app": settings.PROJECT_NAME,
        "version": "1.0.0",
        "docs": f"{settings.API_V1_STR}/docs",
        "status": "online"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}

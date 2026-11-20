from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

connect_args = {}
url = settings.SQLALCHEMY_DATABASE_URL

if url.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_engine(
    url,
    connect_args=connect_args,
    pool_pre_ping=True,  # Ensures disconnected connections to Supabase are automatically recycled
    echo=False
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "AttendOS Backend"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "attend-os-super-secret-jwt-key-2026"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Supabase PostgreSQL Cloud Database URL
    DATABASE_URL: str = "postgresql://postgres.dkhjutzdsnywnuwjatox:tB%2Bs%26mUQ_98-%26E4@aws-0-eu-west-1.pooler.supabase.com:5432/postgres"
    
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://localhost:4173",
        "*"
    ]

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env", "backend/.env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @property
    def SQLALCHEMY_DATABASE_URL(self) -> str:
        url = self.DATABASE_URL
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+psycopg2://", 1)
        elif url.startswith("postgresql://") and not url.startswith("postgresql+"):
            url = url.replace("postgresql://", "postgresql+psycopg2://", 1)
        return url

settings = Settings()

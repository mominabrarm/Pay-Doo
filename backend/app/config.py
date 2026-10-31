from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "Brightloop Subscription Management System"
    API_V1_PREFIX: str = "/api"
    DATABASE_URL: str = "postgresql://brightloop:brightloop_password@localhost:5432/brightloop_db"
    DEBUG: bool = False
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:4173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:4173",
        "http://127.0.0.1:3000",
    ]

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()

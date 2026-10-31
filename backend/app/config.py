from typing import List, Optional
from pydantic import field_validator
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
    JWT_SECRET_KEY: str = "brightloop-secret-key-odoo-hackathon-2026-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # Notification Services: Resend Email
    RESEND_API_KEY: Optional[str] = None
    RESEND_FROM: str = "Brightloop Billing <billing@paydoo.internal>"

    # Notification Services: Twilio WhatsApp
    TWILIO_ACCOUNT_SID: Optional[str] = None
    TWILIO_AUTH_TOKEN: Optional[str] = None
    TWILIO_WHATSAPP_FROM: str = "whatsapp:+14155238886"

    # URLs for download links and customer portal redirection
    APP_BASE_URL: str = "http://localhost:8000"
    FRONTEND_BASE_URL: str = "http://localhost:5173"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, value):
        if isinstance(value, str):
            if value.startswith("["):
                try:
                    import json
                    return json.loads(value)
                except Exception:
                    pass
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value


settings = Settings()

